# SIH 2026 — PS 26032: Farmer Procurement Slot Booking & Queue Management — Spec v2

**Status:** ready-for-agent · **Build budget:** 12 hours, solo · **Demo:** laptop, fully offline, 5-min + Q&A
**Supersedes** `SIH26032_PROJECT_SPEC_V1.md`. v1 remains the reference for anything not amended here; where they conflict, **v2 wins**. Synthesized from the design-grilling session of 2026-08-28.

---

## Problem Statement

Farmers selling produce to government procurement centres (Ministry of Consumer Affairs, Food & PD — DoCA, PS 26032) face three compounding problems:

1. **Long, unmanaged waiting** — they queue physically at the centre for hours with no way to know when they'll be served.
2. **No visibility into schedules** — they don't know which centre has capacity on which day, so arrivals bunch up and centres alternate between overcrowded and idle.
3. **Uncertainty after handover** — once produce is weighed, farmers have no way to track procurement or payment status; they make repeat trips just to ask.

The immediate context: an internal hackathon round in ~12 hours. The deliverable is a **working model** demonstrating the official PS's five expected capabilities — registration, slot booking, real-time queue management, SMS/app notifications, procurement & payment tracking — well enough to survive a 5-minute demo and a Q&A panel.

## Solution

One web platform, two surfaces plus one service, running fully offline on a laptop:

- **Farmer app (mobile-first web):** register/log in with phone + OTP, book a slot at a procurement centre for the next 7 days, receive a token number, watch the live queue (now serving / your position / ETA, refreshed every 10s), and track produce through a parcel-style status pipeline ending in a credited payment amount. EN/HI language toggle.
- **Admin dashboard (desktop web):** centre staff pick their centre, see today's queue, call the next token, advance bookings through the pipeline, mark no-shows, manage slot capacity, blast T-1 reminders, and audit the notification log.
- **Forecast service (Python):** predicts daily farmer arrivals per centre from 180 days of history, reports its error against a seasonal-naive baseline on screen, and suggests slot capacity that the admin can apply with one click.

All SMS is mocked into a visible `NotificationLog` (Twilio optional behind a flag). No WebSockets — 10s polling.

## User Stories

**Farmer — access**
1. As a farmer, I want to register with only my phone number and an OTP, so that I can join without paperwork or documents.
2. As a new farmer, I want to give my name, village, and preferred language once at first login, so that the app is personalized from then on.
3. As a returning farmer, I want to log in with phone + OTP, so that my bookings follow me on any device.
4. As a Hindi-speaking farmer, I want to switch the whole app to Hindi, so that I can use it in my own language.

**Farmer — booking**
5. As a farmer, I want to see the list of procurement centres with their districts, so that I can sell where travel is shortest.
6. As a farmer, I want to pick a date within the next 7 days, so that I can plan around my harvest.
7. As a farmer, I want to see how full each time window is (% full) before choosing, so that I can pick a less crowded slot.
8. As a farmer, I want to declare my crop (from the procured-crop list) and quantity in quintals, so that the centre can plan and my payment can be estimated.
9. As a farmer, I want a token number immediately on confirmation, so that I have proof of my place in the queue.
10. As a farmer, I want to be prevented from booking into a full window, so that I never travel to a centre that cannot serve me.
11. As a farmer, I want an SMS confirming my token, date, and centre, so that I hold the details even with no app open.

**Farmer — queue day**
12. As a farmer, I want my home screen to lead with my next booking (token, date, centre, live position, ETA), so that one glance tells me when to leave.
13. As a farmer, I want a live strip — "Now serving #12 · You are #18 · Est. wait ~48 min" — so that I can wait at home instead of standing in line.
14. As a farmer, I want the queue view to refresh itself every 10 seconds, so that I never have to reload.
15. As a farmer, I want an SMS when I am 3 tokens away, so that I can walk to the counter at the right moment — and only one such SMS, not a repeat on every queue movement.
16. As a farmer, I want an SMS reminder the day before my slot, so that I don't forget to come.

