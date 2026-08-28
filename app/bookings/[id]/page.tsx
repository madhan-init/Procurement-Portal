import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFarmerId } from "@/lib/session";
import { getQueueStatus } from "@/lib/services/queue";
import Tracker from "./tracker";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const farmerId = await getFarmerId();
  if (!farmerId) redirect("/login");

  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { centre: true, slot: true, events: { orderBy: { at: "asc" } } },
  });
  if (!booking || booking.farmerId !== farmerId) notFound();

  const queue = await getQueueStatus(booking.id);
  return <Tracker initial={JSON.parse(JSON.stringify({ booking, queue }))} />;
}
