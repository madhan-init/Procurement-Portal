"use client";
/* ─────────────────────────────────────────────────────────────
   Book a slot — same coral/ink language as the login screen.
   White page, brand mark top-left, one centred 456px column,
   56px fields, exactly one coral commit button. Tokens in lib/ui.
   Selection reads in ink; only the confirm button is coral.
   Steps reveal in order (centre → date → window → crop) so the
   column grows downward and the commit lands under your thumb.
   ───────────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";
import Link from "next/link";
import { inr } from "@/lib/status-ui";
import { prettyDate } from "@/lib/dates";
import { t, type Lang } from "@/lib/i18n";
import BrandMark from "@/components/brand-mark";
import ErrorLine from "@/components/error-line";
import Chevron from "@/components/chevron";
import TokenCard from "@/components/token-card";
import {
  CHIP,
  COLUMN,
  COMMIT,
  FIELD,
  FIELD_LINE,
  FOOTNOTE,
  H1,
  HEADER,
  HELP,
  LABEL,
  PICK,
  PICK_DEAD,
  PICK_OFF,
  PICK_ON,
  SHELL,
  SUB,
} from "@/lib/ui";

type Centre = { id: number; name: string; district: string };
type Crop = { crop: string; ratePerQuintal: number; season: string };
type SlotInfo = {
  id: number;
  windowStart: string;
  windowEnd: string;
  capacity: number;
  bookedCount: number;
  pctFull: number;
  full: boolean;
};
type Success = { bookingId: number; token: number; date: string; window: string; centre: string; amount: number };

function dateLabel(d: string, i: number, lang: Lang) {
  if (i === 0) return t(lang, "book.today");
  if (i === 1) return t(lang, "book.tomorrow");
  return prettyDate(d);
}

// Fullness stays semantic — it's information, not decoration. Read in the
// screen's own palette: neutral while there's room, coral filling up,
// danger nearly gone, flat gray when closed. On a selected (coral) card it
// inverts to a white chip so it stays legible against the fill.
function pillClass(s: SlotInfo, selected: boolean) {
  if (s.full) return "bg-[#EFEFF1] text-[#A0A3A8]";
  if (selected) return "bg-white text-[#C2521E]";
  if (s.pctFull >= 85) return "bg-[#FEF1F1] text-[#B4383C]";
  if (s.pctFull >= 60) return "bg-[#FFF1EB] text-[#C2521E]";
  return "bg-[#F4F4F5] text-[#6B7280]";
}

function barClass(s: SlotInfo, selected: boolean) {
  if (selected) return "bg-white";
  if (s.pctFull >= 85) return "bg-[#E5484D]";
  if (s.pctFull >= 60) return "bg-[#FB8A61]";
  return "bg-[#6B7280]"; // matches the gray pill's ink, so bar and pill read as one signal
}

/** Step heading — same weight as a login field label, with the step number
 *  carried in faint ink so the sequence is legible at a glance. */
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className={`mb-2 flex items-baseline gap-2 ${LABEL}`}>
      <span className="text-[13px] font-bold text-[#A0A3A8]">{n}</span>
      {children}
    </h2>
  );
}

