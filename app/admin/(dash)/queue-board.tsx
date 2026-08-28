"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { STATUS_LABEL, STATUS_BADGE, CHART, inr } from "@/lib/status-ui";
import { STATUS_ORDER } from "@/lib/status";
import { IconChart, IconMegaphone, IconSend } from "@/components/icons";

type Row = {
  id: number;
  tokenNumber: number;
  status: string;
  crop: string;
  quantityQuintals: number;
  amountPayable: number;
  farmer: { name: string; phone: string; village: string };
  slot: { windowStart: string; windowEnd: string };
};
type QueueData = {
  date: string;
  rows: Row[];
  summary: { total: number; waiting: number; nowServing: number; paid: number; noShows: number; avgWaitMin: number | null; measuredServiceMin: number | null };
};

const NEXT_LABEL: Record<string, string> = {
  BOOKED: "Mark arrived",
  ARRIVED: "Start serving",
  SERVING: "Mark weighed",
  WEIGHED: "Mark procured",
  PROCURED: "Initiate payment",
  PAYMENT_INITIATED: "Mark paid",
};

const weekday = (d: string) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short" });

type ForecastRow = { date: string; predicted_arrivals: number; suggested_capacity: number };

function ForecastRailCard({ centreId }: { centreId: number }) {
  const [rows, setRows] = useState<ForecastRow[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [applyMsg, setApplyMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setOffline(false);
    setApplyMsg(null);
    fetch(`/api/forecast?centreId=${centreId}&days=7`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("forecast offline");
        const json = await res.json();
        if (!cancelled) setRows(json.rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setOffline(true);
      });
    return () => {
      cancelled = true;
    };
  }, [centreId]);

  const max = rows?.length ? Math.max(...rows.map((r) => r.predicted_arrivals)) : 0;
  const peak = rows?.length ? rows.reduce((a, b) => (b.predicted_arrivals > a.predicted_arrivals ? b : a)) : null;

  async function applySuggestion() {
    if (!peak) return;
    setApplying(true);
    setApplyMsg(null);
    const res = await fetch("/api/admin/forecast/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centreId, date: peak.date, suggested: peak.suggested_capacity }),
    });
    setApplying(false);
    if (res.ok) {
      setApplyMsg({ kind: "ok", text: `Capacity for ${peak.date} set to ${peak.suggested_capacity}` });
    } else {
      setApplyMsg({ kind: "err", text: (await res.json()).error ?? "Apply failed" });
    }
  }

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200/60">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <IconChart size={16} className="text-leaf-600" /> Arrivals forecast · 7 days
        </h2>
      </div>
      {offline ? (
        <p className="mt-3 text-xs text-gray-400">Forecast service offline — npm run forecast</p>
      ) : !rows ? (
        <p className="mt-3 text-xs text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-gray-400">No forecast rows yet.</p>
      ) : (
        <>
          <div className="mt-3 flex h-16 items-end gap-1">
            {rows.map((r) => (
              <div
                key={r.date}
                title={`${r.date}: ${r.predicted_arrivals} expected`}
                className="flex-1 rounded-t-[4px]"
                style={{
                  height: `${max ? Math.max(6, Math.round((r.predicted_arrivals / max) * 100)) : 6}%`,
                  backgroundColor: r.date === peak?.date ? CHART.miniPeak : CHART.miniBar,
                }}
              />
            ))}
          </div>
          {peak && (
            <p className="mt-2 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{weekday(peak.date)} peak: {peak.predicted_arrivals} expected</span>
              <span className="block">Suggested capacity {peak.suggested_capacity}</span>
            </p>
          )}
          <button
            onClick={applySuggestion}
            disabled={applying || !peak}
            className="mt-3 w-full rounded-lg border border-leaf-600/40 px-3 py-1.5 text-sm font-medium text-leaf-700 hover:bg-leaf-50 disabled:opacity-40"
          >
            {applying ? "Applying…" : "Apply suggestion"}
          </button>
          {applyMsg && (
            <p className={`mt-2 text-xs ${applyMsg.kind === "ok" ? "text-leaf-700" : "text-red-600"}`}>{applyMsg.text}</p>
          )}
        </>
      )}
      <Link href={`/admin/forecast?centre=${centreId}`} className="mt-3 block text-xs font-medium text-leaf-700 hover:underline">
        Full forecast →
      </Link>
    </div>
  );
}

