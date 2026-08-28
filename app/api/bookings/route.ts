import { NextResponse } from "next/server";
import { bookSlot, SlotFullError } from "@/lib/services/booking";
import { getFarmerId } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const farmerId = await getFarmerId();
  if (!farmerId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const slotId = Number(body?.slotId);
  const quantityQuintals = Number(body?.quantityQuintals);
  const crop = String(body?.crop ?? "");
  if (!Number.isInteger(slotId) || !crop || !(quantityQuintals > 0)) {
    return NextResponse.json({ error: "slotId, crop and a positive quantity are required" }, { status: 400 });
  }

  try {
    const booking = await bookSlot({ farmerId, slotId, crop, quantityQuintals });
    const centre = await prisma.centre.findUnique({ where: { id: booking.centreId } });
    const slot = await prisma.slot.findUnique({ where: { id: booking.slotId } });
    return NextResponse.json({ booking, centre, slot }, { status: 201 });
  } catch (e) {
    if (e instanceof SlotFullError) return NextResponse.json({ error: e.message }, { status: 409 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Booking failed" }, { status: 400 });
  }
}