**Farmer — procurement & payment**
17. As a farmer, I want a parcel-style status pipeline (booked → arrived → weighed → procured → payment initiated → paid), so that I always know exactly where my produce is.
18. As a farmer, I want an SMS at every status change, so that I stay informed even after leaving the centre.
19. As a farmer, I want to see my expected payment (quantity × MSP rate) from the moment I book, so that I know what I'm owed before I hand anything over.
20. As a farmer, I want a payment reference number and an SMS when payment is credited, so that I can verify the money and chase it if needed.

**Centre staff — queue operations**
21. As centre staff, I want a dashboard login, so that queue controls are limited to staff.
22. As centre staff, I want to select which centre I am operating, so that I see only my own queue.
23. As centre staff, I want today's queue as a table (token, farmer, crop, quantity, status), so that I can run the yard from one screen.
24. As centre staff, I want a "Call next" button that marks the earliest waiting token as being served, so that farmers are served strictly in token order.
25. As centre staff, I want a per-row "Advance status" action, so that each step of weighing → procurement → payment is one click.
26. As centre staff, I want "Mark no-show", so that absent farmers stop holding up the queue.
27. As centre staff, I want every status change to automatically notify the farmer and append to the booking's history, so that record-keeping and communication cost me nothing.
28. As centre staff, I want to set slot capacity per centre, date, and window, so that intake matches staffing.
29. As centre staff, I want a "Send tomorrow's reminders" button, so that everyone booked for tomorrow gets their T-1 SMS in one action.
30. As centre staff, I want a notification log of every message sent, so that I can prove farmers were informed.

**Centre planner — forecasting**
31. As a centre planner, I want a 7-day forecast of arrivals charted against current bookings per centre, so that I can staff and stock ahead of demand.
32. As a centre planner, I want a suggested capacity derived from the forecast, applied to my slot windows with one click, so that capacity tracks predicted demand without manual arithmetic.
33. As a centre planner, I want the model's error shown against a naive baseline, so that I can judge how much to trust the forecast.

**Record & demo**
34. As an auditing official, I want a full immutable event history per booking, so that any dispute can be settled from the record.
35. As the demo presenter, I want a single destructive reset command that reseeds everything relative to *now*, so that the demo always shows a live "today".

## Implementation Decisions

### Stack (fixed)
- Next.js 14+ (App Router) + TypeScript + Tailwind; single repo; farmer and admin as route groups; backend as API route handlers.
- SQLite via Prisma; schema stays Postgres-portable. Because SQLite, **`Booking.status` is a `String` column + TypeScript union**, not a Prisma enum.
- recharts for the forecast chart.
- Forecast service: single-file FastAPI app, Python 3.11 via `uv venv --python 3.11` (uv 0.11.6 and Homebrew python3.11 verified present on the build machine; cp314 wheels also exist as fallback), scikit-learn + pandas.
- No WebSockets anywhere; clients poll every 10s.

### Status machine (from the grilling session — encodes the "Call next" decision)
```
BOOKED → ARRIVED → SERVING → WEIGHED → PROCURED → PAYMENT_INITIATED → PAID
   ↘ NO_SHOW (from BOOKED/ARRIVED, admin)      ↘ CANCELLED (from BOOKED, admin-only)
```
- `SERVING` is new vs v1: it is what "Call next" writes. The farmer tracker still renders **6 steps**, showing SERVING as a live sub-state of the "Arrived" step.
- Multiple simultaneous `SERVING` bookings are permitted (centres run multiple counters).
- `NO_SHOW` and `CANCELLED` are terminal. There is **no farmer-initiated cancel** in v2 scope.

### Queue mathematics (exact)
- `position` = count of bookings at same centre+date with status ∈ {BOOKED, ARRIVED} and lower tokenNumber.
- `nowServing` = highest token with status SERVING; if none, highest token with status ≥ WEIGHED; else 0.
- `etaMinutes` = position × centre.avgServiceMinutes.
- "Call next" = earliest token with status ∈ {BOOKED, ARRIVED} at the selected centre for today → SERVING.

