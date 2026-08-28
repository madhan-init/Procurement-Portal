import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testDb } from "./db";
import { applySuggestedCapacity } from "@/lib/services/forecast-apply";

const { prisma, cleanup } = testDb();
let centreId: number;

async function windowsFor(date: string, caps: [number, number, number], booked: [number, number, number] = [0, 0, 0]) {
  const W = [
    ["09:00", "12:00"],
    ["12:00", "15:00"],
    ["15:00", "18:00"],
  ] as const;
  for (let i = 0; i < 3; i++) {
    await prisma.slot.create({
      data: { centreId, date, windowStart: W[i][0], windowEnd: W[i][1], capacity: caps[i], bookedCount: booked[i] },
    });
  }
}
const capsOf = async (date: string) =>
  (await prisma.slot.findMany({ where: { centreId, date }, orderBy: { windowStart: "asc" } })).map((s) => s.capacity);

beforeAll(async () => {
  const centre = await prisma.centre.create({
    data: { name: "F Centre", district: "Rampur", dailyCapacity: 60, avgServiceMinutes: 5, openTime: "09:00", closeTime: "18:00" },
  });
  centreId = centre.id;
});
afterAll(cleanup);

describe("applySuggestedCapacity", () => {
  it("splits proportionally to existing capacities, remainder to the largest, exact sum", async () => {
    await windowsFor("2026-09-10", [30, 20, 10]);
    await applySuggestedCapacity(centreId, "2026-09-10", 65, prisma);
    const caps = await capsOf("2026-09-10");
    // raw = 32.5 / 21.67 / 10.83 → floors 32/21/10, remainder 2 → largest window
    expect(caps).toEqual([34, 21, 10]);
    expect(caps.reduce((a, b) => a + b, 0)).toBe(65);
  });

  it("splits an equal-capacity day with exact sum", async () => {
    await windowsFor("2026-09-11", [20, 20, 20]);
    await applySuggestedCapacity(centreId, "2026-09-11", 46, prisma);
    const caps = await capsOf("2026-09-11");
    expect(caps.reduce((a, b) => a + b, 0)).toBe(46);
    expect(Math.max(...caps) - Math.min(...caps)).toBeLessThanOrEqual(1);
  });

  it("never sets a window below its bookedCount, stealing from windows with slack", async () => {
    await windowsFor("2026-09-12", [20, 20, 20], [18, 2, 0]);
    await applySuggestedCapacity(centreId, "2026-09-12", 21, prisma);
    const slots = await prisma.slot.findMany({ where: { centreId, date: "2026-09-12" }, orderBy: { windowStart: "asc" } });
    for (const s of slots) expect(s.capacity).toBeGreaterThanOrEqual(s.bookedCount);
    expect(slots.map((s) => s.capacity).reduce((a, b) => a + b, 0)).toBe(21); // clamp satisfiable → sum still exact
  });

  it("when the suggestion is below total booked, capacity floors at booked (documented exception)", async () => {
    await windowsFor("2026-09-13", [20, 20, 20], [5, 4, 0]);
    await applySuggestedCapacity(centreId, "2026-09-13", 3, prisma);
    const slots = await prisma.slot.findMany({ where: { centreId, date: "2026-09-13" }, orderBy: { windowStart: "asc" } });
    expect(slots.map((s) => s.capacity)).toEqual([5, 4, 0]);
  });
});
