import { prisma } from "@/lib/db";
import { istToday } from "@/lib/dates";
import QueueBoard from "./queue-board";

export const dynamic = "force-dynamic";

export default async function AdminQueuePage({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const centreId = Number((await searchParams).centre ?? 1) || 1;
  const centre = await prisma.centre.findUnique({ where: { id: centreId } });
  return <QueueBoard centreId={centreId} centreName={centre?.name ?? "Centre"} avgServiceMinutes={centre?.avgServiceMinutes ?? 5} today={istToday()} />;
}
