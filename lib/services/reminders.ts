import type { PrismaClient } from "@prisma/client";
import { prisma } from "../db";
import { istToday } from "../dates";
import { messages } from "../messages";
import { notify } from "./notify";

/** T-1 reminder blast: one SMS per BOOKED booking tomorrow (optionally per centre). */
export async function sendTomorrowReminders(centreId?: number, db: PrismaClient = prisma) {
  const tomorrow = istToday(1);
  const bookings = await db.booking.findMany({
    where: { date: tomorrow, status: "BOOKED", ...(centreId ? { centreId } : {}) },
    include: { centre: { select: { name: true } } },
    orderBy: { tokenNumber: "asc" },
  });
  for (const b of bookings) {
    await notify(b.farmerId, messages.reminder(b.tokenNumber, b.date, b.centre.name), db);
  }
  return bookings.length;
}
