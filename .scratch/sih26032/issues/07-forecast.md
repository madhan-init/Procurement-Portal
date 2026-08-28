# 07 — Forecast service + screen + apply capacity

**What to build:** The AI slice, end to end. A single-file FastAPI service loads the arrivals CSV, trains RandomForestRegressor(n_estimators=200) on day_of_week / week_index / rolling_mean_7 / centre_id, holds out the last 14 days, and computes **two MAEs — the model and a seasonal-naive baseline (same weekday, previous week)** — printed to console and served. `GET /forecast?centre_id&days` returns date / predicted_arrivals / suggested_capacity = ceil(predicted × 1.15); plus `/health`. Next.js proxies it. The admin Forecast screen charts 7 days of forecast vs current booked per centre (recharts), shows a model-quality card (both MAEs + % improvement), and **Apply suggested capacity** splits the daily suggestion across that date's three windows proportionally to their existing capacities, remainder to the largest — parts sum exactly — never setting a window below its bookedCount. Demo acceptance #3.

**Blocked by:** 01 — Scaffold, schema freeze, seed, demo:reset · 05 — Admin queue operations.

**Status:** ready-for-agent

- [ ] Chart renders for all 3 centres (acceptance #3)
- [ ] Model-quality card shows RF MAE vs seasonal-naive MAE and % improvement
- [ ] Apply updates the three windows; parts sum exactly to the suggestion; clamp ≥ bookedCount holds (vitest on the split)
- [ ] Whole flow runs offline against the local service
