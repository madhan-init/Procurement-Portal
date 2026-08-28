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
import TokenSlip from "@/components/token-slip";
import { IconCalendarPlus, IconClock, IconRupee, IconTrack, IconWheat } from "@/components/icons";

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
    <main className="mx-auto min-h-screen max-w-md p-5 pb-24 text-[18px]">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-lg bg-leaf-600 px-3 py-2 text-white">
          <IconWheat size={18} />
          <span className="text-sm font-bold">{t(lang, "app.brand")}</span>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} />
          <form action="/api/auth/logout" method="post">
            <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500">
              {t(lang, "home.logout")}
            </button>
          </form>
        </div>
      </header>

      <div className="mb-5">
        <p className="text-sm text-gray-500">{t(lang, "home.namaste")}</p>
        <h1 className="text-xl font-bold leading-tight">{farmer.name}</h1>
        <p className="text-sm text-gray-400">{farmer.village}</p>
      </div>

      {booking ? (
        <>
          <Link href={`/bookings/${booking.id}`} className="block">
            <TokenSlip
              heading={
                booking.date === today
                  ? t(lang, "home.your_token_today")
                  : `${t(lang, "home.your_token_on")} · ${booking.date}`
              }
              token={booking.tokenNumber}
              line1={`${booking.centre.name} · ${booking.slot.windowStart}–${booking.slot.windowEnd}`}
              footer={
                queue ? (
                  <span className="flex items-center gap-2">
                    <IconClock size={16} className="shrink-0" />
                    <span>
                      {t(lang, "track.now_serving")} #{queue.nowServing || "—"} · {t(lang, "track.est_wait")} ~
                      {queue.etaMinutes} {t(lang, "track.min")}
                    </span>
                  </span>
                ) : undefined
              }
            />
          </Link>
          <div className="mt-3 flex items-center justify-between gap-2 px-1 text-sm text-gray-500">
            <span className="truncate">
              {booking.crop} · {booking.quantityQuintals} {t(lang, "track.qtl")} · {inr(booking.amountPayable)}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[booking.status as keyof typeof STATUS_BADGE]}`}
            >
              {STATUS_KEY[booking.status] ? t(lang, STATUS_KEY[booking.status]) : booking.status}
            </span>
          </div>
        </>
      ) : (
        <div className="rounded-xl bg-white p-8 text-center ring-1 ring-gray-200/60">
          <div className="text-4xl">🚜</div>
          <p className="mt-3 font-medium text-gray-700">{t(lang, "home.no_booking")}</p>
          <p className="mt-1 text-sm text-gray-400">{t(lang, "home.no_booking_hint")}</p>
        </div>
      )}

      <Link
        href="/book"
        className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-leaf-600 font-semibold text-white shadow-sm hover:bg-leaf-700"
      >
        <IconCalendarPlus size={20} />
        {t(lang, "home.book_slot").replace("＋ ", "")}
      </Link>
      <p className="mt-2 text-center text-sm text-gray-400">{t(lang, "home.pick_hint")}</p>

      <div className={`mt-4 grid grid-cols-2 gap-3 ${booking ? "" : "pointer-events-none opacity-40"}`} aria-disabled={!booking}>
        <Link
          href={booking ? `/bookings/${booking.id}` : "#"}
          tabIndex={booking ? undefined : -1}
          className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-gray-700 ring-1 ring-gray-200/60"
        >
          <IconTrack size={18} className="text-leaf-600" />
          {t(lang, "home.track_status")}
        </Link>
        <Link
          href={booking ? `/bookings/${booking.id}#payment` : "#"}
          tabIndex={booking ? undefined : -1}
          className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-gray-700 ring-1 ring-gray-200/60"
        >
          <IconRupee size={18} className="text-leaf-600" />
          {t(lang, "home.payments")}
        </Link>
      </div>
    </main>
  );
}
