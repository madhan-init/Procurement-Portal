"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { inr } from "@/lib/status-ui";
import { t, type Lang } from "@/lib/i18n";
import TokenSlip from "@/components/token-slip";
import { IconRupee } from "@/components/icons";

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
  return new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

// Fullness pill per the mockup: green < 60%, wheat 60–84%, red ≥ 85%, gray when full.
function pillClass(s: SlotInfo) {
  if (s.full) return "bg-gray-100 text-gray-500";
  if (s.pctFull >= 85) return "bg-[#FCEBEB] text-[#791F1F]";
  if (s.pctFull >= 60) return "bg-wheat-50 text-wheat-700";
  return "bg-leaf-100 text-leaf-800";
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
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId: slot.id, crop: crop.crop, quantityQuintals: Number(qty) }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Booking failed");
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
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6 text-[18px]">
        <TokenSlip
          size="lg"
          heading={t(lang, "success.your_token")}
          token={done.token}
          line1={done.centre}
          line2={`${done.date} · ${done.window}`}
          footer={
            <span className="flex items-center gap-2">
              <IconRupee size={16} className="shrink-0" />
              <span>
                {t(lang, "success.expected")} <b className="text-wheat-900">{inr(done.amount)}</b>
              </span>
            </span>
          }
        />
        <Link
          href={`/bookings/${done.bookingId}`}
          className="mt-6 flex min-h-14 w-full items-center justify-center rounded-xl bg-leaf-600 font-semibold text-white hover:bg-leaf-700"
        >
          {t(lang, "success.track")}
        </Link>
        <Link href="/" className="mt-4 text-center text-sm font-medium text-gray-500">
          {t(lang, "success.back")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-28 text-[18px]">
      <header className="mb-5 flex items-center gap-3">
        <Link href="/" className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-sm text-gray-500">
          ←
        </Link>
        <h1 className="text-lg font-bold">{t(lang, "book.title")}</h1>
      </header>

      {/* Step 1 — centre */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">{t(lang, "book.step_centre")}</h2>
        <select
          className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 outline-none focus:border-leaf-600"
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
      </section>

      {/* Step 2 — date */}
      {centre && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">{t(lang, "book.step_date")}</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dates.map((d, i) => (
              <button
                key={d}
                onClick={() => setDate(d)}
                className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-medium ${
                  date === d ? "border-leaf-600 bg-leaf-600 text-white" : "border-gray-200 bg-white text-gray-600"
                }`}
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
          <h2 className="mb-2 text-sm font-semibold text-gray-500">{t(lang, "book.step_window")}</h2>
          {!slots ? (
            <p className="text-sm text-gray-400">{t(lang, "book.loading_windows")}</p>
          ) : slots.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-sm text-gray-400 ring-1 ring-gray-200/60">
              {t(lang, "book.no_windows")}
            </p>
          ) : (
            <div className="space-y-2">
              {slots.map((s) => (
                <button
                  key={s.id}
                  disabled={s.full}
                  onClick={() => setSlot(s)}
                  className={`w-full rounded-xl border p-4 text-left ${
                    s.full
                      ? "cursor-not-allowed border-gray-100 bg-gray-100 text-gray-400"
                      : slot?.id === s.id
                        ? "border-leaf-600 bg-leaf-50"
                        : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold">
                      {s.windowStart} – {s.windowEnd}
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${pillClass(s)}`}>
                      {s.full ? t(lang, "book.full") : `${s.pctFull}${t(lang, "book.pct_full")}`}
                    </span>
                  </span>
                  {!s.full && (
                    <span className="mt-2.5 block h-1.5 w-full overflow-hidden rounded bg-gray-100">
                      <span
                        className={`block h-full ${
                          s.pctFull >= 85 ? "bg-[#B91C1C]" : s.pctFull >= 60 ? "bg-wheat-600" : "bg-leaf-600"
                        }`}
                        style={{ width: `${s.pctFull}%` }}
                      />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Step 4 — crop & quantity */}
      {slot && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">{t(lang, "book.step_crop")}</h2>
          <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200/60">
            <select
              className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 outline-none focus:border-leaf-600"
              value={crop.crop}
              onChange={(e) => setCrop(crops.find((c) => c.crop === e.target.value) ?? crops[0])}
            >
              {crops.map((c) => (
                <option key={c.crop} value={c.crop}>
                  {c.crop} — {inr(c.ratePerQuintal)}/qtl ({c.season})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0.5"
              step="0.5"
              inputMode="decimal"
              placeholder={t(lang, "book.qty_ph")}
              className="mt-3 h-14 w-full rounded-xl border border-gray-300 px-4 outline-none focus:border-leaf-600"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            {Number(qty) > 0 && (
              <p className="mt-3 rounded-xl bg-leaf-50 px-4 py-3 text-sm text-leaf-800">
                {t(lang, "book.expected")}: {qty} {t(lang, "track.qtl")} × {inr(crop.ratePerQuintal)} = <b>{inr(Number(qty) * crop.ratePerQuintal)}</b>
              </p>
            )}
          </div>
        </section>
      )}

      {error && <p className="mt-4 rounded-xl bg-[#FCEBEB] px-4 py-3 text-sm text-[#791F1F]">{error}</p>}

      {slot && Number(qty) > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-page via-page p-4">
          <button
            onClick={confirm}
            disabled={busy}
            className="min-h-14 w-full rounded-xl bg-leaf-600 font-semibold text-white shadow-lg hover:bg-leaf-700 disabled:opacity-50"
          >
            {busy ? t(lang, "book.booking") : t(lang, "book.confirm")}
          </button>
        </div>
      )}
    </main>
  );
}
