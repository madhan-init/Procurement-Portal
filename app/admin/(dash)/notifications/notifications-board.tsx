"use client";
import { useCallback, useEffect, useState } from "react";
import { IconSend } from "@/components/icons";

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
          <h1 className="text-xl font-bold">Notification log</h1>
          <p className="text-sm text-gray-400">Every SMS the platform has sent (mock gateway) · refreshes every 10 s</p>
        </div>
        <button
          onClick={sendReminders}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-leaf-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-leaf-700 disabled:opacity-40"
        >
          <IconSend size={16} /> {busy ? "Sending…" : "Send tomorrow's reminders"}
        </button>
      </div>
      {toast && <p className="mt-3 rounded-lg bg-leaf-100 px-3 py-2 text-sm text-leaf-800">{toast}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl bg-white ring-1 ring-gray-200/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Message</th>
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No messages sent yet.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-400">
                    {new Date(r.sentAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className="font-medium">{r.farmer.name}</span>
                    <span className="block text-xs text-gray-400">{r.farmer.phone}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-[#E6F1FB] px-2 py-0.5 text-xs font-medium text-[#0C447C]">{r.channel}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{r.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
