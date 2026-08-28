import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../db";
import { nextStatus, type BookingStatus } from "../status";
import { messages, statusMessage } from "../messages";
import { notify } from "./notify";

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot move a booking from ${from} to ${to}`);
    this.name = "InvalidTransitionError";
  }
}
export class NoWaitingBookingError extends Error {
  constructor() {
    super("No waiting bookings in this queue");
    this.name = "NoWaitingBookingError";
  }
}

// Legal moves: one step down the pipeline; SERVING may be entered straight from
// BOOKED (called before self-reporting arrival); NO_SHOW from waiting; CANCELLED
// (admin-only in v1) from BOOKED.
function assertTransition(from: string, to: string) {
  const ok =
    to === nextStatus(from) ||
    (to === "SERVING" && (from === "BOOKED" || from === "ARRIVED")) ||
    (to === "NO_SHOW" && (from === "BOOKED" || from === "ARRIVED")) ||
    (to === "CANCELLED" && from === "BOOKED");
  if (!ok) throw new InvalidTransitionError(from, to);
}

/**
 * Move a booking to `to` (default: next pipeline step). Appends one
 * BookingEvent, sends one SMS, generates the payment ref at PAYMENT_INITIATED,
 * frees the slot seat on CANCELLED — then re-evaluates "3 tokens away" for the
 * whole centre+date queue.
 */
export async function advanceStatus(bookingId: number, to?: BookingStatus, db: PrismaClient = prisma) {
  const updated = await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { centre: { select: { name: true } } },
    });
    const target = to ?? nextStatus(booking.status);
    if (!target) throw new InvalidTransitionError(booking.status, "(next)");
    assertTransition(booking.status, target);

    const data: Prisma.BookingUncheckedUpdateInput = { status: target };
    if (target === "PAYMENT_INITIATED" && !booking.paymentRef) {
      data.paymentRef = `MSPAY-${booking.date.replaceAll("-", "")}-${booking.centreId}${String(booking.tokenNumber).padStart(3, "0")}`;
    }
    const fresh = await tx.booking.update({ where: { id: bookingId }, data });
    if (target === "CANCELLED") {
      await tx.slot.update({ where: { id: booking.slotId }, data: { bookedCount: { decrement: 1 } } });
    }
    await tx.bookingEvent.create({ data: { bookingId, status: target } });
    await notify(
      booking.farmerId,
      statusMessage(target, {
        token: booking.tokenNumber,
        centre: booking.centre.name,
        amount: fresh.amountPayable,
        ref: fresh.paymentRef,
      }),
      tx,
    );
    return fresh;
  });

  await notifyThreeAway(updated.centreId, updated.date, db);
  return updated;
}

/** "Call next": earliest waiting token at the centre today → SERVING. */
export async function callNext(centreId: number, date: string, db: PrismaClient = prisma) {
  const next = await db.booking.findFirst({
    where: { centreId, date, status: { in: ["BOOKED", "ARRIVED"] } },
    orderBy: { tokenNumber: "asc" },
  });
  if (!next) throw new NoWaitingBookingError();
  return advanceStatus(next.id, "SERVING", db);
}

/**
 * After any status change at a centre+date: every waiting booking whose queue
 * position is ≤ 3 gets the heads-up SMS — once per booking, ever.
 */
export async function notifyThreeAway(centreId: number, date: string, db: PrismaClient = prisma) {
  const waiting = await db.booking.findMany({
    where: { centreId, date, status: { in: ["BOOKED", "ARRIVED"] } },
    include: { centre: { select: { name: true } } },
    orderBy: { tokenNumber: "asc" },
  });
  const tokens = waiting.map((b) => b.tokenNumber);
  for (const b of waiting) {
    if (b.threeAwaySent) continue;
    const position = tokens.filter((t) => t < b.tokenNumber).length;
    if (position <= 3) {
      await db.booking.update({ where: { id: b.id }, data: { threeAwaySent: true } });
      await notify(b.farmerId, messages.threeAway(b.tokenNumber, b.centre.name), db);
    }
  }
}
