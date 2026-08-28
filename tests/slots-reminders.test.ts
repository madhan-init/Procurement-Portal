import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testDb } from "./db";
import { setSlotCapacity, CapacityBelowBookedError } from "@/lib/services/slots";
import { sendTomorrowReminders } from "@/lib/services/reminders";
import { istToday } from "@/lib/dates";

const { prisma, cleanup } = testDb();
let centreId: number;
let slotId: number;

beforeAll(async () => {
  const centre = await prisma.centre.create({
    data: { name: "S Centre", district: "Rampur", dailyCapacity: 60, avgServiceMinutes: 5, openTime: "09:00", closeTime: "18:00" },
  });
  centreId = centre.id;
  const slot = await prisma.slot.create({
    data: { centreId, date: "2026-09-09", windowStart: "09:00", windowEnd: "12:00", capacity: 20, bookedCount: 8 },
  });
  slotId = slot.id;
});
afterAll(cleanup);

describe("setSlotCapacity", () => {
  it("updates capacity", async () => {
    const s = await setSlotCapacity(slotId, 25, prisma);
    expect(s.capacity).toBe(25);
  });

  it("rejects capacity below the current bookedCount", async () => {
    await expect(setSlotCapacity(slotId, 7, prisma)).rejects.toThrow(CapacityBelowBookedError);
    const s = await prisma.slot.findUniqueOrThrow({ where: { id: slotId } });
    expect(s.capacity).toBe(25); // unchanged
  });
});

describe("sendTomorrowReminders", () => {
  it("sends exactly one SMS per BOOKED booking tomorrow at the centre", async () => {
    const tomorrow = istToday(1);
    const slotT = await prisma.slot.create({
      data: { centreId, date: tomorrow, windowStart: "09:00", windowEnd: "12:00", capacity: 20 },
    });
    const mk = async (token: number, status: string) => {
      const farmer = await prisma.farmer.create({
        data: { phone: `+9192222222${String(token).padStart(2, "0")}`, name: `R${token}`, village: "V", language: "en" },
      });
      await prisma.booking.create({
        data: {
          farmerId: farmer.id, slotId: slotT.id, centreId, date: tomorrow, crop: "Wheat",
          quantityQuintals: 5, ratePerQuintal: 2585, amountPayable: 12925, tokenNumber: token, status,
        },
      });
      return farmer.id;
    };
    const f1 = await mk(1, "BOOKED");
    const f2 = await mk(2, "BOOKED");
    const f3 = await mk(3, "CANCELLED"); // must NOT be reminded

    const sent = await sendTomorrowReminders(centreId, prisma);
    expect(sent).toBe(2);
    expect(await prisma.notificationLog.count({ where: { farmerId: f1, message: { contains: "tomorrow" } } })).toBe(1);
    expect(await prisma.notificationLog.count({ where: { farmerId: f2, message: { contains: "tomorrow" } } })).toBe(1);
    expect(await prisma.notificationLog.count({ where: { farmerId: f3 } })).toBe(0);
  });
});
