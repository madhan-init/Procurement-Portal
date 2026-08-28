# MSP Procurement Slot Booking & Queue Management

**SIH 2026 · PS 26032 · Ministry of Consumer Affairs, Food & PD (DoCA)**

Farmers at government procurement centres wait in unmanaged queues with no visibility into schedules, procurement, or payment. This platform gives them **phone-OTP registration, slot booking with live capacity, a token, a live queue tracker (now-serving / position / ETA), SMS notifications at every step, and payment tracking at MSP rates** — plus an **admin dashboard** for centre staff and an **ML arrival-forecasting service** that suggests slot capacity.

Everything runs **fully offline on one laptop**: Next.js + SQLite + a local FastAPI model. SMS is mocked into a visible notification log (Twilio slots in behind a flag).

## Quick start (3 terminals)

```bash
# 0. one-time
npm install
cd forecast && uv venv --python 3.11 .venv && VIRTUAL_ENV=.venv uv pip install -r requirements.txt && cd ..

# 1. reset + seed the world relative to *now* (run again any time; also 5 min before demoing)
npm run demo:reset

# 2. web app  → http://localhost:3000  (farmer)  ·  http://localhost:3000/admin  (staff)
npm run dev

# 3. forecast service → http://localhost:8000 (trains at startup, prints MAE)
npm run forecast
```

**Demo logins** — farmer: `9876500001` + OTP `123456` (Ramesh Kumar, Hindi UI) · any new number registers in-flow · admin: `admin / admin123`.

## The 5-minute demo

1. **Phone**: log in as Ramesh → Home leads with today's booking, token **#18**, live position + ETA.
2. **Book** (≤60 s): centre → date → window (% full) → Paddy 20 qtl → token + expected payment at MSP.
3. **Desktop**: admin → **Call next token** → farmer at position ≤3 automatically gets the "3 tokens away" SMS (Notification log).
4. **Advance status** on Ramesh's token → his phone updates within 10 s, step by step to **PAID** with amount + payment ref.
5. **Forecast** tab: 7-day arrivals per centre, RandomForest vs seasonal-naive baseline (23% better on 14-day holdout), **Apply suggested capacity** → slot windows update proportionally, sum exact.

## Architecture

- **Next.js 15 (App Router, TS, Tailwind)** — farmer mobile-web + admin dashboard + API routes. No WebSockets; 10 s polling by design (works on weak rural connections and demo laptops alike).
- **SQLite via Prisma** — schema is Postgres-portable (status is a `String` + TS union — SQLite has no enums). All queue/booking/payment logic lives in **`lib/services/*`** — v2's WhatsApp agent wraps these functions directly.
- **FastAPI + scikit-learn** (`forecast/main.py`) — RandomForest over `day_of_week, week_index, rolling_mean_7, centre_id`; 180 days seeded history per centre; last-14-day holdout; reports MAE vs a **seasonal-naive baseline**.
- **Status machine**: `BOOKED → ARRIVED → SERVING → WEIGHED → PROCURED → PAYMENT_INITIATED → PAID` (+ `NO_SHOW`, `CANCELLED`). Every transition appends a `BookingEvent` and writes a `NotificationLog` SMS.
- **IST-pinned dates** (`YYYY-MM-DD` strings) so "today" is correct whatever the laptop clock says.
- **Booking is one transaction**: capacity check, per-centre-per-day token (unique constraint as race backstop), MSP amount, event, SMS. Tested under parallel load.

```bash
npm test           # 22 vitest cases at the service seam (throwaway SQLite per file)
npm run typecheck
```

## Questions judges will ask (and our answers)

1. **Where does the training data come from?** Seeded — 180 days per centre from a documented generator (day-of-week × harvest-season × noise). That's why we report the model **against a seasonal-naive baseline** (same weekday last week): ±4.3 vs ±5.6 farmers/day, 23% better, on a 14-day holdout. The CSV is the swap point: drop in real FCI/mandi gate data and retrain, nothing else changes.
2. **Are the SMS real?** Mocked by design (`notify()` writes the log you saw). Set `SEND_REAL_SMS=true` + Twilio creds and the same function sends real SMS. One chokepoint, so v2's WhatsApp agent plugs in without touching business logic.
3. **What stops double-booking / overselling a window?** A single DB transaction: capacity re-checked, `bookedCount` incremented, token = max+1 with a `(centre, date, token)` unique constraint as backstop. A concurrency test fires 9 parallel bookings at a 5-seat window: exactly 5 succeed, tokens 1–5.
4. **What if the farmer has no smartphone?** Booking is assisted-friendly (a relative, CSC kiosk, or centre staff can book by phone number); every update also lands as SMS, which works on feature phones. Voice/IVR is on the v2 roadmap.
5. **How is the payment amount computed?** Declared quantity × the CCEA-notified MSP for the crop (seeded: paddy ₹2,441/₹2,461, wheat ₹2,585, maize ₹2,410, bajra ₹2,900 — KMS/RMS 2026-27). v1 tracks status + amount; actual disbursal rails (PFMS) are out of scope.
6. **Why polling, not WebSockets?** 10 s freshness is enough for a physical queue, survives flaky rural networks, keeps the stack stateless, and demos identically offline.
7. **Does it reduce waiting?** The dashboard measures it from real event timestamps (avg wait, measured service time per farmer). Slots + forecast-driven capacity smooth arrivals — that's the mechanism; the seeded queue shows ~47 min avg wait, the point of comparison for unmanaged walk-ins.
8. **How does it scale beyond 3 centres?** Schema is Postgres-portable; services are stateless; centres are rows, not code. The forecast model already trains across centres (centre_id is a feature).
9. **Aadhaar / eKYC?** Deliberately out of v1 — phone-OTP is the lowest-friction on-ramp. eKYC is an add-on at registration, not a redesign.
10. **Why English SMS when the UI is Hindi?** v1 scope decision; the template layer is one function, so localized templates are a drop-in (v2 WhatsApp replies in the farmer's language).

## Environment

| var | default | |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db?connection_limit=1&socket_timeout=30` | SQLite |
| `FORECAST_SERVICE_URL` | `http://localhost:8000` | FastAPI proxy target |
| `MOCK_MODE` | `true` | OTP fixed to 123456 |
| `SEND_REAL_SMS` | `false` | Twilio relay off |
| `TWILIO_*` | — | only for real SMS |

## v2 roadmap (kept out of v1 on purpose)

WhatsApp LLM agent over the same service functions (`bookSlot`, `getQueueStatus`, …) replying in the farmer's language · voice/IVR · photo grain-quality pre-check · eKYC · PFMS payment rails.
