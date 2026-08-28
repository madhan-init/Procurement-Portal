import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testDb } from "./db";
import { basicFixtures } from "./fixtures";
import { bookSlot, SlotFullError } from "@/lib/services/booking";

const { prisma, cleanup } = testDb();
let fx: Awaited<ReturnType<typeof basicFixtures>>;

beforeAll(async () => {
  fx = await basicFixtures(prisma, { capacity: 3 });
});
afterAll(cleanup);

describe("bookSlot", () => {
  it("books a slot: token #1, MSP-derived amount, BOOKED status", async () => {
    const booking = await bookSlot(
      { farmerId: fx.farmer.id, slotId: fx.slot.id, crop: "Wheat", quantityQuintals: 20 },
      prisma,
    );
    expect(booking.tokenNumber).toBe(1);
    expect(booking.status).toBe("BOOKED");
    expect(booking.amountPayable).toBe(51700); // 20 qtl × ₹2585 (RMS 2026-27 wheat MSP)
    expect(booking.centreId).toBe(fx.centre.id);
    expect(booking.date).toBe("2026-09-01");
  });
});

describe("token sequencing", () => {
  it("assigns sequential tokens within the same centre+date", async () => {
    const b2 = await bookSlot({ farmerId: fx.farmer.id, slotId: fx.slot.id, crop: "Wheat", quantityQuintals: 5 }, prisma);
    expect(b2.tokenNumber).toBe(2);
  });

  it("starts a fresh sequence on another date at the same centre", async () => {
    const other = await prisma.slot.create({
      data: { centreId: fx.centre.id, date: "2026-09-02", windowStart: "09:00", windowEnd: "12:00", capacity: 3 },
    });
    const b = await bookSlot({ farmerId: fx.farmer.id, slotId: other.id, crop: "Wheat", quantityQuintals: 5 }, prisma);
    expect(b.tokenNumber).toBe(1);
  });
});

describe("capacity enforcement", () => {
  it("rejects a booking into a full window", async () => {
    // capacity 3; two bookings exist on this slot — fill it, then overflow.
    await bookSlot({ farmerId: fx.farmer.id, slotId: fx.slot.id, crop: "Wheat", quantityQuintals: 5 }, prisma);
    await expect(
      bookSlot({ farmerId: fx.farmer.id, slotId: fx.slot.id, crop: "Wheat", quantityQuintals: 5 }, prisma),
    ).rejects.toThrow(SlotFullError);
    const slot = await prisma.slot.findUniqueOrThrow({ where: { id: fx.slot.id } });
    expect(slot.bookedCount).toBe(3);
  });
});

describe("observable records", () => {
  it("writes a BOOKED event and a confirmation SMS naming the token", async () => {
    const farmer2 = await prisma.farmer.create({
      data: { phone: "+912222222222", name: "F2", village: "Tanda", language: "hi" },
    });
    const slot = await prisma.slot.create({
      data: { centreId: fx.centre.id, date: "2026-09-03", windowStart: "09:00", windowEnd: "12:00", capacity: 5 },
    });
    const b = await bookSlot({ farmerId: farmer2.id, slotId: slot.id, crop: "Wheat", quantityQuintals: 10 }, prisma);

    const events = await prisma.bookingEvent.findMany({ where: { bookingId: b.id } });
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("BOOKED");

    const sms = await prisma.notificationLog.findMany({ where: { farmerId: farmer2.id } });
    expect(sms).toHaveLength(1);
    expect(sms[0].message).toContain("#1");
    expect(sms[0].message).toContain("2026-09-03");
  });
});

describe("concurrency", () => {
  it("parallel bookings get unique sequential tokens and never oversell", { timeout: 30_000 }, async () => {
    const slot = await prisma.slot.create({
      data: { centreId: fx.centre.id, date: "2026-09-04", windowStart: "09:00", windowEnd: "12:00", capacity: 5 },
    });
    const results = await Promise.allSettled(
      Array.from({ length: 9 }, () =>
        bookSlot({ farmerId: fx.farmer.id, slotId: slot.id, crop: "Wheat", quantityQuintals: 5 }, prisma),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(5);
    expect(failed).toHaveLength(4);
    for (const f of failed) expect((f as PromiseRejectedResult).reason).toBeInstanceOf(SlotFullError);

    const tokens = ok.map((r) => (r as PromiseFulfilledResult<{ tokenNumber: number }>).value.tokenNumber).sort((a, b) => a - b);
    expect(tokens).toEqual([1, 2, 3, 4, 5]);
    const finalSlot = await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(finalSlot.bookedCount).toBe(5);
  });
});