export default function QueueBoard({
  centreId,
  centreName,
  avgServiceMinutes,
  today,
}: {
  centreId: number;
  centreName: string;
  avgServiceMinutes: number;
  today: string;
}) {
  const [data, setData] = useState<QueueData | null>(null);
  const [busyId, setBusyId] = useState<number | "next" | null>(null);
  const [error, setError] = useState("");
  const [remBusy, setRemBusy] = useState(false);
  const [remToast, setRemToast] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/queue?centreId=${centreId}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, [centreId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  async function act(fn: () => Promise<Response>, id: number | "next") {
    setBusyId(id);
    setError("");
    const res = await fn();
    if (!res.ok) setError((await res.json()).error ?? "Action failed");
    await load();
    setBusyId(null);
  }
  const callNext = () =>
    act(
      () =>
        fetch("/api/admin/call-next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ centreId }),
        }),
      "next",
    );
  const advance = (id: number, status?: string) =>
    act(
      () =>
        fetch(`/api/admin/bookings/${id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(status ? { status } : {}),
        }),
      id,
    );

  async function sendReminders() {
    setRemBusy(true);
    setRemToast("");
    const res = await fetch("/api/admin/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centreId }),
    });
    const json = await res.json();
    setRemBusy(false);
    setRemToast(res.ok ? `Sent ${json.sent} reminder${json.sent === 1 ? "" : "s"} for ${json.date}` : (json.error ?? "Failed to send reminders"));
  }

  const s = data?.summary;
  const todayLabel = new Date(`${today}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const nextToken = data
    ? data.rows
        .filter((r) => r.status === "BOOKED" || r.status === "ARRIVED")
        .reduce<number | null>((min, r) => (min === null || r.tokenNumber < min ? r.tokenNumber : min), null)
    : null;

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{centreName}</h1>
          <p className="text-sm text-gray-400">
            Today · {todayLabel} · avg service {avgServiceMinutes} min/farmer · refreshes every 10 s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={sendReminders}
            disabled={remBusy}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <IconSend size={16} /> {remBusy ? "Sending…" : "Send tomorrow's reminders"}
          </button>
          <button
            onClick={callNext}
            disabled={busyId !== null || !data || s?.waiting === 0}
            className="flex items-center gap-2 rounded-xl bg-leaf-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-leaf-700 disabled:opacity-40"
          >
            <IconMegaphone size={18} /> {busyId === "next" ? "Calling…" : "Call next"}
          </button>
        </div>
      </div>

      {remToast && <p className="mt-3 rounded-lg bg-leaf-100 px-3 py-2 text-sm text-leaf-800">{remToast}</p>}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        {/* Queue table */}
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-gray-200/60 self-start">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Farmer</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3">Crop</th>
                <th className="px-4 py-3 text-right">Qty (qtl)</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!data ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    Loading queue…
                  </td>
                </tr>
              ) : data.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No bookings at this centre today.
                  </td>
                </tr>
              ) : (
                data.rows.map((b) => {
                  const terminal = b.status === "NO_SHOW" || b.status === "CANCELLED" || b.status === "PAID";
                  const waiting = b.status === "BOOKED" || b.status === "ARRIVED";
                  return (
                    <tr
                      key={b.id}
                      className={`border-b border-gray-50 last:border-0 ${
                        b.status === "SERVING" ? "bg-[#EEEDFE]/60" : terminal ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 font-black text-[15px]">#{b.tokenNumber}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{b.farmer.name}</span>
                        <span className="block text-xs text-gray-400">
                          {b.farmer.village} · {b.farmer.phone}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {b.slot.windowStart}–{b.slot.windowEnd}
                      </td>
                      <td className="px-4 py-2.5">{b.crop}</td>
                      <td className="px-4 py-2.5 text-right">{b.quantityQuintals}</td>
                      <td className="px-4 py-2.5 text-right">{inr(b.amountPayable)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[b.status as keyof typeof STATUS_BADGE]}`}>
                          {STATUS_LABEL[b.status as keyof typeof STATUS_LABEL]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {(STATUS_ORDER as readonly string[]).includes(b.status) && b.status !== "PAID" && (
                          <button
                            onClick={() => advance(b.id)}
                            disabled={busyId !== null}
                            className="rounded-lg bg-leaf-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-leaf-700 disabled:opacity-40"
                          >
                            {busyId === b.id ? "…" : (NEXT_LABEL[b.status] ?? "Advance")}
                          </button>
                        )}
                        {waiting && (
                          <button
                            onClick={() => advance(b.id, "NO_SHOW")}
                            disabled={busyId !== null}
                            className="ml-2 text-xs font-medium text-red-600 underline-offset-2 hover:underline disabled:opacity-40"
                          >
                            No-show
                          </button>
                        )}
                        {b.status === "BOOKED" && (
                          <button
                            onClick={() => advance(b.id, "CANCELLED")}
                            disabled={busyId !== null}
                            className="ml-2 text-xs text-gray-400 underline-offset-2 hover:underline disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          {/* Now serving */}
          <div className="rounded-xl bg-leaf-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-leaf-800">Now serving</p>
            <p className="mt-1 text-5xl font-black text-leaf-900">{s?.nowServing ? `#${s.nowServing}` : "—"}</p>
            <p className="mt-2 text-sm text-leaf-800">
              Next {nextToken !== null ? `#${nextToken}` : "—"} · {s?.waiting ?? 0} in queue
            </p>
          </div>

          {/* Today */}
          <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200/60">
            <p className="text-sm font-semibold">Today</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { label: "Avg wait (measured)", value: s?.avgWaitMin != null ? `${s.avgWaitMin} min` : "—" },
                { label: "Service/farmer", value: s?.measuredServiceMin != null ? `${s.measuredServiceMin} min` : "—" },
                { label: "Paid", value: s?.paid ?? "—" },
                { label: "No-shows", value: s?.noShows ?? "—" },
              ].map((t) => (
                <div key={t.label}>
                  <p className="text-lg font-bold">{t.value}</p>
                  <p className="text-[11px] text-gray-400">{t.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 border-t border-gray-100 pt-2 text-[11px] text-gray-400">
              Bookings today: {s?.total ?? "…"} · Waiting: {s?.waiting ?? "…"}
            </p>
          </div>

          {/* Arrivals forecast */}
          <ForecastRailCard centreId={centreId} />
        </div>
      </div>
    </div>
  );
}
