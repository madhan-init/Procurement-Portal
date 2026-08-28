import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { istToday } from "@/lib/dates";
import { nowServingFor, impactMetrics } from "@/lib/services/queue";

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
  const nowServing = await nowServingFor(centreId, date);
  const { avgWaitMin, measuredServiceMin } = impactMetrics(rows);

  return NextResponse.json({
    date,
    rows,
    summary: {
      total: rows.length,
      waiting,
      nowServing,
      paid: rows.filter((b) => b.status === "PAID").length,
      noShows: rows.filter((b) => b.status === "NO_SHOW").length,
      avgWaitMin,
      measuredServiceMin,
    },
  });
}
