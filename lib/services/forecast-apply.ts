import type { PrismaClient } from "@prisma/client";
import { prisma } from "../db";
import { ensureWindows } from "./slots";

/**
 * Split a forecast day's suggested capacity across the date's windows:
 * proportional to existing capacities (equal weights if all zero), integer
 * floors with the remainder going to the largest window — parts sum exactly
 * to the suggestion. No window ever drops below its bookedCount; if honouring
 * that exceeds the suggestion, booked seats win (documented exception).
 */
export async function applySuggestedCapacity(
  centreId: number,
  date: string,
  suggested: number,
  db: PrismaClient = prisma,
) {
  if (!Number.isInteger(suggested) || suggested < 0) throw new Error("Suggested capacity must be a non-negative integer");
  const slots = await ensureWindows(centreId, date, db);

  const weights = slots.map((s) => s.capacity);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const w = totalWeight > 0 ? weights : slots.map(() => 1);
  const wSum = totalWeight > 0 ? totalWeight : slots.length;

  // Proportional floors, remainder to the largest window (earliest wins ties).
  const caps = slots.map((_, i) => Math.floor((suggested * w[i]) / wSum));
  let remainder = suggested - caps.reduce((a, b) => a + b, 0);
  const largest = w.reduce((best, cur, i) => (cur > w[best] ? i : best), 0);
  caps[largest] += remainder;

  // Clamp to bookedCount, then pull the overflow back from windows with slack.
  for (let i = 0; i < caps.length; i++) caps[i] = Math.max(caps[i], slots[i].bookedCount);
  let overflow = caps.reduce((a, b) => a + b, 0) - suggested;
  while (overflow > 0) {
    // take from the window with the most slack above its bookedCount
    let pick = -1;
    for (let i = 0; i < caps.length; i++) {
      const slack = caps[i] - slots[i].bookedCount;
      if (slack > 0 && (pick === -1 || slack > caps[pick] - slots[pick].bookedCount)) pick = i;
    }
    if (pick === -1) break; // nothing left to take — booked seats win
    const slack = caps[pick] - slots[pick].bookedCount;
    const take = Math.min(slack, overflow);
    caps[pick] -= take;
    overflow -= take;
  }

  await db.$transaction(
    slots.map((s, i) => db.slot.update({ where: { id: s.id }, data: { capacity: caps[i] } })),
  );
  return db.slot.findMany({ where: { centreId, date }, orderBy: { windowStart: "asc" } });
}
