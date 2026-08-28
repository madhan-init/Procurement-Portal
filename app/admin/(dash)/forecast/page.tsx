import ForecastBoard from "./forecast-board";

export const dynamic = "force-dynamic";

export default async function ForecastPage({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const centreId = Number((await searchParams).centre ?? 1) || 1;
  return <ForecastBoard centreId={centreId} />;
}
