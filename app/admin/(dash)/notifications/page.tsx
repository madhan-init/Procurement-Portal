import NotificationsBoard from "./notifications-board";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const centreId = Number((await searchParams).centre ?? 1) || 1;
  return <NotificationsBoard centreId={centreId} />;
}
