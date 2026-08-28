"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { inr } from "@/lib/status-ui";

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

function dateLabel(d: string, i: number) {
  if (i === 0) return "Today";
  if (i === 1) return "Tomorrow";
  return new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export default function BookingFlow({ centres, crops, dates }: { centres: Centre[]; crops: Crop[]; dates: string[] }) {
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
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="w-full rounded-3xl bg-green-800 p-8 text-white shadow-xl">
          <div className="text-5xl">✅</div>
          <p className="mt-4 text-sm uppercase tracking-widest text-green-200">Your token</p>
          <p className="text-7xl font-black">#{done.token}</p>
          <p className="mt-4 font-medium">{done.centre}</p>
          <p className="text-sm text-green-200">
            {done.date} · {done.window}
          </p>
          <p className="mt-3 rounded-xl bg-green-900/60 px-3 py-2 text-sm">
            Expected payment <b>{inr(done.amount)}</b>
          </p>
        </div>
        <Link
          href={`/bookings/${done.bookingId}`}
          className="mt-6 w-full rounded-xl bg-green-700 py-3 font-semibold text-white"
        >
          Track live queue →
        </Link>
        <Link href="/" className="mt-3 text-sm text-gray-500">
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md p-5 pb-28">
      <header className="mb-5 flex items-center gap-3">
        <Link href="/" className="rounded-lg border border-gray-200 px-2.5 py-1 text-sm text-gray-500">
          ←
        </Link>
        <h1 className="text-lg font-bold">Book a slot</h1>
      </header>

      {/* Step 1 — centre */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">1 · Procurement centre</h2>
        <div className="space-y-2">
          {centres.map((c) => (
            <button
              key={c.id}
              onClick={() => setCentre(c)}
              className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left ${
                centre?.id === c.id ? "border-green-700 bg-green-50" : "border-gray-200 bg-white"
              }`}
            >
              <span>
                <span className="block font-medium">{c.name}</span>
                <span className="text-xs text-gray-400">{c.district} district</span>
              </span>
              {centre?.id === c.id && <span className="text-green-700">●</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Step 2 — date */}
      {centre && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">2 · Date</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dates.map((d, i) => (
              <button
                key={d}
                onClick={() => setDate(d)}
                className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-medium ${
                  date === d ? "border-green-700 bg-green-700 text-white" : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                {dateLabel(d, i)}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 3 — window */}
      {centre && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">3 · Time window</h2>
          {!slots ? (
            <p className="text-sm text-gray-400">Loading windows…</p>
          ) : slots.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-sm text-gray-400 ring-1 ring-gray-100">
              No windows published for this date yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button
                  key={s.id}
                  disabled={s.full}
                  onClick={() => setSlot(s)}
                  className={`rounded-xl border p-3 text-center ${
                    s.full
                      ? "cursor-not-allowed border-gray-100 bg-gray-100 text-gray-400"
                      : slot?.id === s.id
                        ? "border-green-700 bg-green-50"
                        : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    {s.windowStart}–{s.windowEnd}
                  </span>
                  <span className={`mt-1 block text-xs ${s.pctFull >= 80 ? "text-red-500" : "text-gray-400"}`}>
                    {s.full ? "Full" : `${s.pctFull}% full`}
                  </span>
                  <span className="mt-1 block h-1.5 w-full overflow-hidden rounded bg-gray-100">
                    <span
                      className={`block h-full ${s.pctFull >= 80 ? "bg-red-400" : "bg-green-500"}`}
                      style={{ width: `${s.pctFull}%` }}
                    />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Step 4 — crop & quantity */}
      {slot && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">4 · Crop & quantity</h2>
          <div className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
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
              placeholder="Quantity in quintals"
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2.5"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            {Number(qty) > 0 && (
              <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                Expected payment: {qty} qtl × {inr(crop.ratePerQuintal)} = <b>{inr(Number(qty) * crop.ratePerQuintal)}</b>
              </p>
            )}
          </div>
        </section>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {slot && Number(qty) > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-gray-50 via-gray-50 p-4">
          <button
            onClick={confirm}
            disabled={busy}
            className="w-full rounded-xl bg-green-700 py-3.5 font-semibold text-white shadow-lg disabled:opacity-50"
          >
            {busy ? "Booking…" : `Confirm booking · ${dateLabel(date, dates.indexOf(date))} ${slot.windowStart}`}
          </button>
        </div>
      )}
    </main>
  );
}
