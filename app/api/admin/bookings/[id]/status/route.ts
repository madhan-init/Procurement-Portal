import { NextResponse } from "next/server";
import { advanceStatus, InvalidTransitionError } from "@/lib/services/pipeline";
import type { BookingStatus } from "@/lib/status";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const to = body?.status ? (String(body.status) as BookingStatus) : undefined;
  try {
    const booking = await advanceStatus(id, to);
    return NextResponse.json({ booking });
  } catch (e) {
    if (e instanceof InvalidTransitionError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
