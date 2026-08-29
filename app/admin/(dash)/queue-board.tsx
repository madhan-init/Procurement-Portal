"use client";
import { useCallback, useEffect, useState } from "react";
import { STATUS_LABEL, STATUS_BADGE, inr } from "@/lib/status-ui";
import { STATUS_ORDER } from "@/lib/status";
import { IconMegaphone, IconSend } from "@/components/icons";
import {
  CARD,
  COMMIT_SM,
  COMMIT_XS,
  GHOST_SM,
  H2_PAGE,
  LINK_XS,
  NOTE,
  TABLE,
  TD,
  TH,
  THEAD,
  TOAST_ERR,
  TOAST_OK,
  TR,
} from "@/lib/ui";

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
  today,
}: {
  centreId: number;
  centreName: string;
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
          <h1 className={H2_PAGE}>{centreName}</h1>
          <p className={NOTE}>
            Today · {todayLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={sendReminders}
            disabled={remBusy}
            className={GHOST_SM}
          >
            <IconSend size={16} /> {remBusy ? "Sending…" : "Send tomorrow's reminders"}
          </button>
          <button
            onClick={callNext}
            disabled={busyId !== null || !data || s?.waiting === 0}
            className={COMMIT_SM}
          >
            <IconMegaphone size={18} /> {busyId === "next" ? "Calling…" : "Call next"}
          </button>
        </div>
      </div>

      {remToast && <p className={TOAST_OK}>{remToast}</p>}
      {error && <p className={TOAST_ERR}>{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        {/* Queue table */}
        <div className={`self-start overflow-x-auto ${CARD}`}>
          <table className={TABLE}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Token</th>
                <th className={TH}>Farmer</th>
                <th className={TH}>Window</th>
                <th className={TH}>Crop</th>
                <th className={`${TH} text-right`}>Qty (qtl)</th>
                <th className={`${TH} text-right`}>Amount</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!data ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[15px] text-[#A0A3A8]">
                    Loading queue…
                  </td>
                </tr>
              ) : data.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[15px] text-[#A0A3A8]">
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
                      className={`${TR} ${
                        b.status === "SERVING" ? "bg-[#FFF6F2]" : terminal ? "opacity-45" : ""
                      }`}
                    >
                      <td className={`${TD} font-heading text-[17px] font-extrabold tracking-[-0.02em] text-[#111111]`}>
                        #{b.tokenNumber}
                      </td>
                      <td className={TD}>
                        <span className="font-medium text-[#111111]">{b.farmer.name}</span>
                        <span className="block text-[13px] text-[#A0A3A8]">
                          {b.farmer.village} · {b.farmer.phone}
                        </span>
                      </td>
                      <td className={`${TD} text-[#6B7280]`}>
                        {b.slot.windowStart}–{b.slot.windowEnd}
                      </td>
                      <td className={TD}>{b.crop}</td>
                      <td className={`${TD} text-right tabular-nums`}>{b.quantityQuintals}</td>
                      <td className={`${TD} text-right tabular-nums`}>{inr(b.amountPayable)}</td>
                      <td className={TD}>
                        <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold ${STATUS_BADGE[b.status as keyof typeof STATUS_BADGE]}`}>
                          {STATUS_LABEL[b.status as keyof typeof STATUS_LABEL]}
                        </span>
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="flex flex-col items-end gap-1.5">
                          {(STATUS_ORDER as readonly string[]).includes(b.status) && b.status !== "PAID" && (
                            <button onClick={() => advance(b.id)} disabled={busyId !== null} className={COMMIT_XS}>
                              {busyId === b.id ? "…" : (NEXT_LABEL[b.status] ?? "Advance")}
                            </button>
                          )}
                          {(waiting || b.status === "BOOKED") && (
                            <div className="flex items-center gap-3">
                              {waiting && (
                                <button
                                  onClick={() => advance(b.id, "NO_SHOW")}
                                  disabled={busyId !== null}
                                  className={`${LINK_XS} text-[#E5484D]`}
                                >
                                  No-show
                                </button>
                              )}
                              {b.status === "BOOKED" && (
                                <button
                                  onClick={() => advance(b.id, "CANCELLED")}
                                  disabled={busyId !== null}
                                  className={`${LINK_XS} text-[#A0A3A8]`}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
          <div className="rounded-xl border border-[#FB8A61]/40 bg-[#FFF6F2] p-5">
            <p className="text-[12px] font-bold uppercase tracking-[0.11em] text-[#C2521E]">Now serving</p>
            {s?.nowServing ? (
              <p className="mt-1.5 font-heading text-[56px] font-extrabold leading-none tracking-[-0.04em] text-[#111111]">
                #{s.nowServing}
              </p>
            ) : (
              <p className="mt-2 text-[17px] font-medium text-[#C2521E]">Nobody at the counter</p>
            )}
            <p className="mt-2.5 text-[15px] text-[#6B7280]">
              Next {nextToken !== null ? `#${nextToken}` : "—"} · {s?.waiting ?? 0} in queue
            </p>
          </div>

          {/* Today */}
          <div className={`p-5 ${CARD}`}>
            <p className="text-[15px] font-semibold text-[#111111]">Today</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { label: "Avg wait (measured)", value: s?.avgWaitMin != null ? `${s.avgWaitMin} min` : "—" },
                { label: "Service/farmer", value: s?.measuredServiceMin != null ? `${s.measuredServiceMin} min` : "—" },
                { label: "Paid", value: s?.paid ?? "—" },
                { label: "No-shows", value: s?.noShows ?? "—" },
              ].map((t) => (
                <div key={t.label}>
                  <p className="text-[22px] font-bold tracking-[-0.02em] text-[#111111]">{t.value}</p>
                  <p className="mt-0.5 text-[13px] text-[#A0A3A8]">{t.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-[#EFEFF1] pt-3 text-[13px] text-[#A0A3A8]">
              Bookings today: {s?.total ?? "…"} · Waiting: {s?.waiting ?? "…"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
