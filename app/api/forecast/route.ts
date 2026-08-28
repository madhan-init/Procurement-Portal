import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { istToday } from "@/lib/dates";

const SERVICE = process.env.FORECAST_SERVICE_URL ?? "http://localhost:8000";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const centreId = Number(url.searchParams.get("centreId"));
  const days = Number(url.searchParams.get("days") ?? 7);
  if (!Number.isInteger(centreId)) return NextResponse.json({ error: "centreId required" }, { status: 400 });

  try {
    const [fRes, mRes] = await Promise.all([
      fetch(`${SERVICE}/forecast?centre_id=${centreId}&days=${days}`, { cache: "no-store" }),
      fetch(`${SERVICE}/metrics`, { cache: "no-store" }),
    ]);
    if (!fRes.ok) return NextResponse.json({ error: `Forecast service: ${await fRes.text()}` }, { status: 502 });
    const forecast: { date: string; predicted_arrivals: number; suggested_capacity: number }[] = await fRes.json();
    const metrics = mRes.ok ? await mRes.json() : null;

    // Enrich with live booking/capacity state so the chart can compare.
    // The model predicts from the day after its training data; the dashboard
    // shows the next `days` calendar days from today.
    const dates = forecast.map((f) => f.date);
    const [slotAgg, bookingAgg] = await Promise.all([
      prisma.slot.groupBy({
        by: ["date"],
        where: { centreId, date: { in: dates } },
        _sum: { capacity: true, bookedCount: true },
      }),
      prisma.booking.groupBy({
        by: ["date"],
        where: { centreId, date: { in: dates }, status: { not: "CANCELLED" } },
        _count: { _all: true },
      }),
    ]);
    const capOf = new Map(slotAgg.map((s) => [s.date, s._sum.capacity ?? 0]));
    const bookedOf = new Map(bookingAgg.map((b) => [b.date, b._count._all]));

    return NextResponse.json({
      today: istToday(),
      metrics,
      rows: forecast.map((f) => ({
        ...f,
        booked: bookedOf.get(f.date) ?? 0,
        currentCapacity: capOf.get(f.date) ?? null, // null = windows not published yet
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Forecast service unreachable — start it with `npm run forecast`" },
      { status: 503 },
    );
  }
}
