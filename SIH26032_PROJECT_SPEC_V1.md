# SIH 2026 — PS 26032: Farmer Procurement Slot Booking & Queue Management (v1)

Build spec for a coding agent. Follow it exactly — do not add features beyond this document.
**v1 scope note:** the WhatsApp AI agent is deferred to v2 (§15). Do NOT build it now.

---

## 1. Official problem statement (sih.gov.in, PS ID 26032)

- **Title:** Farmers often face long waiting times, lack of information regarding procurement schedules, and uncertainty about procurement status.
- **Org:** Ministry of Consumer Affairs, Food & Public Distribution — Dept. of Consumer Affairs (DoCA)
- **Category/Theme:** Software / Smart Automation
- **Expected solution — a platform that:**
  1. Enables farmer registration and slot booking
  2. Provides real-time queue management
  3. Sends SMS/app notifications
  4. Tracks procurement and payment status
  5. Reduces congestion and waiting time at procurement centres

## 2. What we are building (v1)

One web platform, two surfaces + one service:

1. **Farmer app** (mobile-first web) — register, book a slot at a procurement centre, get a token, watch the live queue, track procurement → payment status.
2. **Admin dashboard** (desktop web) — centre staff manage slots, call the next token, advance booking statuses, view arrival forecasts.
3. **Forecasting service** — predicts daily farmer arrivals per centre and suggests slot capacity (the AI feature of v1).

## 3. Scope rules (hard)

**Build:** everything in this doc.
**Do NOT build:** WhatsApp/LLM chat agent (v2), real payment integration, Aadhaar/eKYC, blockchain, native mobile apps, real SMS gateway (log messages instead), multi-role RBAC, email. No WebSockets — poll every 10s.

## 4. Tech stack (fixed — do not substitute)

- **App:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS. Single repo, `/app` routes for farmer + admin, `/app/api` for backend.
- **DB:** SQLite via Prisma (schema must stay Postgres-portable).
- **Charts:** recharts.
- **Forecast service:** Python 3.11, FastAPI + scikit-learn + pandas. Single file `forecast/main.py`.
- **Auth:** farmer = phone + OTP (mock OTP fixed to `123456` when `MOCK_MODE=true`); admin = hardcoded `admin / admin123`, cookie session.

## 5. Data model (Prisma)

```
Farmer        id, phone (unique), name, village, language ("en"|"hi"|"te"), createdAt
Centre        id, name, district, dailyCapacity, avgServiceMinutes, openTime, closeTime
Slot          id, centreId, date, windowStart, windowEnd, capacity, bookedCount
Booking       id, farmerId, slotId, crop, quantityQuintals, tokenNumber,
              status, createdAt, updatedAt
BookingEvent  id, bookingId, status, at            // full status history
ArrivalHistory centreId, date, arrivals            // training data for forecasting
NotificationLog id, farmerId, channel ("SMS"), message, sentAt
```

- `Booking.status` enum: `BOOKED → ARRIVED → WEIGHED → PROCURED → PAYMENT_INITIATED → PAID`, plus `NO_SHOW`, `CANCELLED`.
- `tokenNumber`: integer sequence per centre per date (first booking of the day = 1).

## 6. Farmer app (mobile-first)

Screens:

