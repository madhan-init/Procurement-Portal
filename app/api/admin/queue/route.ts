import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { istToday } from "@/lib/dates";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const centreId = Number(url.searchParams.get("centreId"));
  if (!Number.isInteger(centreId)) return NextResponse.json({ error: "centreId required" }, { status: 400 });
  const date = url.searchParams.get("date") ?? istToday();

  const rows = await prisma.booking.findMany({
    where: { centreId, date },
    orderBy: { tokenNumber: "asc" },
    include: {
      farmer: { select: { name: true, phone: true, village: true } },
      slot: { select: { windowStart: true, windowEnd: true } },
      events: { select: { status: true, at: true } },
    },
  });
  const waiting = rows.filter((b) => b.status === "BOOKED" || b.status === "ARRIVED").length;
  const servingRow = [...rows].reverse().find((b) => b.status === "SERVING");
  const completed = rows.filter((b) => ["WEIGHED", "PROCURED", "PAYMENT_INITIATED", "PAID"].includes(b.status));
  const nowServing = servingRow?.tokenNumber ?? (completed.length ? Math.max(...completed.map((b) => b.tokenNumber)) : 0);

  // Impact metrics from real event timestamps (PS: "reduces waiting time").
  const waits: number[] = [];
  const services: number[] = [];
  for (const b of rows) {
    const at = (st: string) => b.events.find((e) => e.status === st)?.at;
    const arrived = at("ARRIVED");
    const serving = at("SERVING");
    const weighed = at("WEIGHED");
    if (arrived && serving) waits.push((+new Date(serving) - +new Date(arrived)) / 60_000);
    if (serving && weighed) services.push((+new Date(weighed) - +new Date(serving)) / 60_000);
  }
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

  return NextResponse.json({
    date,
    rows,
    summary: {
      total: rows.length,
      waiting,
      nowServing,
      paid: rows.filter((b) => b.status === "PAID").length,
      noShows: rows.filter((b) => b.status === "NO_SHOW").length,
      avgWaitMin: avg(waits),
      measuredServiceMin: avg(services),
    },
  });
}
