"use client";
/* ─────────────────────────────────────────────────────────────
   Live queue tracker — same coral/ink language as login / book /
   home. Tokens in lib/ui.

   Hierarchy is what a farmer standing in the mandi needs, in order:
   how far away their turn is (the headline), their token number
   (the monumental card), then the pipeline, then money. Coral marks
   the step in progress; ink marks what's already settled.
   Polls /api/bookings/:id every 10s.
   ───────────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";
import Link from "next/link";
import { inr } from "@/lib/status-ui";
import { prettyDate } from "@/lib/dates";
import { t, type Lang, type I18nKey } from "@/lib/i18n";
import BrandMark from "@/components/brand-mark";
import TokenCard from "@/components/token-card";
import { IconSend } from "@/components/icons";
import { COLUMN, FOOTNOTE, H1, HEADER, SHELL, SUB } from "@/lib/ui";

type EventRow = { id: number; status: string; at: string };
type Data = {
  booking: {
    id: number;
    tokenNumber: number;
    status: string;
    crop: string;
    quantityQuintals: number;
    ratePerQuintal: number;
    amountPayable: number;
    paymentRef: string | null;
    date: string;
    centre: { name: string; district: string; avgServiceMinutes: number };
    slot: { windowStart: string; windowEnd: string };
    events: EventRow[];
  };
  queue: { position: number; nowServing: number; etaMinutes: number };
};

// The 6 farmer-visible steps; SERVING renders as a live sub-state of "Arrived".
const STEPS: { key: string; label: I18nKey }[] = [
  { key: "BOOKED", label: "track.step_booked" },
  { key: "ARRIVED", label: "track.step_arrived" },
  { key: "WEIGHED", label: "track.step_weighed" },
  { key: "PROCURED", label: "track.step_procured" },
  { key: "PAYMENT_INITIATED", label: "track.step_pay_init" },
  { key: "PAID", label: "track.step_paid" },
];
const STEP_INDEX: Record<string, number> = {
  BOOKED: 0, ARRIVED: 1, SERVING: 1, WEIGHED: 2, PROCURED: 3, PAYMENT_INITIATED: 4, PAID: 5,
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

const CARD = "rounded-xl border border-[#E4E4E7] bg-white";

export default function Tracker({ lang, initial }: { lang: Lang; initial: Data }) {
  const [data, setData] = useState<Data>(initial);
  // null until mounted: `new Date()` in the initial render puts a different
  // second in the server HTML than the client's, which trips hydration.
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => setUpdatedAt(new Date()), []);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/bookings/${initial.booking.id}`, { cache: "no-store" });
        if (res.ok) {
          setData(await res.json());
          setUpdatedAt(new Date());
        }
      } catch {
        /* offline blip — keep last state */
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [initial.booking.id]);

  const b = data.booking;
  const q = data.queue;
  const terminal = b.status === "NO_SHOW" || b.status === "CANCELLED";
  const waiting = b.status === "BOOKED" || b.status === "ARRIVED";
  const servedNow = b.status === "SERVING";
  const currentStep = terminal ? -1 : STEP_INDEX[b.status];
  const eventTime = (key: string) => {
    const hits = b.events.filter((e) => e.status === key);
    return hits.length ? fmtTime(hits[hits.length - 1].at) : null;
  };

  // The headline carries the one fact worth walking over for.
  const headline = terminal
    ? t(lang, b.status === "NO_SHOW" ? "track.no_show_title" : "track.cancelled_title")
    : servedNow
      ? t(lang, "track.your_turn")
      : waiting
        ? q.position > 0
          ? `${q.position} ${t(lang, "track.ahead")}`
          : t(lang, "track.youre_next")
        : t(lang, STEPS[currentStep].label);

  return (
    <main className={SHELL}>
      <header className={HEADER}>
        <BrandMark lang={lang} />
        <Link
          href="/"
          className="shrink-0 text-[15px] font-medium text-[#6B7280] underline-offset-4 transition-colors hover:text-[#111111] hover:underline"
        >
          <span aria-hidden>←</span> {t(lang, "book.back")}
        </Link>
      </header>

      <div className="flex justify-center px-6 pb-20 pt-10">
        <div className={COLUMN}>
          <h1 className={H1} aria-live="polite">
            {headline}
          </h1>
          <p className={SUB}>{b.centre.name}</p>
          <p className="mt-1 text-center text-[15px] text-[#A0A3A8]">
            {prettyDate(b.date)} · {b.slot.windowStart}–{b.slot.windowEnd} · {b.crop},{" "}
            {b.quantityQuintals} {t(lang, "track.qtl")}
          </p>

          {/* Token — the number they'll be called by */}
          <div className="mt-7">
            <TokenCard
              heading={t(lang, "track.your_token")}
              token={b.tokenNumber}
              footer={
                terminal ? (
                  <span className="text-[#B4383C]">
                    {t(lang, b.status === "NO_SHOW" ? "track.no_show" : "track.cancelled")}
                  </span>
                ) : servedNow ? (
                  <span className="flex items-center justify-center gap-2 font-semibold text-[#C2521E]">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full bg-[#FB8A61] motion-safe:animate-pulse"
                    />
                    {t(lang, "track.go_counter")}
                  </span>
                ) : waiting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full bg-[#FB8A61] motion-safe:animate-pulse"
                    />
                    {t(lang, "track.now_serving")}{" "}
                    <b className="font-semibold text-[#111111]">#{q.nowServing || "—"}</b> ·{" "}
                    {t(lang, "track.est_wait")} ~{q.etaMinutes} {t(lang, "track.min")}
                  </span>
                ) : undefined
              }
            />
          </div>

          {/* 6-step pipeline */}
          <section className={`mt-4 p-5 ${CARD}`}>
            <ol>
              {STEPS.map((s, i) => {
                const done = currentStep > i || b.status === "PAID";
                const current = currentStep === i && b.status !== "PAID";
                return (
                  <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < STEPS.length - 1 && (
                      <span
                        aria-hidden
                        className={`absolute left-[13px] top-7 h-full w-0.5 ${done ? "bg-[#111111]" : "bg-[#EFEFF1]"}`}
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                        done
                          ? "bg-[#111111] text-white"
                          : current
                            ? "bg-white text-[#C2521E] ring-2 ring-[#FB8A61]"
                            : "bg-[#F4F4F5] text-[#A0A3A8]"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p
                        className={`text-[16px] ${
                          done
                            ? "font-medium text-[#111111]"
                            : current
                              ? "font-semibold text-[#111111]"
                              : "text-[#A0A3A8]"
                        }`}
                      >
                        {t(lang, s.label)}
                      </p>
                      {s.key === "ARRIVED" && servedNow ? (
                        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#FFF1EB] px-2.5 py-1 text-[12px] font-bold text-[#C2521E]">
                          <span
                            aria-hidden
                            className="h-1.5 w-1.5 rounded-full bg-[#FB8A61] motion-safe:animate-pulse"
                          />
                          {t(lang, "track.being_served")}
                          {eventTime("SERVING") ? ` · ${eventTime("SERVING")}` : ""}
                        </p>
                      ) : (
                        eventTime(s.key) && <p className="text-[13px] text-[#A0A3A8]">{eventTime(s.key)}</p>
                      )}
                      {s.key === "PAYMENT_INITIATED" && currentStep >= 4 && (
                        <p className="text-[13px] text-[#6B7280]">
                          {inr(b.amountPayable)}
                          {b.paymentRef ? ` · ref ${b.paymentRef}` : ""}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Payment summary */}
          <section id="payment" className={`mt-4 p-4 ${CARD}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] text-[#6B7280]">
                {b.crop} · {b.quantityQuintals} {t(lang, "track.qtl")} × {inr(b.ratePerQuintal)}
              </span>
              <b
                className={`shrink-0 text-[17px] font-semibold ${
                  b.status === "PAID" ? "text-[#C2521E]" : "text-[#111111]"
                }`}
              >
                {inr(b.amountPayable)}
              </b>
            </div>
            {b.paymentRef && (
              <div className="mt-2 flex justify-between gap-3 text-[13px] text-[#A0A3A8]">
                <span>{t(lang, "track.payment_ref")}</span>
                <span className="font-mono">{b.paymentRef}</span>
              </div>
            )}
          </section>

          {/* SMS notice */}
          <div className={`mt-4 flex items-center gap-2 px-4 py-3.5 text-[15px] text-[#6B7280] ${CARD}`}>
            <IconSend size={16} className="shrink-0 text-[#E8632A]" />
            {t(lang, "track.sms_on")}
          </div>

          <p className={`mt-6 ${FOOTNOTE}`}>
            {t(lang, "track.auto")}
            {updatedAt
              ? ` ${updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : ""}
          </p>
        </div>
      </div>
    </main>
  );
}