### Data model
- Entities: Farmer, Centre, Slot, Booking, BookingEvent, ArrivalHistory, NotificationLog, **CropRate** (new).
- Booking **denormalizes `centreId` and `date`** (alongside `slotId`) so every queue query avoids the Slot join. Slot dates and "today" are **IST-fixed `YYYY-MM-DD` strings**, never UTC DateTimes — an evening demo must not show the wrong day.
- Booking carries `crop`, `quantityQuintals`, `ratePerQuintal`, `amountPayable`, `paymentRef`, and a **sent-once flag for the 3-tokens-away SMS**.
- `tokenNumber` is a per-centre-per-date sequence with a **unique constraint on (centreId, date, tokenNumber)**.
- Farmer.language is `"en" | "hi"` only (Telugu dropped from the model).

### Booking creation (single transaction)
Check `bookedCount < capacity` → increment `bookedCount` → assign `max(token)+1` for centre+date (unique constraint as race backstop) → compute `amountPayable = quantityQuintals × CropRate.ratePerQuintal` → append BookingEvent(BOOKED) → write confirmation notification. Overbooking is therefore enforced, not just displayed. CANCELLED decrements the slot's `bookedCount`; NO_SHOW does not.

### Payments
- Fixed list of ~5 procured crops seeded in `CropRate` with **real notified MSP rates, looked up at build time** (never written from memory).
- `amountPayable` is computed at booking from declared quantity. The v1-grilling decision to capture *accepted* quantity at WEIGHED is **dropped for the 12-hour build** — "Advance status" stays a one-click action at every step.
- `paymentRef` is a mock reference generated at PAYMENT_INITIATED; the tracker shows amount + reference at PAID.

