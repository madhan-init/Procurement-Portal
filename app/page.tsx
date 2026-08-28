import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFarmerId } from "@/lib/session";
import { getQueueStatus } from "@/lib/services/queue";
import { istToday } from "@/lib/dates";
import { inr } from "@/lib/status-ui";
import { getLang } from "@/lib/lang";
import { t, type I18nKey } from "@/lib/i18n";
import BrandMark from "@/components/brand-mark";
import TokenCard from "@/components/token-card";
import { IconCalendarPlus, IconClock, IconRupee, IconTrack } from "@/components/icons";
import { COLUMN, COMMIT, FOOTNOTE, GHOST, H1, HEADER, SHELL, SUB } from "@/lib/ui";

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
    <main className={SHELL}>
      <header className={HEADER}>
        <BrandMark lang={lang} />
        <form action="/api/auth/logout" method="post">
          <button className="shrink-0 text-[15px] font-medium text-[#6B7280] underline-offset-4 transition-colors hover:text-[#111111] hover:underline">
            {t(lang, "home.logout")}
          </button>
        </form>
      </header>

      <div className="flex justify-center px-6 pb-20 pt-10">
        <div className={COLUMN}>
          <p className="text-center text-[15px] text-[#6B7280]">{t(lang, "home.namaste")}</p>
          <h1 className={`mt-1 ${H1}`}>{farmer.name}</h1>
          <p className={SUB}>{farmer.village}</p>

          <div className="mt-8">
            {booking ? (
              <>
                <TokenCard
                  href={`/bookings/${booking.id}`}
                  heading={
                    booking.date === today
                      ? t(lang, "home.your_token_today")
                      : `${t(lang, "home.your_token_on")} · ${booking.date}`
                  }
                  token={booking.tokenNumber}
                  line1={booking.centre.name}
                  line2={`${booking.slot.windowStart}–${booking.slot.windowEnd}`}
                  footer={
                    queue ? (
                      <span className="flex items-center justify-center gap-2">
                        <IconClock size={16} className="shrink-0" />
                        <span>
                          {t(lang, "track.now_serving")} #{queue.nowServing || "—"} ·{" "}
                          {t(lang, "track.est_wait")} ~{queue.etaMinutes} {t(lang, "track.min")}
                        </span>
                      </span>
                    ) : undefined
                  }
                />
                <div className="mt-3 flex items-center justify-between gap-3 text-[15px] text-[#6B7280]">
                  <span className="truncate">
                    {booking.crop} · {booking.quantityQuintals} {t(lang, "track.qtl")} ·{" "}
                    {inr(booking.amountPayable)}
                  </span>
                  {/* One status, not a list to scan — a quiet chip beats importing
                      the colour-coded STATUS_BADGE palette onto this screen. */}
                  <span className="shrink-0 rounded-full bg-[#F4F4F5] px-2.5 py-1 text-[12px] font-bold text-[#6B7280]">
                    {STATUS_KEY[booking.status] ? t(lang, STATUS_KEY[booking.status]) : booking.status}
                  </span>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-[#E4E4E7] bg-white p-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF1EB] text-[#E8632A]">
                  <IconCalendarPlus size={26} />
                </span>
                <p className="mt-4 text-[17px] font-semibold text-[#111111]">
                  {t(lang, "home.no_booking")}
                </p>
                <p className="mt-1 text-[15px] text-[#6B7280]">{t(lang, "home.no_booking_hint")}</p>
              </div>
            )}
          </div>

          <Link href="/book" className={`mt-6 gap-2 ${COMMIT}`}>
            <IconCalendarPlus size={20} />
            {t(lang, "home.book_slot")}
          </Link>
          <p className="mt-3 text-center text-[15px] text-[#6B7280]">{t(lang, "home.pick_hint")}</p>

          <div
            className={`mt-5 grid grid-cols-2 gap-3 ${booking ? "" : "pointer-events-none opacity-40"}`}
            aria-disabled={!booking}
          >
            <Link
              href={booking ? `/bookings/${booking.id}` : "#"}
              tabIndex={booking ? undefined : -1}
              className={`gap-2 ${GHOST}`}
            >
              <IconTrack size={18} className="text-[#E8632A]" />
              {t(lang, "home.track_status")}
            </Link>
            <Link
              href={booking ? `/bookings/${booking.id}#payment` : "#"}
              tabIndex={booking ? undefined : -1}
              className={`gap-2 ${GHOST}`}
            >
              <IconRupee size={18} className="text-[#E8632A]" />
              {t(lang, "home.payments")}
            </Link>
          </div>

          <p className={`mt-8 ${FOOTNOTE}`}>{t(lang, "login.footer")}</p>
        </div>
      </div>
    </main>
  );
}
