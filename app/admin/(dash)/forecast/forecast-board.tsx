"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = {
  date: string;
  predicted_arrivals: number;
  suggested_capacity: number;
  booked: number;
  currentCapacity: number | null;
};
type Metrics = {
  model_mae: number;
  baseline_mae: number;
  improvement_pct: number;
  holdout_days: number;
  trained_rows: number;
  baseline: string;
};
type Data = { today: string; metrics: Metrics | null; rows: Row[] };

const short = (d: string) =>
  new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });

export default function ForecastBoard({ centreId }: { centreId: number }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busyDate, setBusyDate] = useState<string | "all" | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch(`/api/forecast?centreId=${centreId}&days=7`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load forecast");
      setData(null);
      return;
    }
    setData(json);
  }, [centreId]);

  useEffect(() => {
    load();
  }, [load]);

  async function apply(date: string, suggested: number) {
    setBusyDate(date);
    setToast("");
    const res = await fetch("/api/admin/forecast/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centreId, date, suggested }),
    });
    setBusyDate(null);
    if (res.ok) {
      setToast(`Capacity for ${date} set to ${suggested} across its windows`);
      load();
    } else {
      setToast((await res.json()).error ?? "Apply failed");
    }
  }

  async function applyAll() {
    if (!data) return;
    setBusyDate("all");
    setToast("");
    for (const r of data.rows) {
      await fetch("/api/admin/forecast/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centreId, date: r.date, suggested: r.suggested_capacity }),
      });
    }
    setBusyDate(null);
    setToast("Suggested capacity applied to all 7 days");
    load();
  }

  const m = data?.metrics;
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold">Arrival forecast — next 7 days</h1>
          <p className="text-sm text-gray-400">
            RandomForest over 180 days of arrival history · suggested capacity = forecast × 1.15 buffer
          </p>
        </div>
        <button
          onClick={applyAll}
          disabled={!data || busyDate !== null}
          className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busyDate === "all" ? "Applying…" : "⚡ Apply suggested capacity (all days)"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100">{error}</div>
      )}
      {toast && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}

      {/* Model quality card */}
      {m && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          <div className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
            <p className="text-2xl font-black">±{m.model_mae}</p>
            <p className="mt-0.5 text-xs text-gray-400">RandomForest MAE (farmers/day)</p>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
            <p className="text-2xl font-black text-gray-400">±{m.baseline_mae}</p>
            <p className="mt-0.5 text-xs text-gray-400">Seasonal-naive baseline MAE</p>
          </div>
          <div className="rounded-xl bg-green-50 p-4 ring-1 ring-green-100">
            <p className="text-2xl font-black text-green-700">{m.improvement_pct}%</p>
            <p className="mt-0.5 text-xs text-green-700/70">better than baseline</p>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
            <p className="text-2xl font-black">{m.holdout_days}d</p>
            <p className="mt-0.5 text-xs text-gray-400">holdout · {m.trained_rows} training rows</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {data && (
        <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-gray-100">
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <ComposedChart data={data.rows.map((r) => ({ ...r, label: short(r.date) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="predicted_arrivals" name="Forecast arrivals" fill="#15803d" radius={[4, 4, 0, 0]} />
                <Bar dataKey="booked" name="Booked so far" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                <Line
                  dataKey="suggested_capacity"
                  name="Suggested capacity"
                  stroke="#d97706"
                  strokeDasharray="6 3"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Apply table */}
      {data && (
        <div className="mt-4 overflow-hidden rounded-xl bg-white ring-1 ring-gray-100">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Forecast</th>
                <th className="px-4 py-3 text-right">Suggested capacity</th>
                <th className="px-4 py-3 text-right">Current capacity</th>
                <th className="px-4 py-3 text-right">Booked</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.date} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium">
                    {short(r.date)} <span className="ml-1 text-xs text-gray-400">{r.date}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">{r.predicted_arrivals}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-amber-700">{r.suggested_capacity}</td>
                  <td className="px-4 py-2.5 text-right">{r.currentCapacity ?? <span className="text-gray-300">not published</span>}</td>
                  <td className="px-4 py-2.5 text-right">{r.booked}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => apply(r.date, r.suggested_capacity)}
                      disabled={busyDate !== null}
                      className="rounded-lg bg-gray-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-30"
                    >
                      {busyDate === r.date ? "…" : "Apply"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
