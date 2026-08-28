"use client";
import { useCallback, useEffect, useState } from "react";

type SlotRow = { id: number; windowStart: string; windowEnd: string; capacity: number; bookedCount: number };

export default function SlotsEditor({ centreId, dates }: { centreId: number; dates: string[] }) {
  const [date, setDate] = useState(dates[0]);
  const [slots, setSlots] = useState<SlotRow[] | null>(null);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setSlots(null);
    // Ensure the three standard windows exist, then read them.
    await fetch("/api/admin/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centreId, date }),
    });
    const res = await fetch(`/api/slots?centreId=${centreId}&date=${date}`);
    const rows = await res.json();
    setSlots(rows);
    setDraft(Object.fromEntries(rows.map((r: SlotRow) => [r.id, String(r.capacity)])));
  }, [centreId, date]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(slotId: number) {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, capacity: Number(draft[slotId]) }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg({ kind: "err", text: data.error ?? "Failed to save" });
    } else {
      setMsg({ kind: "ok", text: "Capacity updated" });
      load();
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Slot capacity</h1>
      <p className="text-sm text-gray-400">Windows are created automatically; capacity can never go below seats already booked.</p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {dates.map((d, i) => (
          <button
            key={d}
            onClick={() => setDate(d)}
            className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-medium ${
              date === d ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            {i === 0 ? "Today" : i === 1 ? "Tomorrow" : d}
          </button>
        ))}
      </div>

      {msg && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.kind === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {msg.text}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-xl bg-white ring-1 ring-gray-100">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3 text-right">Booked</th>
              <th className="px-4 py-3 text-right">Capacity</th>
              <th className="px-4 py-3 text-right">Fill</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {!slots ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : (
              slots.map((s) => {
                const pct = s.capacity ? Math.min(100, Math.round((s.bookedCount / s.capacity) * 100)) : 0;
                return (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium">{s.windowStart}–{s.windowEnd}</td>
                    <td className="px-4 py-3 text-right">{s.bookedCount}</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min={s.bookedCount}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right"
                        value={draft[s.id] ?? ""}
                        onChange={(e) => setDraft({ ...draft, [s.id]: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{pct}%</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => save(s.id)}
                        disabled={busy || Number(draft[s.id]) === s.capacity}
                        className="rounded-lg bg-gray-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-30"
                      >
                        Save
                      </button>
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
