import { NextResponse } from "next/server";
import { setAdminSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body?.username === "admin" && body?.password === "admin123") {
    await setAdminSession();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
