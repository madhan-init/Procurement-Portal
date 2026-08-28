import { NextResponse } from "next/server";
import { setSlotCapacity, ensureWindows, CapacityBelowBookedError } from "@/lib/services/slots";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  try {
    if (body?.slotId != null) {
      const slot = await setSlotCapacity(Number(body.slotId), Number(body.capacity));
      return NextResponse.json({ slot });
    }
    if (body?.centreId != null && body?.date) {
      const slots = await ensureWindows(Number(body.centreId), String(body.date));
      return NextResponse.json({ slots });
    }
    return NextResponse.json({ error: "Provide slotId+capacity or centreId+date" }, { status: 400 });
  } catch (e) {
    if (e instanceof CapacityBelowBookedError) return NextResponse.json({ error: e.message }, { status: 409 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