1. **Login** — phone → OTP → session.
2. **Home** — card with next booking (token #, date, centre, live queue position, ETA) + "Book a slot" button.
3. **Book slot** — pick centre → date (next 7 days) → time window showing `% full` → enter crop + quantity → confirm → success screen with token number.
4. **Booking tracker** — 6-step status pipeline (like parcel tracking) + live strip: "Now serving #12 · You are #18 · Est. wait ~48 min". Poll every 10s.
5. **Language toggle** EN/HI — simple i18n dictionary file, no library.

Queue logic (implement exactly):
- `position` = count of bookings at same centre+date with status in (BOOKED, ARRIVED) and tokenNumber < mine.
- `nowServing` = highest tokenNumber at centre+date with status beyond ARRIVED (or 0).
- `etaMinutes = position × centre.avgServiceMinutes`.

## 7. Admin dashboard

Screens:

1. **Login.**
2. **Today's queue** — table of today's bookings (token, farmer, crop, qty, status). Buttons: "Call next" (marks earliest BOOKED/ARRIVED token as being served), per-row "Advance status", "Mark no-show".
3. **Slots** — set capacity per centre/date/window.
4. **Forecast** — see §9.
5. **Notification log** — table of all sent messages (the proof that notifications work).
6. **"Send tomorrow's reminders" button** — fires the T-1 reminder to everyone booked tomorrow (manual button instead of cron — simpler to demo).

Every status change must: append a `BookingEvent` and write a `NotificationLog` entry.

## 8. Notifications (mocked SMS)

`notify(farmerId, message)` writes to `NotificationLog` + console. Keep this a single clean function — v2 plugs WhatsApp into it. Triggers:
- Booking confirmed (token, date, centre)
- T-1 reminder (via admin button)
- "You are 3 tokens away" — checked after every status change at that centre/date
- Each status change ("Your produce has been weighed…")
- Payment credited

If `SEND_REAL_SMS=true` and Twilio creds exist, also send real SMS. Default: mock.

## 9. AI feature — Arrival forecasting

**Training data (seeded, 180 days per centre):**
```
arrivals = round(base × dow_factor × season_factor + noise)
base: per centre (e.g. 60, 90, 45)
dow_factor: Sun .1, Mon 1.3, Tue 1.2, Wed 1.0, Thu .9, Fri .8, Sat .5
season_factor: gaussian peak mid-window (harvest), 0.4 → 1.6
noise: N(0, base×0.08)
```
Seed script writes `ArrivalHistory` rows AND exports `forecast/data/arrivals.csv`.

**Service (`forecast/main.py`):**
- On startup: load CSV, build features — `day_of_week`, `week_index`, `rolling_mean_7`, `centre_id` — train `RandomForestRegressor(n_estimators=200)`. Print MAE on a last-14-day holdout to console (judges will ask).
- `GET /forecast?centre_id=1&days=7` → `[{date, predicted_arrivals, suggested_capacity}]` where `suggested_capacity = ceil(predicted_arrivals × 1.15)`.
- `GET /health`.

**Dashboard integration:** Forecast screen shows a 7-day bar/line chart (forecast vs. current booked count) per centre + suggested capacity, with an "Apply suggested capacity" button that updates the slots. Next.js proxies via `FORECAST_SERVICE_URL`.

## 10. API routes (Next.js)

```
POST /api/auth/otp            request + verify (mock)
GET  /api/centres             list
GET  /api/slots?centreId&date
POST /api/bookings            create (assigns token)
GET  /api/bookings/:id        detail + queue position + events
POST /api/admin/bookings/:id/status
POST /api/admin/call-next
POST /api/admin/slots
POST /api/admin/reminders     T-1 reminder blast
GET  /api/admin/notifications
GET  /api/forecast?centreId   proxy → FastAPI
```

Keep booking/queue/payment reads and writes behind clean service functions (e.g. `bookSlot()`, `getQueueStatus()`) — v2's agent tools will wrap these directly.

## 11. Seed data (`prisma/seed.ts`)

- 3 centres (different districts, capacities 60/90/45, avgServiceMinutes 4–6).
- 40 farmers; protagonist: **Ramesh Kumar, +919876500001, village Rampur, language "hi"**.
- Slots for today ± 3 days, 3 windows/day (9–12, 12–15, 15–18).
- ~25 bookings for today spread across all statuses so the queue looks alive.
- 180 days of ArrivalHistory per centre (formula above) + CSV export.

## 12. Environment

```
DATABASE_URL=file:./dev.db
FORECAST_SERVICE_URL=http://localhost:8000
MOCK_MODE=true
SEND_REAL_SMS=false
TWILIO_ACCOUNT_SID= (optional, real SMS only)
TWILIO_AUTH_TOKEN=  (optional)
TWILIO_SMS_FROM=    (optional)
```

## 13. Build order

1. Prisma schema + seed (incl. arrivals CSV)
2. Farmer flows: login → book → tracker with live queue polling
3. Admin: queue ops + status pipeline + notification log
4. Forecast service + dashboard forecast screen
5. Polish: EN/HI strings, empty states, README with run commands

## 14. Demo acceptance checklist (all must pass)

- [ ] Farmer books a slot on a phone screen in under 60 seconds and sees a token.
- [ ] Admin clicks "Advance status" → farmer's tracker updates within 10s and a notification appears in the log.
- [ ] Forecast chart renders for all 3 centres; "Apply suggested capacity" updates slots.
- [ ] `npm run dev` + `uvicorn main:app` + seeded DB = whole demo works fully offline.

## 15. v2 roadmap (do NOT build in v1)

- **WhatsApp AI agent** — LLM tool-use agent over a webhook that wraps the same service functions (`bookSlot`, `getQueueStatus`, `getPaymentStatus`…), replying in the farmer's language. v1 only needs to keep `notify()` and the service layer clean so this drops in later.
- Voice/IVR access, photo-based grain quality pre-check.
