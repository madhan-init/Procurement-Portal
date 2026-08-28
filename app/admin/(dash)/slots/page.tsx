import { istToday } from "@/lib/dates";
import SlotsEditor from "./slots-editor";

export const dynamic = "force-dynamic";

export default async function SlotsPage({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const centreId = Number((await searchParams).centre ?? 1) || 1;
  const dates = Array.from({ length: 7 }, (_, i) => istToday(i));
  return <SlotsEditor centreId={centreId} dates={dates} />;
}