### Notifications
- One clean function — `notify(farmerId, message)` — writes NotificationLog + console; v2's WhatsApp agent plugs in here. Templates are **English-only** (explicit user decision; the Hindi-UI/English-SMS gap is a stated v1 scope line for Q&A).
- Triggers: booking confirmed; T-1 reminder (admin button, targets tomorrow's BOOKED); "3 tokens away" evaluated after every status change at that centre+date for bookings with position ≤ 3, fired **once per booking** via the flag; every status change; payment credited (includes amount).
- If `SEND_REAL_SMS=true` + Twilio creds exist, also send real SMS. Default mock.

### Auth & guards
- Farmer: phone + OTP (fixed `123456` when `MOCK_MODE=true`), cookie session. **Registration is folded into login**: unknown phone → OTP → short name/village/language form → Home.
- Admin: hardcoded `admin / admin123`, cookie session, **centre selector** after login.
- Booking detail is session-guarded (a farmer reads only their own bookings); all admin APIs sit behind one middleware guard.

### Forecasting
- Seed generates 180 days of ArrivalHistory per centre with v1 §9's formula (base × dow_factor × season_factor + noise) and exports the training CSV.
- Service trains `RandomForestRegressor(n_estimators=200)` on features `day_of_week`, `week_index`, `rolling_mean_7`, `centre_id`; holdout = last 14 days.
- It computes **two MAEs: the model and a seasonal-naive baseline (same weekday, previous week)** — printed to console *and* returned so the dashboard renders a "Model quality" card (both MAEs + % improvement). This is the honest answer to "you trained on data you generated."
- `GET /forecast?centre_id&days` → `[{date, predicted_arrivals, suggested_capacity}]`, `suggested_capacity = ceil(predicted × 1.15)`; plus `/health`. Next.js proxies via `FORECAST_SERVICE_URL`.
- **"Apply suggested capacity"** splits the daily figure across that date's three windows **proportionally to their existing capacities**, remainder to the largest window — the parts always sum exactly to the suggestion — and never sets a window below its current `bookedCount`.

### API contract
`POST /api/auth/otp` (request + verify; carries registration fields for unknown phones) · `GET /api/centres` · `GET /api/slots?centreId&date` · `POST /api/bookings` · `GET /api/bookings/:id` (guarded; detail + queue position + events) · `POST /api/admin/login` · `POST /api/admin/bookings/:id/status` · `POST /api/admin/call-next` · `POST /api/admin/slots` · `POST /api/admin/reminders` · `GET /api/admin/notifications` · `GET /api/forecast?centreId` (proxy).
All booking/queue/payment reads and writes live behind service functions (`bookSlot`, `getQueueStatus`, `advanceStatus`, `callNext`, …); API routes are thin wrappers. This service layer is the v2 WhatsApp-agent integration surface and the test seam.

### Seed & demo
- 3 centres in **Uttar Pradesh**, real districts, capacities 60/90/45, avgServiceMinutes 4–6; protagonist **Ramesh Kumar, +919876500001, village Rampur, language "hi"**; 40 farmers; slots today ± 3 days, windows 9–12 / 12–15 / 15–18; ~25 bookings today across all statuses; 180-day ArrivalHistory + CSV.
- `npm run demo:reset`: destructive, always relative to *now*, run five minutes before presenting.
- The demo opens **logged in as Ramesh** (populated home, live queue); registration is rehearsed as the first on-request item.
- i18n: one dictionary file, EN/HI, no library, minimal key set covering the demo path.

## Testing Decisions

- **The seam is the TypeScript service layer** — the same functions v1 §10 already mandates for the v2 agent (`bookSlot`, `getQueueStatus`, `advanceStatus`, `callNext`, capacity-apply, reminders, `notify`). One seam, already required by the design; no new seams introduced. Tests call these functions directly against a disposable SQLite database per run — no HTTP layer, no UI driver.
- A good test asserts **external behavior only**: given inputs, assert return values and observable records (Booking, BookingEvent, NotificationLog rows) — never internal helpers or call order.
- What gets automated inside the 12 hours (Vitest; greenfield repo, no prior art):
  1. Token sequencing and overbooking under concurrent `bookSlot` calls (the transaction + unique-constraint claim).
  2. Queue math — position / nowServing / ETA across mixed-status fixtures, including the SERVING cases.
  3. `advanceStatus` appends exactly one BookingEvent and one NotificationLog entry per transition.
  4. 3-tokens-away fires once and only once per booking.
  5. Capacity split: parts sum exactly to the suggestion; no window set below its bookedCount.
- The forecast service is verified by response-shape smoke check plus the `suggested = ceil(pred × 1.15)` rule; its statistical quality is *displayed*, not asserted.
- Everything visual is accepted manually via v1 §14's checklist, which is the rehearsal script for hour 11–12.

## Out of Scope

WhatsApp/LLM agent (v2); real payment rails; Aadhaar/eKYC; blockchain; native mobile apps; real SMS by default (Twilio stays behind a flag); multi-role RBAC; email; WebSockets; **Telugu**; **farmer-initiated cancellation** (CANCELLED is admin-only); **accepted-quantity entry at weighing** (payment uses declared quantity); **bilingual SMS templates**; congestion-impact metrics tile (*stretch only, hour ≥ 9*); predicted-vs-actual holdout chart; real Agmarknet training data; presentation deck; hosted deployment / shareable URL.

## Further Notes

**12-hour build order (overruns eat polish, never the core or the rehearsal hour):**

| Hours | Build | Exit test |
|---|---|---|
| 0–1 | Scaffold, git init, Prisma schema frozen, seed + CSV, uv venv | `demo:reset` runs clean |
| 1–4 | Service layer + farmer app: login/register → book → token → tracker | Book on a phone screen in <60s |
| 4–7 | Admin: queue, call next, advance, no-show, slots, log, reminders | Advance → tracker updates ≤10s + log entry |
| 7–9 | Forecast service + screen + apply capacity + model card | Chart renders for 3 centres; apply works |
| 9–11 | EN/HI, empty states, README (+ ~10 judge-questions section), stretch tile | Whole demo runs offline |
| 11–12 | Presenter rehearsal on a fresh reset | User drives the demo unaided |

**Environment:** `DATABASE_URL=file:./dev.db`, `FORECAST_SERVICE_URL=http://localhost:8000`, `MOCK_MODE=true`, `SEND_REAL_SMS=false`, Twilio vars optional.

**Known honest limitations (for Q&A):** training data is synthetic (the baseline comparison and the CSV swap-point are the answer); SMS is English-only in v1; single admin role; SQLite is the demo store with a Postgres-portable schema.
