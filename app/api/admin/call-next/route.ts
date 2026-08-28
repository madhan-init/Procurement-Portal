import { NextResponse } from "next/server";
import { callNext, NoWaitingBookingError } from "@/lib/services/pipeline";
import { istToday } from "@/lib/dates";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const centreId = Number(body?.centreId);
  if (!Number.isInteger(centreId)) return NextResponse.json({ error: "centreId required" }, { status: 400 });
  try {
    const booking = await callNext(centreId, istToday());
    return NextResponse.json({ booking });
  } catch (e) {
    if (e instanceof NoWaitingBookingError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
