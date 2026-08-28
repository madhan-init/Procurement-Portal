"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { inr } from "@/lib/status-ui";
import { t, type Lang, type I18nKey } from "@/lib/i18n";
import LangToggle from "@/components/lang-toggle";
import { IconQueue, IconSend } from "@/components/icons";

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

export default function Tracker({ lang, initial }: { lang: Lang; initial: Data }) {
  const [data, setData] = useState<Data>(initial);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());

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
  const currentStep = terminal ? -1 : STEP_INDEX[b.status];
  const eventTime = (key: string) => {
    const hits = b.events.filter((e) => e.status === key);
    return hits.length ? fmtTime(hits[hits.length - 1].at) : null;
  };
  const servedNow = b.status === "SERVING";

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-16 text-[18px]">
      <header className="mb-4 flex items-start gap-3">
        <Link href="/" className="mt-0.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-sm text-gray-500">←</Link>
        <div>
          <h1 className="text-lg font-bold leading-tight">
            {t(lang, "home.token")} #{b.tokenNumber}
          </h1>
          <p className="text-sm text-gray-500">{b.centre.name}</p>
          <p className="text-xs text-gray-400">
            {b.date} · {b.slot.windowStart}–{b.slot.windowEnd} · {b.crop}, {b.quantityQuintals} {t(lang, "track.qtl")}
          </p>
        </div>
      </header>

      {terminal ? (
        <div className={`rounded-xl p-4 text-sm font-medium ${b.status === "NO_SHOW" ? "bg-[#FCEBEB] text-[#791F1F]" : "bg-gray-200 text-gray-600"}`}>
          {b.status === "NO_SHOW" ? t(lang, "track.no_show") : t(lang, "track.cancelled")}
        </div>
      ) : waiting ? (
        <div className="flex items-start gap-3 rounded-xl bg-leaf-100 px-4 py-3 text-leaf-900">
          <span className="mt-2 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
          <IconQueue size={20} className="mt-0.5 shrink-0" />
          <p className="text-[15px] font-medium leading-snug">
            {t(lang, "track.now_serving")} #{q.nowServing || "—"} · {t(lang, "track.your_token")} #{b.tokenNumber} ·{" "}
            {q.position} {t(lang, "track.ahead")} · ~{q.etaMinutes} {t(lang, "track.min")}
          </p>
        </div>
      ) : servedNow ? (
        <div className="rounded-xl bg-[#EEEDFE] p-4 text-center text-[#3C3489]">
          <p className="text-lg font-bold">{t(lang, "track.your_turn")}</p>
          <p className="text-sm">{t(lang, "track.go_counter")}</p>
        </div>
      ) : null}

      {/* 6-step pipeline */}
      <section className="mt-5 rounded-xl bg-white p-4 ring-1 ring-gray-200/60">
        <ol className="space-y-0">
          {STEPS.map((s, i) => {
            const done = currentStep > i || b.status === "PAID";
            const current = currentStep === i && b.status !== "PAID";
            return (
              <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
                {i < STEPS.length - 1 && (
                  <span className={`absolute left-[11px] top-6 h-full w-0.5 ${done ? "bg-leaf-600" : "bg-gray-200"}`} />
                )}
                <span
                  className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-leaf-600 text-white"
                      : current
                        ? "bg-white text-wheat-600 ring-2 ring-wheat-600"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${done ? "text-gray-900" : current ? "text-wheat-600" : "text-gray-400"}`}>
                    {t(lang, s.label)}
                  </p>
                  {s.key === "ARRIVED" && servedNow ? (
                    <p className="mt-0.5 inline-flex items-center gap-1 rounded bg-[#EEEDFE] px-1.5 py-0.5 text-xs font-medium text-[#3C3489]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3C3489]" /> {t(lang, "track.being_served")}
                      {eventTime("SERVING") ? ` · ${eventTime("SERVING")}` : ""}
                    </p>
                  ) : (
                    eventTime(s.key) && <p className="text-xs text-gray-400">{eventTime(s.key)}</p>
                  )}
                  {s.key === "PAYMENT_INITIATED" && currentStep >= 4 && (
                    <p className="text-xs text-gray-500">
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
      <section id="payment" className="mt-4 rounded-xl bg-white p-4 text-sm ring-1 ring-gray-200/60">
        <div className="flex justify-between">
          <span className="text-gray-500">
            {b.crop} · {b.quantityQuintals} {t(lang, "track.qtl")} × {inr(b.ratePerQuintal)}
          </span>
          <b className={b.status === "PAID" ? "font-bold text-leaf-700" : ""}>{inr(b.amountPayable)}</b>
        </div>
        {b.paymentRef && (
          <div className="mt-2 flex justify-between text-xs text-gray-400">
            <span>{t(lang, "track.payment_ref")}</span>
            <span className="font-mono">{b.paymentRef}</span>
          </div>
        )}
      </section>

      {/* SMS + language footer */}
      <div className="mt-5 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-gray-200/60">
        <span className="flex items-center gap-2 text-gray-600">
          <IconSend size={16} className="shrink-0 text-leaf-600" /> {t(lang, "track.sms_on")}
        </span>
        <LangToggle lang={lang} variant="link" />
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">
        {t(lang, "track.auto")}{" "}
        {updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
    </main>
  );
}
