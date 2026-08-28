"use client";
import { useCallback, useEffect, useState } from "react";
import { STATUS_LABEL, STATUS_BADGE, inr } from "@/lib/status-ui";
import { STATUS_ORDER } from "@/lib/status";

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

  const s = data?.summary;
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold">{centreName}</h1>
          <p className="text-sm text-gray-400">
            Today&apos;s queue · {today} · avg service {avgServiceMinutes} min/farmer · refreshes every 10 s
          </p>
        </div>
        <button
          onClick={callNext}
          disabled={busyId !== null || !data || s?.waiting === 0}
          className="rounded-xl bg-green-700 px-5 py-2.5 font-semibold text-white shadow disabled:opacity-40"
        >
          {busyId === "next" ? "Calling…" : "📣 Call next token"}
        </button>
      </div>

      {/* Summary tiles */}
      <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-7">
        {[
          { label: "Now serving", value: s?.nowServing ? `#${s.nowServing}` : "—" },
          { label: "Waiting", value: s?.waiting ?? "…" },
          { label: "Bookings today", value: s?.total ?? "…" },
          { label: "Paid", value: s?.paid ?? "…" },
          { label: "No-shows", value: s?.noShows ?? "…" },
          { label: "Avg wait today (measured)", value: s?.avgWaitMin != null ? `${s.avgWaitMin} min` : "—" },
          { label: "Service/farmer (measured)", value: s?.measuredServiceMin != null ? `${s.measuredServiceMin} min` : "—" },
        ].map((t) => (
          <div key={t.label} className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
            <p className="text-2xl font-black">{t.value}</p>
            <p className="mt-0.5 text-xs text-gray-400">{t.label}</p>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* Queue table */}
      <div className="mt-4 overflow-x-auto rounded-xl bg-white ring-1 ring-gray-100">
        <table className="w-full text-left text-sm">
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
                      b.status === "SERVING" ? "bg-violet-50/70" : terminal ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 font-black">#{b.tokenNumber}</td>
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
                          className="rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
                        >
                          {busyId === b.id ? "…" : (NEXT_LABEL[b.status] ?? "Advance")}
                        </button>
                      )}
                      {waiting && (
                        <button
                          onClick={() => advance(b.id, "NO_SHOW")}
                          disabled={busyId !== null}
                          className="ml-1.5 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 disabled:opacity-40"
                        >
                          No-show
                        </button>
                      )}
                      {b.status === "BOOKED" && (
                        <button
                          onClick={() => advance(b.id, "CANCELLED")}
                          disabled={busyId !== null}
                          className="ml-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-500 disabled:opacity-40"
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
    </div>
  );
}
