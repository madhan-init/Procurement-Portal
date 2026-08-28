import { NextResponse } from "next/server";
import { clearFarmerSession } from "@/lib/session";

export async function POST(req: Request) {
  await clearFarmerSession();
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
