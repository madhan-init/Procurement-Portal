"use client";
import { useCallback, useEffect, useState } from "react";
import { prettyDate } from "@/lib/dates";
import {
  CARD,
  CHIP,
  COMMIT_XS,
  FIELD_SM,
  H2_PAGE,
  NOTE,
  PICK_OFF,
  PICK_ON,
  TABLE,
  TD,
  TH,
  THEAD,
  TOAST_ERR,
  TOAST_OK,
  TR,
} from "@/lib/ui";

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
      <h1 className={H2_PAGE}>Slot capacity</h1>
      <p className={NOTE}>Windows are created automatically; capacity can never go below seats already booked.</p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {dates.map((d, i) => (
          <button
            key={d}
            onClick={() => setDate(d)}
            className={`${CHIP} ${date === d ? PICK_ON : PICK_OFF}`}
          >
            {i === 0 ? "Today" : i === 1 ? "Tomorrow" : prettyDate(d)}
          </button>
        ))}
      </div>

      {msg && (
        <p className={msg.kind === "ok" ? TOAST_OK : TOAST_ERR}>
          {msg.text}
        </p>
      )}

      <div className={`mt-4 overflow-hidden ${CARD}`}>
        <table className={TABLE}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>Window</th>
              <th className={`${TH} text-right`}>Booked</th>
              <th className={`${TH} text-right`}>Capacity</th>
              <th className={`${TH} text-right`}>Fill</th>
              <th className={`${TH} text-right`}></th>
            </tr>
          </thead>
          <tbody>
            {!slots ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-[15px] text-[#A0A3A8]">Loading…</td></tr>
            ) : (
              slots.map((s) => {
                const pct = s.capacity ? Math.min(100, Math.round((s.bookedCount / s.capacity) * 100)) : 0;
                return (
                  <tr key={s.id} className={TR}>
                    <td className={`${TD} font-medium text-[#111111]`}>{s.windowStart}–{s.windowEnd}</td>
                    <td className={`${TD} text-right tabular-nums`}>{s.bookedCount}</td>
                    <td className={`${TD} text-right`}>
                      <input
                        type="number"
                        min={s.bookedCount}
                        className={`${FIELD_SM} w-24 text-right tabular-nums`}
                        value={draft[s.id] ?? ""}
                        onChange={(e) => setDraft({ ...draft, [s.id]: e.target.value })}
                      />
                    </td>
                    <td className={`${TD} text-right tabular-nums text-[#A0A3A8]`}>{pct}%</td>
                    <td className={`${TD} text-right`}>
                      <button
                        onClick={() => save(s.id)}
                        disabled={busy || Number(draft[s.id]) === s.capacity}
                        className={COMMIT_XS}
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
