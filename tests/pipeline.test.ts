import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testDb } from "./db";
import { advanceStatus, callNext, InvalidTransitionError } from "@/lib/services/pipeline";

const { prisma, cleanup } = testDb();
const DATE = "2026-09-07";
let centreId: number;
let slotId: number;
const farmerOf = new Map<number, number>(); // token → farmerId
const bookingOf = new Map<number, number>(); // token → bookingId

async function makeBooking(token: number, status: string) {
  const farmer = await prisma.farmer.create({
    data: { phone: `+9190000000${String(token).padStart(2, "0")}`, name: `F${token}`, village: "V", language: "en" },
  });
  const b = await prisma.booking.create({
    data: {
      farmerId: farmer.id, slotId, centreId, date: DATE, crop: "Wheat",
      quantityQuintals: 10, ratePerQuintal: 2585, amountPayable: 25850, tokenNumber: token, status,
    },
  });
  farmerOf.set(token, farmer.id);
  bookingOf.set(token, b.id);
  return b;
}
const smsCount = (token: number) => prisma.notificationLog.count({ where: { farmerId: farmerOf.get(token)! } });

beforeAll(async () => {
  const centre = await prisma.centre.create({
    data: { name: "P Centre", district: "Rampur", dailyCapacity: 60, avgServiceMinutes: 5, openTime: "09:00", closeTime: "18:00" },
  });
  centreId = centre.id;
  const slot = await prisma.slot.create({
    data: { centreId, date: DATE, windowStart: "09:00", windowEnd: "12:00", capacity: 20, bookedCount: 6 },
  });
  slotId = slot.id;
  for (const t of [1, 2, 3, 4, 5, 6]) await makeBooking(t, "BOOKED");
});
afterAll(cleanup);

describe("advanceStatus", () => {
  it("advances one step and writes exactly one event + one SMS", async () => {
    const before = await smsCount(1);
    const b = await advanceStatus(bookingOf.get(1)!, "SERVING", prisma); // call to counter
    expect(b.status).toBe("SERVING");
    const events = await prisma.bookingEvent.findMany({ where: { bookingId: b.id } });
    expect(events.map((e) => e.status)).toEqual(["SERVING"]);
    // Farmer 1 got exactly one direct SMS for this transition (they're being served,
    // so no three-away can also target them).
    expect(await smsCount(1)).toBe(before + 1);
  });

  it("generates a payment reference at PAYMENT_INITIATED and mentions the amount when PAID", async () => {
    let b = await advanceStatus(bookingOf.get(1)!, undefined, prisma); // WEIGHED
    b = await advanceStatus(b.id, undefined, prisma); // PROCURED
    b = await advanceStatus(b.id, undefined, prisma); // PAYMENT_INITIATED
    expect(b.status).toBe("PAYMENT_INITIATED");
    expect(b.paymentRef).toMatch(/^MSPAY-/);
    b = await advanceStatus(b.id, undefined, prisma); // PAID
    const sms = await prisma.notificationLog.findFirst({
      where: { farmerId: farmerOf.get(1)! },
      orderBy: { id: "desc" },
    });
    expect(sms!.message).toContain("25,850");
    expect(sms!.message).toContain(b.paymentRef!);
  });

  it("rejects an invalid jump", async () => {
    await expect(advanceStatus(bookingOf.get(6)!, "PAID", prisma)).rejects.toThrow(InvalidTransitionError);
  });

  it("NO_SHOW allowed from waiting; CANCELLED only from BOOKED and frees the slot seat", async () => {
    await advanceStatus(bookingOf.get(5)!, "ARRIVED", prisma);
    await advanceStatus(bookingOf.get(5)!, "NO_SHOW", prisma);
    const b5 = await prisma.booking.findUniqueOrThrow({ where: { id: bookingOf.get(5)! } });
    expect(b5.status).toBe("NO_SHOW");

    const beforeSlot = await prisma.slot.findUniqueOrThrow({ where: { id: slotId } });
    await advanceStatus(bookingOf.get(6)!, "CANCELLED", prisma);
    const afterSlot = await prisma.slot.findUniqueOrThrow({ where: { id: slotId } });
    expect(afterSlot.bookedCount).toBe(beforeSlot.bookedCount - 1);

    await expect(advanceStatus(bookingOf.get(5)!, "CANCELLED", prisma)).rejects.toThrow(InvalidTransitionError);
  });
});

describe("three-tokens-away", () => {
  it("fires once per booking when position ≤ 3, never again", async () => {
    // Fresh sub-world on another date to control positions precisely.
    const slot2 = await prisma.slot.create({
      data: { centreId, date: "2026-09-08", windowStart: "09:00", windowEnd: "12:00", capacity: 20 },
    });
    const mk = async (token: number) => {
      const farmer = await prisma.farmer.create({
        data: { phone: `+9191111111${String(token).padStart(2, "0")}`, name: `G${token}`, village: "V", language: "en" },
      });
      const b = await prisma.booking.create({
        data: {
          farmerId: farmer.id, slotId: slot2.id, centreId, date: "2026-09-08", crop: "Wheat",
          quantityQuintals: 10, ratePerQuintal: 2585, amountPayable: 25850, tokenNumber: token, status: "BOOKED",
        },
      });
      return { farmerId: farmer.id, bookingId: b.id };
    };
    const rows = new Map<number, { farmerId: number; bookingId: number }>();
    for (const t of [1, 2, 3, 4, 5, 6]) rows.set(t, await mk(t));
    const count = (t: number) =>
      prisma.notificationLog.count({ where: { farmerId: rows.get(t)!.farmerId, message: { contains: "3 tokens" } } });

    // Token 1 called → waiting queue is 2..6; positions: t2=0,t3=1,t4=2,t5=3,t6=4.
    await advanceStatus(rows.get(1)!.bookingId, "SERVING", prisma);
    expect(await count(2)).toBe(1);
    expect(await count(5)).toBe(1);
    expect(await count(6)).toBe(0);

    // Another change at the same centre+date must NOT re-fire for 2..5.
    await advanceStatus(rows.get(1)!.bookingId, "WEIGHED", prisma);
    expect(await count(2)).toBe(1);
    expect(await count(5)).toBe(1);
    // …but token 6 (position now 4 → still >3? tokens 2..6 waiting minus none served…)
    expect(await count(6)).toBe(0);

    // Serve token 2 → token 6's position drops to 3 → fires exactly once.
    await advanceStatus(rows.get(2)!.bookingId, "SERVING", prisma);
    expect(await count(6)).toBe(1);
  });
});
