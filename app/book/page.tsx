import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFarmerId } from "@/lib/session";
import { istToday } from "@/lib/dates";
import BookingFlow from "./booking-flow";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const farmerId = await getFarmerId();
  if (!farmerId) redirect("/login");

  const [centres, crops] = await Promise.all([
    prisma.centre.findMany({ orderBy: { id: "asc" } }),
    prisma.cropRate.findMany({ orderBy: { id: "asc" } }),
  ]);
  const dates = Array.from({ length: 7 }, (_, i) => istToday(i));

  return (
    <BookingFlow
      centres={centres.map((c) => ({ id: c.id, name: c.name, district: c.district }))}
      crops={crops.map((c) => ({ crop: c.crop, ratePerQuintal: c.ratePerQuintal, season: c.season }))}
      dates={dates}
    />
  );
}
