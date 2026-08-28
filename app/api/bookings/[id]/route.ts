import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFarmerId } from "@/lib/session";
import { getQueueStatus } from "@/lib/services/queue";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const farmerId = await getFarmerId();
  if (!farmerId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      centre: true,
      slot: true,
      events: { orderBy: { at: "asc" } },
    },
  });
  // Farmers can only read their own bookings.
  if (!booking || booking.farmerId !== farmerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const queue = await getQueueStatus(booking.id);
  return NextResponse.json({ booking, queue });
}
