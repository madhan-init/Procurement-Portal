import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFarmerId } from "@/lib/session";
import { istToday } from "@/lib/dates";
import { STATUS_LABEL, STATUS_BADGE, inr } from "@/lib/status-ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const farmerId = await getFarmerId();
  if (!farmerId) redirect("/login");
  const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } });
  if (!farmer) redirect("/login");

  const today = istToday();
  const booking = await prisma.booking.findFirst({
    where: {
      farmerId,
      date: { gte: today },
      status: { in: ["BOOKED", "ARRIVED", "SERVING", "WEIGHED", "PROCURED", "PAYMENT_INITIATED"] },
    },
    orderBy: [{ date: "asc" }, { tokenNumber: "asc" }],
    include: { centre: true, slot: true },
  });

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Namaste 🙏</p>
          <h1 className="text-xl font-bold">{farmer.name}</h1>
          <p className="text-xs text-gray-400">{farmer.village}</p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500">Logout</button>
        </form>
      </header>

      {booking ? (
        <Link
          href={`/bookings/${booking.id}`}
          className="block rounded-2xl bg-green-800 p-5 text-white shadow-lg shadow-green-900/20"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-green-200">
                {booking.date === today ? "Today" : booking.date} · {booking.slot.windowStart}–{booking.slot.windowEnd}
              </p>
              <p className="mt-1 text-lg font-semibold leading-tight">{booking.centre.name}</p>
              <p className="text-sm text-green-200">{booking.centre.district}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase text-green-200">Token</p>
              <p className="text-4xl font-black leading-none">#{booking.tokenNumber}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-green-700 pt-3 text-sm">
            <span>
              {booking.crop} · {booking.quantityQuintals} qtl · {inr(booking.amountPayable)}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[booking.status]}`}>
              {STATUS_LABEL[booking.status]}
            </span>
          </div>
          <p className="mt-3 text-center text-sm font-medium text-green-100">Track live queue →</p>
        </Link>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <div className="text-4xl">🚜</div>
          <p className="mt-3 font-medium text-gray-700">No upcoming booking</p>
          <p className="mt-1 text-sm text-gray-400">Book a slot and skip the waiting line at the centre.</p>
        </div>
      )}

      <Link
        href="/book"
        className="mt-6 block rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-gray-100"
      >
        <span className="text-lg font-semibold text-green-800">＋ Book a slot</span>
        <p className="mt-1 text-xs text-gray-400">Pick a centre, date and time window</p>
      </Link>
    </main>
  );
}
