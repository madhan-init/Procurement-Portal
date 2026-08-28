import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testDb } from "./db";
import { getQueueStatus } from "@/lib/services/queue";

const { prisma, cleanup } = testDb();
const DATE = "2026-09-05";
let centreId: number;
let farmerId: number;
const bookingIdByToken = new Map<number, number>();

beforeAll(async () => {
  const centre = await prisma.centre.create({
    data: { name: "Q Centre", district: "Hardoi", dailyCapacity: 45, avgServiceMinutes: 5, openTime: "09:00", closeTime: "18:00" },
  });
  centreId = centre.id;
  const slot = await prisma.slot.create({
    data: { centreId, date: DATE, windowStart: "09:00", windowEnd: "12:00", capacity: 20 },
  });
  const farmer = await prisma.farmer.create({ data: { phone: "+913333333333", name: "Q", village: "V", language: "en" } });
  farmerId = farmer.id;

  // Mixed queue: 1 PAID, 2 WEIGHED, 3 SERVING, 4 ARRIVED, 5 BOOKED, 6 NO_SHOW, 7 BOOKED, 8 CANCELLED
  const rows: Array<[number, string]> = [
    [1, "PAID"], [2, "WEIGHED"], [3, "SERVING"], [4, "ARRIVED"],
    [5, "BOOKED"], [6, "NO_SHOW"], [7, "BOOKED"], [8, "CANCELLED"],
  ];
  for (const [token, status] of rows) {
    const b = await prisma.booking.create({
      data: {
        farmerId, slotId: slot.id, centreId, date: DATE, crop: "Wheat",
        quantityQuintals: 10, ratePerQuintal: 2585, amountPayable: 25850,
        tokenNumber: token, status,
      },
    });
    bookingIdByToken.set(token, b.id);
  }
});
afterAll(cleanup);

describe("getQueueStatus", () => {
  it("position counts only waiting bookings (BOOKED/ARRIVED) with lower tokens", async () => {
    // Token 7: lower waiting tokens are 4 (ARRIVED) and 5 (BOOKED) — not 1,2,3,6,8.
    const q = await getQueueStatus(bookingIdByToken.get(7)!, prisma);
    expect(q.position).toBe(2);
    expect(q.etaMinutes).toBe(10); // 2 × 5 min avg service
  });

  it("nowServing is the SERVING token when one exists", async () => {
    const q = await getQueueStatus(bookingIdByToken.get(7)!, prisma);
    expect(q.nowServing).toBe(3);
  });

  it("falls back to the highest token beyond SERVING when nobody is being served", async () => {
    await prisma.booking.update({ where: { id: bookingIdByToken.get(3)! }, data: { status: "WEIGHED" } });
    const q = await getQueueStatus(bookingIdByToken.get(7)!, prisma);
    expect(q.nowServing).toBe(3); // token 3 is now WEIGHED — highest completed
    await prisma.booking.update({ where: { id: bookingIdByToken.get(3)! }, data: { status: "SERVING" } });
  });

  it("is all zeros on an empty queue", async () => {
    const slot2 = await prisma.slot.create({
      data: { centreId, date: "2026-09-06", windowStart: "09:00", windowEnd: "12:00", capacity: 20 },
    });
    const b = await prisma.booking.create({
      data: {
        farmerId, slotId: slot2.id, centreId, date: "2026-09-06", crop: "Wheat",
        quantityQuintals: 5, ratePerQuintal: 2585, amountPayable: 12925, tokenNumber: 1, status: "BOOKED",
      },
    });
    const q = await getQueueStatus(b.id, prisma);
    expect(q).toMatchObject({ position: 0, nowServing: 0, etaMinutes: 0 });
  });
});
