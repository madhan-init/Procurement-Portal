import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFarmerId } from "@/lib/session";
import { getQueueStatus } from "@/lib/services/queue";
import { istToday } from "@/lib/dates";
import { STATUS_BADGE, inr } from "@/lib/status-ui";
import { getLang } from "@/lib/lang";
import { t, type I18nKey } from "@/lib/i18n";
import LangToggle from "@/components/lang-toggle";

export const dynamic = "force-dynamic";

// Farmer-facing status label keys (SERVING reads as "being served").
const STATUS_KEY: Record<string, I18nKey> = {
  BOOKED: "track.step_booked",
  ARRIVED: "track.step_arrived",
  SERVING: "track.being_served",
  WEIGHED: "track.step_weighed",
  PROCURED: "track.step_procured",
  PAYMENT_INITIATED: "track.step_pay_init",
  PAID: "track.step_paid",
};

export default async function HomePage() {
  const farmerId = await getFarmerId();
  if (!farmerId) redirect("/login");
  const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } });
  if (!farmer) redirect("/login");
  const lang = await getLang();

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

  const waiting = booking && ["BOOKED", "ARRIVED", "SERVING"].includes(booking.status);
  const queue = waiting ? await getQueueStatus(booking.id) : null;

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{t(lang, "home.namaste")}</p>
          <h1 className="text-xl font-bold">{farmer.name}</h1>
          <p className="text-xs text-gray-400">{farmer.village}</p>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} />
          <form action="/api/auth/logout" method="post">
            <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500">
              {t(lang, "home.logout")}
            </button>
          </form>
        </div>
      </header>

      {booking ? (
        <Link href={`/bookings/${booking.id}`} className="block rounded-2xl bg-green-800 p-5 text-white shadow-lg shadow-green-900/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-green-200">
                {booking.date === today ? t(lang, "home.today") : booking.date} · {booking.slot.windowStart}–{booking.slot.windowEnd}
              </p>
              <p className="mt-1 text-lg font-semibold leading-tight">{booking.centre.name}</p>
              <p className="text-sm text-green-200">{booking.centre.district}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase text-green-200">{t(lang, "home.token")}</p>
              <p className="text-4xl font-black leading-none">#{booking.tokenNumber}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-green-700 pt-3 text-sm">
            <span>
              {booking.crop} · {booking.quantityQuintals} {t(lang, "track.qtl")} · {inr(booking.amountPayable)}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[booking.status as keyof typeof STATUS_BADGE]}`}>
              {STATUS_KEY[booking.status] ? t(lang, STATUS_KEY[booking.status]) : booking.status}
            </span>
          </div>
          {queue && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-green-900/60 px-3 py-2 text-xs">
              <span>
                {t(lang, "track.now_serving")} <b className="text-sm">#{queue.nowServing || "—"}</b>
              </span>
              <span>
                {t(lang, "track.ahead")}: <b className="text-sm">{queue.position}</b>
              </span>
              <span>
                {t(lang, "track.est_wait")} <b className="text-sm">~{queue.etaMinutes} {t(lang, "track.min")}</b>
              </span>
            </div>
          )}
          <p className="mt-3 text-center text-sm font-medium text-green-100">{t(lang, "home.track")}</p>
        </Link>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <div className="text-4xl">🚜</div>
          <p className="mt-3 font-medium text-gray-700">{t(lang, "home.no_booking")}</p>
          <p className="mt-1 text-sm text-gray-400">{t(lang, "home.no_booking_hint")}</p>
        </div>
      )}

      <Link href="/book" className="mt-6 block rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-gray-100">
        <span className="text-lg font-semibold text-green-800">{t(lang, "home.book_slot")}</span>
        <p className="mt-1 text-xs text-gray-400">{t(lang, "home.pick_hint")}</p>
      </Link>
    </main>
  );
}
