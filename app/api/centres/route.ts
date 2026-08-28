import { NextResponse } from "next/server";
import { getCentres } from "@/lib/services/booking";

export async function GET() {
  return NextResponse.json(await getCentres());
}
