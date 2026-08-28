// Destructive seed, always relative to IST "now". Run via `npm run demo:reset`.
import { PrismaClient, type Centre, type Farmer } from "@prisma/client";
import { istToday, addDays, atIST } from "../lib/dates";
import { STATUS_ORDER, pipelineIndex, type BookingStatus } from "../lib/status";
import { messages, statusMessage } from "../lib/messages";

const prisma = new PrismaClient();

// Deterministic RNG so reseeds are stable (mulberry32).
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(26032);

const WINDOWS = [
  { start: "09:00", end: "12:00" },
  { start: "12:00", end: "15:00" },
  { start: "15:00", end: "18:00" },
] as const;

// CCEA-notified MSP: paddy/maize/bajra = Kharif MS 2026-27, wheat = Rabi MS 2026-27.
const CROP_RATES = [
  { crop: "Paddy (Common)", ratePerQuintal: 2441, season: "KMS 2026-27" },
  { crop: "Paddy (Grade A)", ratePerQuintal: 2461, season: "KMS 2026-27" },
  { crop: "Wheat", ratePerQuintal: 2585, season: "RMS 2026-27" },
  { crop: "Maize", ratePerQuintal: 2410, season: "KMS 2026-27" },
  { crop: "Bajra", ratePerQuintal: 2900, season: "KMS 2026-27" },
];
const CROP_KEYS = CROP_RATES.map((c) => c.crop);
const rateOf = (crop: string) => CROP_RATES.find((c) => c.crop === crop)!.ratePerQuintal;

const FIRST = ["Suresh","Mahesh","Dinesh","Rakesh","Mukesh","Santosh","Virendra","Shyam","Hari","Naresh","Deepak","Anil","Sunil","Vinod","Ashok","Raju","Ram","Lakhan","Jagdish","Satish"];
const LAST = ["Yadav","Singh","Verma","Sharma","Pal","Gupta","Maurya","Tiwari","Mishra","Prasad"];
const VILLAGES = ["Rampur","Suar","Tanda","Milak","Bilaspur","Shahabad","Sandila","Katra","Pihani","Jalalabad"];

type SeedRow = { token: number; status: BookingStatus; farmerIdx?: number };

