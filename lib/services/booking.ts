import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../db";
import { messages } from "../messages";
import { notify } from "./notify";

export class SlotFullError extends Error {
  constructor() {
    super("This time window is already full");
    this.name = "SlotFullError";
  }
}

export type BookSlotInput = {
  farmerId: number;
  slotId: number;
  crop: string;
  quantityQuintals: number;
};

/**
 * Create a booking atomically: capacity enforced, per-centre-per-date token
 * assigned (unique constraint as race backstop), amount = qty × MSP rate,
 * BOOKED event + confirmation SMS written in the same transaction.
 */
export async function bookSlot(input: BookSlotInput, db: PrismaClient = prisma) {
  if (!(input.quantityQuintals > 0)) throw new Error("Quantity must be positive");

  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const slot = await tx.slot.findUnique({ where: { id: input.slotId }, include: { centre: true } });
        if (!slot) throw new Error("Slot not found");
        if (slot.bookedCount >= slot.capacity) throw new SlotFullError();

        const rate = await tx.cropRate.findUnique({ where: { crop: input.crop } });
        if (!rate) throw new Error("Unknown crop");

        const max = await tx.booking.aggregate({
          where: { centreId: slot.centreId, date: slot.date },
          _max: { tokenNumber: true },
        });
        const tokenNumber = (max._max.tokenNumber ?? 0) + 1;

        const booking = await tx.booking.create({
          data: {
            farmerId: input.farmerId,
            slotId: slot.id,
            centreId: slot.centreId,
            date: slot.date,
            crop: input.crop,
            quantityQuintals: input.quantityQuintals,
            ratePerQuintal: rate.ratePerQuintal,
            amountPayable: input.quantityQuintals * rate.ratePerQuintal,
            tokenNumber,
            status: "BOOKED",
          },
        });
        await tx.slot.update({ where: { id: slot.id }, data: { bookedCount: { increment: 1 } } });
        await tx.bookingEvent.create({ data: { bookingId: booking.id, status: "BOOKED" } });
        await notify(input.farmerId, messages.bookingConfirmed(tokenNumber, slot.date, slot.centre.name), tx);
        return booking;
      }, { maxWait: 10_000, timeout: 15_000 });
    } catch (e) {
      // Retry token-uniqueness races and SQLite write contention a few times.
      const retriable =
        (e instanceof Prisma.PrismaClientKnownRequestError && ["P1008", "P2002", "P2028", "P2034"].includes(e.code)) ||
        (e instanceof Error && /database is locked|busy/i.test(e.message));
      if (retriable && attempt < 12) {
        await new Promise((r) => setTimeout(r, 20 * (attempt + 1) + Math.random() * 30));
        continue;
      }
      throw e;
    }
  }
}

/** All centres. */
export async function getCentres(db: PrismaClient = prisma) {
  return db.centre.findMany({ orderBy: { id: "asc" } });
}

/** Slots for a centre+date with fullness for the picker. */
export async function getSlotsWithAvailability(centreId: number, date: string, db: PrismaClient = prisma) {
  const slots = await db.slot.findMany({
    where: { centreId, date },
    orderBy: { windowStart: "asc" },
  });
  return slots.map((s) => ({
    id: s.id,
    windowStart: s.windowStart,
    windowEnd: s.windowEnd,
    capacity: s.capacity,
    bookedCount: s.bookedCount,
    pctFull: s.capacity === 0 ? 100 : Math.min(100, Math.round((s.bookedCount / s.capacity) * 100)),
    full: s.bookedCount >= s.capacity,
  }));
}
