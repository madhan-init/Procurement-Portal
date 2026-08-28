import { NextResponse } from "next/server";
import { sendTomorrowReminders } from "@/lib/services/reminders";
import { istToday } from "@/lib/dates";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const centreId = body?.centreId != null ? Number(body.centreId) : undefined;
  const sent = await sendTomorrowReminders(centreId);
  return NextResponse.json({ sent, date: istToday(1) });
}