export default function BookingFlow({ lang, centres, crops, dates }: { lang: Lang; centres: Centre[]; crops: Crop[]; dates: string[] }) {
  const [centre, setCentre] = useState<Centre | null>(null);
  const [date, setDate] = useState<string>(dates[0]);
  const [slots, setSlots] = useState<SlotInfo[] | null>(null);
  const [slot, setSlot] = useState<SlotInfo | null>(null);
  const [crop, setCrop] = useState<Crop>(crops[0]);
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Success | null>(null);

  useEffect(() => {
    if (!centre) return;
    setSlots(null);
    setSlot(null);
    fetch(`/api/slots?centreId=${centre.id}&date=${date}`)
      .then((r) => r.json())
      .then(setSlots);
  }, [centre, date]);

  async function confirm() {
    if (!slot) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: slot.id, crop: crop.crop, quantityQuintals: Number(qty) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Booking failed");
        // A 409 means someone took the last place while this form was open —
        // repull the windows so the fullness bars tell the truth.
        if (res.status === 409 && centre) {
          const fresh = await fetch(`/api/slots?centreId=${centre.id}&date=${date}`).then((r) => r.json());
          setSlots(fresh);
          setSlot(null);
        }
        return;
      }
      setDone({
        bookingId: data.booking.id,
        token: data.booking.tokenNumber,
        date: data.booking.date,
        window: `${data.slot.windowStart}–${data.slot.windowEnd}`,
        centre: data.centre.name,
        amount: data.booking.amountPayable,
      });
    } catch {
      setError("Can't reach the server. Check your connection and try again");
    } finally {
      setBusy(false);
    }
  }

  /* ── Confirmed ───────────────────────────────────────────── */
  if (done) {
    return (
      <main className={SHELL}>
        <header className={HEADER}>
          <BrandMark lang={lang} />
        </header>

        <div className="flex min-h-[calc(100vh-104px)] items-center justify-center px-6 pb-[14vh]">
          <div className={COLUMN}>
            <h1 className={H1}>{t(lang, "success.headline")}</h1>
            <p className={SUB}>
              {done.centre}
              <span className="mt-1 block text-[15px] text-[#A0A3A8]">
                {prettyDate(done.date)} · {done.window}
              </span>
            </p>

            <div className="mt-7">
              <TokenCard
                heading={t(lang, "success.your_token")}
                token={done.token}
                footer={
                  <>
                    {t(lang, "success.expected")}{" "}
                    <b className="font-semibold text-[#111111]">{inr(done.amount)}</b>
                  </>
                }
              />
            </div>

            <Link href={`/bookings/${done.bookingId}`} className={`mt-6 ${COMMIT}`}>
              {t(lang, "success.track")}
            </Link>
            <Link href="/" className="mt-4 block text-center text-[15px] font-medium text-[#6B7280] hover:text-[#111111]">
              {t(lang, "success.back")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ── The form ────────────────────────────────────────────── */
  const canConfirm = Boolean(slot) && Number(qty) > 0;

  return (
    <main className={SHELL}>
      <header className={HEADER}>
        <BrandMark lang={lang} />
        <Link
          href="/"
          className="shrink-0 text-[15px] font-medium text-[#6B7280] underline-offset-4 hover:text-[#111111] hover:underline"
        >
          <span aria-hidden>←</span> {t(lang, "book.back")}
        </Link>
      </header>

      <div className="flex justify-center px-6 pb-20 pt-10">
        <div className={COLUMN}>
          <h1 className={H1}>{t(lang, "book.title")}</h1>
          <p className={SUB}>{t(lang, "book.subtitle")}</p>

          <ErrorLine message={error} />

          {/* Step 1 — centre */}
          <section className="mt-4">
            <Step n={1}>{t(lang, "book.step_centre")}</Step>
            <div className="relative">
              <select
                aria-label={t(lang, "book.step_centre")}
                className={`${FIELD} ${FIELD_LINE} appearance-none pr-12`}
                value={centre?.id ?? ""}
                onChange={(e) => setCentre(centres.find((c) => c.id === Number(e.target.value)) ?? null)}
              >
                <option value="" disabled>
                  {t(lang, "book.pick_centre")}
                </option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.district}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </section>

          {/* Step 2 — date */}
          {centre && (
            <section className="mt-6">
              <Step n={2}>{t(lang, "book.step_date")}</Step>
              <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
                {dates.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => setDate(d)}
                    aria-pressed={date === d}
                    className={`${CHIP} ${date === d ? PICK_ON : PICK_OFF}`}
                  >
                    {dateLabel(d, i, lang)}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Step 3 — window */}
          {centre && (
            <section className="mt-6">
              <Step n={3}>{t(lang, "book.step_window")}</Step>
              {!slots ? (
                <p className={HELP}>{t(lang, "book.loading_windows")}</p>
              ) : slots.length === 0 ? (
                <p className={`rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] p-4 ${HELP}`}>
                  {t(lang, "book.no_windows")}
                </p>
              ) : (
                <div className="space-y-2">
                  {slots.map((s) => {
                    const on = slot?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        disabled={s.full}
                        onClick={() => setSlot(s)}
                        aria-pressed={on}
                        className={`${PICK} ${s.full ? PICK_DEAD : on ? PICK_ON : PICK_OFF}`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-[16px] font-semibold">
                            {s.windowStart} – {s.windowEnd}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${pillClass(s, on)}`}
                          >
                            {s.full ? t(lang, "book.full") : `${s.pctFull}${t(lang, "book.pct_full")}`}
                          </span>
                        </span>
                        {!s.full && (
                          <span
                            className={`mt-3 block h-1.5 w-full overflow-hidden rounded-full ${
                              on ? "bg-white/25" : "bg-[#EFEFF1]"
                            }`}
                          >
                            <span
                              className={`block h-full rounded-full ${barClass(s, on)}`}
                              style={{ width: `${s.pctFull}%` }}
                            />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Step 4 — crop & quantity */}
          {slot && (
            <section className="mt-6">
              <Step n={4}>{t(lang, "book.step_crop")}</Step>
              <div className="relative">
                <select
                  aria-label={t(lang, "book.step_crop")}
                  className={`${FIELD} ${FIELD_LINE} appearance-none pr-12`}
                  value={crop.crop}
                  onChange={(e) => setCrop(crops.find((c) => c.crop === e.target.value) ?? crops[0])}
                >
                  {crops.map((c) => (
                    <option key={c.crop} value={c.crop}>
                      {c.crop} — {inr(c.ratePerQuintal)}/qtl ({c.season})
                    </option>
                  ))}
                </select>
                <Chevron />
              </div>

              <div className="relative mt-3">
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  inputMode="decimal"
                  aria-label={t(lang, "book.qty_ph")}
                  placeholder={t(lang, "book.qty_ph")}
                  className={`${FIELD} ${FIELD_LINE} pr-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-[#A0A3A8]"
                >
                  {t(lang, "book.qtl_suffix")}
                </span>
              </div>

              {Number(qty) > 0 && (
                <p className="mt-3 rounded-xl bg-[#FFF6F2] px-4 py-3 text-[15px] text-[#6B7280]">
                  {t(lang, "book.expected")}:{" "}
                  <span className="whitespace-nowrap">
                    {qty} {t(lang, "track.qtl")} × {inr(crop.ratePerQuintal)}
                  </span>{" "}
                  = <b className="font-semibold text-[#111111]">{inr(Number(qty) * crop.ratePerQuintal)}</b>
                </p>
              )}
            </section>
          )}

          {canConfirm && (
            <button onClick={confirm} disabled={busy} className={`mt-7 ${COMMIT}`}>
              {busy ? t(lang, "book.booking") : t(lang, "book.confirm")}
            </button>
          )}

          <p className={`mt-8 ${FOOTNOTE}`}>{t(lang, "login.footer")}</p>
        </div>
      </div>
    </main>
  );
}
