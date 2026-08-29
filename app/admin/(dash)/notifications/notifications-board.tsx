"use client";
import { useCallback, useEffect, useState } from "react";
import { IconSend } from "@/components/icons";
import { CARD, COMMIT_SM, H2_PAGE, NOTE, TABLE, TD, TH, THEAD, TOAST_OK, TR } from "@/lib/ui";

type Row = { id: number; channel: string; message: string; sentAt: string; farmer: { name: string; phone: string } };

export default function NotificationsBoard({ centreId }: { centreId: number }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/notifications?limit=150", { cache: "no-store" });
    if (res.ok) setRows((await res.json()).rows);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  async function sendReminders() {
    setBusy(true);
    setToast("");
    const res = await fetch("/api/admin/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centreId }),
    });
    const data = await res.json();
    setBusy(false);
    setToast(res.ok ? `Sent ${data.sent} reminder${data.sent === 1 ? "" : "s"} for ${data.date}` : (data.error ?? "Failed"));
    load();
  }

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className={H2_PAGE}>Notification log</h1>
          <p className={NOTE}>Every SMS the platform has sent (mock gateway) · refreshes every 10 s</p>
        </div>
        <button
          onClick={sendReminders}
          disabled={busy}
          className={COMMIT_SM}
        >
          <IconSend size={16} /> {busy ? "Sending…" : "Send tomorrow's reminders"}
        </button>
      </div>
      {toast && <p className={TOAST_OK}>{toast}</p>}

      <div className={`mt-4 overflow-x-auto ${CARD}`}>
        <table className={TABLE}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>Time</th>
              <th className={TH}>To</th>
              <th className={TH}>Channel</th>
              <th className={TH}>Message</th>
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-[15px] text-[#A0A3A8]">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-[15px] text-[#A0A3A8]">No messages sent yet.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={`${TR} align-top`}>
                  <td className={`${TD} whitespace-nowrap text-[13px] text-[#A0A3A8]`}>
                    {new Date(r.sentAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    <span className="font-medium text-[#111111]">{r.farmer.name}</span>
                    <span className="block text-[13px] text-[#A0A3A8]">{r.farmer.phone}</span>
                  </td>
                  <td className={TD}>
                    <span className="inline-block rounded-full bg-[#F4F4F5] px-2.5 py-1 text-[12px] font-bold text-[#6B7280]">{r.channel}</span>
                  </td>
                  <td className={`${TD} text-[#6B7280]`}>{r.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
