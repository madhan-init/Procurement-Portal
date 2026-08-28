import { NextResponse } from "next/server";
import { applySuggestedCapacity } from "@/lib/services/forecast-apply";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const centreId = Number(body?.centreId);
  const suggested = Number(body?.suggested);
  const date = String(body?.date ?? "");
  if (!Number.isInteger(centreId) || !Number.isInteger(suggested) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "centreId, date and integer suggested are required" }, { status: 400 });
  }
  const slots = await applySuggestedCapacity(centreId, date, suggested);
  return NextResponse.json({ slots });
}
