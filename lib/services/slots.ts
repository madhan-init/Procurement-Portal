import type { PrismaClient } from "@prisma/client";
import { prisma } from "../db";

export class CapacityBelowBookedError extends Error {
  constructor(booked: number) {
    super(`Capacity cannot be below the ${booked} bookings already taken`);
    this.name = "CapacityBelowBookedError";
  }
}

/** Set a window's capacity — never below what's already booked. */
export async function setSlotCapacity(slotId: number, capacity: number, db: PrismaClient = prisma) {
  if (!Number.isInteger(capacity) || capacity < 0) throw new Error("Capacity must be a non-negative integer");
  const slot = await db.slot.findUniqueOrThrow({ where: { id: slotId } });
  if (capacity < slot.bookedCount) throw new CapacityBelowBookedError(slot.bookedCount);
  return db.slot.update({ where: { id: slotId }, data: { capacity } });
}

/** Ensure the three standard windows exist for a centre+date (used by the slots editor). */
export async function ensureWindows(centreId: number, date: string, db: PrismaClient = prisma) {
  const centre = await db.centre.findUniqueOrThrow({ where: { id: centreId } });
  const perWindow = Math.round(centre.dailyCapacity / 3);
  const WINDOWS = [
    { start: "09:00", end: "12:00" },
    { start: "12:00", end: "15:00" },
    { start: "15:00", end: "18:00" },
  ];
  for (const w of WINDOWS) {
    await db.slot.upsert({
      where: { centreId_date_windowStart: { centreId, date, windowStart: w.start } },
      update: {},
      create: { centreId, date, windowStart: w.start, windowEnd: w.end, capacity: perWindow },
    });
  }
  return db.slot.findMany({ where: { centreId, date }, orderBy: { windowStart: "asc" } });
}
