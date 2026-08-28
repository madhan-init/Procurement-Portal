import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
  const rows = await prisma.notificationLog.findMany({
    orderBy: { id: "desc" },
    take: limit,
    include: { farmer: { select: { name: true, phone: true } } },
  });
  return NextResponse.json({ rows });
}
