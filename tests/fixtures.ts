import type { PrismaClient } from "@prisma/client";

/** Minimal world: one centre, one slot (capacity 3), one farmer, wheat rate. */
export async function basicFixtures(prisma: PrismaClient, opts: { capacity?: number } = {}) {
  const centre = await prisma.centre.create({
    data: { name: "Test Centre", district: "Rampur", dailyCapacity: 60, avgServiceMinutes: 5, openTime: "09:00", closeTime: "18:00" },
  });
  const slot = await prisma.slot.create({
    data: { centreId: centre.id, date: "2026-09-01", windowStart: "09:00", windowEnd: "12:00", capacity: opts.capacity ?? 3, bookedCount: 0 },
  });
  await prisma.cropRate.create({ data: { crop: "Wheat", ratePerQuintal: 2585, season: "RMS 2026-27" } });
  const farmer = await prisma.farmer.create({
    data: { phone: "+911111111111", name: "Test Farmer", village: "Suar", language: "en" },
  });
  return { centre, slot, farmer };
}