async function main() {
  const today = istToday();
  console.log(`Seeding relative to IST today = ${today}`);

  // ---- Centres (Uttar Pradesh — real procurement districts) ----
  const centreData = [
    { name: "Rampur Mandi Samiti Centre", district: "Rampur", dailyCapacity: 60, avgServiceMinutes: 5, openTime: "09:00", closeTime: "18:00" },
    { name: "Shahjahanpur Krishi Mandi Centre", district: "Shahjahanpur", dailyCapacity: 90, avgServiceMinutes: 4, openTime: "09:00", closeTime: "18:00" },
    { name: "Hardoi Procurement Centre", district: "Hardoi", dailyCapacity: 45, avgServiceMinutes: 6, openTime: "09:00", closeTime: "18:00" },
  ];
  const centres: Centre[] = [];
  for (const c of centreData) centres.push(await prisma.centre.create({ data: c }));

  await prisma.cropRate.createMany({ data: CROP_RATES });

  // ---- Farmers: protagonist + 39 more ----
  const ramesh = await prisma.farmer.create({
    data: { phone: "+919876500001", name: "Ramesh Kumar", village: "Rampur", language: "hi" },
  });
  const others: Farmer[] = [];
  for (let i = 0; i < 39; i++) {
    others.push(
      await prisma.farmer.create({
        data: {
          phone: `+91987650${String(2 + i).padStart(4, "0")}`,
          name: `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`,
          village: VILLAGES[i % VILLAGES.length],
          language: i % 3 === 0 ? "en" : "hi",
        },
      }),
    );
  }
  const farmerAt = (idx: number) => (idx === 0 ? ramesh : others[(idx - 1) % others.length]);

  // ---- Slots: each centre, today ± 3 days, 3 windows ----
  const slotId = new Map<string, number>();
  for (const centre of centres) {
    const perWindow = Math.round(centre.dailyCapacity / 3);
    for (let off = -3; off <= 3; off++) {
      const date = addDays(today, off);
      for (const w of WINDOWS) {
        const slot = await prisma.slot.create({
          data: { centreId: centre.id, date, windowStart: w.start, windowEnd: w.end, capacity: perWindow, bookedCount: 0 },
        });
        slotId.set(`${centre.id}|${date}|${w.start}`, slot.id);
      }
    }
  }

  // ---- Booking factory: booking + event chain + notification trail ----
  async function seedBooking(centreIdx: number, date: string, row: SeedRow) {
    const centre = centres[centreIdx];
    const windowIdx = row.token <= 12 ? 0 : row.token <= 20 ? 1 : 2;
    const w = WINDOWS[windowIdx];
    const sid = slotId.get(`${centre.id}|${date}|${w.start}`)!;
    const farmer = farmerAt(row.farmerIdx ?? row.token * 7 + centreIdx);
    const crop = row.farmerIdx === 0 ? "Paddy (Common)" : CROP_KEYS[row.token % CROP_KEYS.length];
    const qty = row.farmerIdx === 0 ? 20 : 5 + Math.round(rand() * 35);
    const rate = rateOf(crop);
    const reachedIdx = pipelineIndex(row.status); // -1 for NO_SHOW/CANCELLED
    const needsRef = reachedIdx >= pipelineIndex("PAYMENT_INITIATED");
    const ref = needsRef ? `MSPAY-${date.replaceAll("-", "")}-${centre.id}${String(row.token).padStart(3, "0")}` : null;
    const createdAt = atIST(addDays(date, -1), `18:${String(10 + (row.token % 45)).padStart(2, "0")}`);

    const booking = await prisma.booking.create({
      data: {
        farmerId: farmer.id, slotId: sid, centreId: centre.id, date,
        crop, quantityQuintals: qty, ratePerQuintal: rate, amountPayable: qty * rate,
        paymentRef: ref, tokenNumber: row.token, status: row.status, createdAt,
      },
    });

    // Event chain with realistic monotonic timestamps.
    const events: { status: BookingStatus; at: Date }[] = [{ status: "BOOKED", at: createdAt }];
    if (row.status === "CANCELLED") {
      events.push({ status: "CANCELLED", at: new Date(createdAt.getTime() + 2 * 3_600_000) });
    } else if (row.status === "NO_SHOW") {
      events.push({ status: "NO_SHOW", at: atIST(date, w.end) });
    } else if (reachedIdx >= 1) {
      let t = atIST(date, w.start).getTime() + (row.token % 12) * 6 * 60_000;
      events.push({ status: "ARRIVED", at: new Date(t) });
      for (let i = 2; i <= reachedIdx; i++) {
        t += (centre.avgServiceMinutes + rand() * 6) * 60_000;
        events.push({ status: STATUS_ORDER[i], at: new Date(t) });
      }
    }
    for (const e of events) {
      await prisma.bookingEvent.create({ data: { bookingId: booking.id, status: e.status, at: e.at } });
    }

    // Notification trail: confirmation for everyone…
    await prisma.notificationLog.create({
      data: { farmerId: farmer.id, message: messages.bookingConfirmed(row.token, date, centre.name), sentAt: createdAt },
    });
    // …plus per-status SMS for today's demo centre so the log looks alive.
    if (date === today && centreIdx === 0) {
      for (const e of events) {
        if (e.status === "BOOKED") continue;
        await prisma.notificationLog.create({
          data: {
            farmerId: farmer.id,
            message: statusMessage(e.status, { token: row.token, centre: centre.name, amount: qty * rate, ref }),
            sentAt: e.at,
          },
        });
      }
    }
    return booking;
  }

  // ---- Today @ Rampur (demo centre): 25 tokens across every status ----
  const c1: SeedRow[] = [
    ...[1, 2, 3, 4, 5, 6, 7].map((t) => ({ token: t, status: "PAID" as const })),
    { token: 8, status: "PAYMENT_INITIATED" },
    { token: 9, status: "PROCURED" },
    { token: 10, status: "WEIGHED" },
    { token: 11, status: "SERVING" },
    { token: 12, status: "ARRIVED" },
    { token: 13, status: "NO_SHOW" },
    { token: 14, status: "ARRIVED" },
    { token: 15, status: "BOOKED" },
    { token: 16, status: "ARRIVED" },
    { token: 17, status: "NO_SHOW" },
    { token: 18, status: "BOOKED", farmerIdx: 0 }, // Ramesh — position 4, ETA 20 min
    { token: 19, status: "BOOKED" },
    { token: 20, status: "CANCELLED" },
    ...[21, 22, 23, 24, 25].map((t) => ({ token: t, status: "BOOKED" as const })),
  ];
  for (const row of c1) await seedBooking(0, today, row);

  // ---- Today @ other centres ----
  const c2: SeedRow[] = [
    { token: 1, status: "PAID" }, { token: 2, status: "PROCURED" }, { token: 3, status: "WEIGHED" },
    { token: 4, status: "SERVING" }, { token: 5, status: "ARRIVED" }, { token: 6, status: "ARRIVED" },
    { token: 7, status: "BOOKED" }, { token: 8, status: "BOOKED" },
  ];
  for (const row of c2) await seedBooking(1, today, row);
  const c3: SeedRow[] = [
    { token: 1, status: "PAID" }, { token: 2, status: "WEIGHED" }, { token: 3, status: "SERVING" },
    { token: 4, status: "BOOKED" }, { token: 5, status: "BOOKED" },
  ];
  for (const row of c3) await seedBooking(2, today, row);

  // ---- Tomorrow: BOOKED rows for the T-1 reminder demo ----
  const tomorrow = addDays(today, 1);
  for (let t = 1; t <= 6; t++) await seedBooking(0, tomorrow, { token: t, status: "BOOKED", farmerIdx: t + 1 });
  for (let t = 1; t <= 3; t++) await seedBooking(1, tomorrow, { token: t, status: "BOOKED" });

  // ---- Past days: completed bookings for history depth ----
  for (let off = -3; off <= -1; off++) {
    const d = addDays(today, off);
    for (let t = 1; t <= 3 - off; t++) {
      await seedBooking((t + off + 10) % 3, d, { token: t, status: "PAID" });
    }
  }

  // ---- Slot bookedCount = live bookings per slot (CANCELLED excluded) ----
  const slots = await prisma.slot.findMany({ select: { id: true } });
  for (const s of slots) {
    const n = await prisma.booking.count({ where: { slotId: s.id, status: { not: "CANCELLED" } } });
    if (n > 0) await prisma.slot.update({ where: { id: s.id }, data: { bookedCount: n } });
  }

  // ---- Summary ----
  const counts = {
    centres: await prisma.centre.count(),
    farmers: await prisma.farmer.count(),
    slots: await prisma.slot.count(),
    bookings: await prisma.booking.count(),
    events: await prisma.bookingEvent.count(),
    notifications: await prisma.notificationLog.count(),
  };
  console.log("Seeded:", counts);
  console.log(`Demo login — farmer: +919876500001 (OTP 123456) · admin: admin/admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
