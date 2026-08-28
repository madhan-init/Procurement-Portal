import { NextResponse } from "next/server";
import { getSlotsWithAvailability } from "@/lib/services/booking";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const centreId = Number(url.searchParams.get("centreId"));
  const date = url.searchParams.get("date");
  if (!Number.isInteger(centreId) || !date) {
    return NextResponse.json({ error: "centreId and date are required" }, { status: 400 });
  }
  return NextResponse.json(await getSlotsWithAvailability(centreId, date));
}
