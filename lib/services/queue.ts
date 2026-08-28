import type { PrismaClient } from "@prisma/client";
import { prisma } from "../db";

export type QueueStatus = { position: number; nowServing: number; etaMinutes: number };

/**
 * Queue math, exactly as specified:
 *  - position    = waiting bookings (BOOKED/ARRIVED) at same centre+date with a lower token
 *  - nowServing  = the SERVING token; else highest token already past the counter; else 0
 *  - etaMinutes  = position × centre.avgServiceMinutes
 */
export async function getQueueStatus(bookingId: number, db: PrismaClient = prisma): Promise<QueueStatus> {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { centre: { select: { avgServiceMinutes: true } } },
  });
  return queueStatusFor(booking.centreId, booking.date, booking.tokenNumber, booking.centre.avgServiceMinutes, db);
}

export async function queueStatusFor(
  centreId: number,
  date: string,
  tokenNumber: number,
  avgServiceMinutes: number,
  db: PrismaClient = prisma,
): Promise<QueueStatus> {
  const [position, serving, completed] = await Promise.all([
    db.booking.count({
      where: { centreId, date, status: { in: ["BOOKED", "ARRIVED"] }, tokenNumber: { lt: tokenNumber } },
    }),
    db.booking.aggregate({
      where: { centreId, date, status: "SERVING" },
      _max: { tokenNumber: true },
    }),
    db.booking.aggregate({
      where: { centreId, date, status: { in: ["WEIGHED", "PROCURED", "PAYMENT_INITIATED", "PAID"] } },
      _max: { tokenNumber: true },
    }),
  ]);
  const nowServing = serving._max.tokenNumber ?? completed._max.tokenNumber ?? 0;
  return { position, nowServing, etaMinutes: position * avgServiceMinutes };
}

/** The queue-wide "now serving" figure — same rule the tracker uses. */
export async function nowServingFor(centreId: number, date: string, db: PrismaClient = prisma): Promise<number> {
  const [serving, completed] = await Promise.all([
    db.booking.aggregate({ where: { centreId, date, status: "SERVING" }, _max: { tokenNumber: true } }),
    db.booking.aggregate({
      where: { centreId, date, status: { in: ["WEIGHED", "PROCURED", "PAYMENT_INITIATED", "PAID"] } },
      _max: { tokenNumber: true },
    }),
  ]);
  return serving._max.tokenNumber ?? completed._max.tokenNumber ?? 0;
}

/** Measured congestion metrics from real event timestamps (PS bullet 5). */
export function impactMetrics(rows: { events: { status: string; at: Date | string }[] }[]) {
  const waits: number[] = [];
  const services: number[] = [];
  for (const b of rows) {
    const at = (st: string) => b.events.find((e) => e.status === st)?.at;
    const arrived = at("ARRIVED");
    const serving = at("SERVING");
    const weighed = at("WEIGHED");
    if (arrived && serving) waits.push((+new Date(serving) - +new Date(arrived)) / 60_000);
    if (serving && weighed) services.push((+new Date(weighed) - +new Date(serving)) / 60_000);
  }
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  return { avgWaitMin: avg(waits), measuredServiceMin: avg(services) };
}
