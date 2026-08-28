# 01 — Scaffold, schema freeze, seed, demo:reset

**What to build:** A bootable repo where one command resets the world to a live "today". The Next.js (App Router, TS, Tailwind) app starts; the Prisma/SQLite schema for every entity is frozen; the seed writes 3 Uttar Pradesh centres (real districts, capacities 60/90/45, avgServiceMinutes 4–6), 40 farmers with protagonist Ramesh Kumar (+919876500001, village Rampur, "hi"), slots today ± 3 days (9–12 / 12–15 / 15–18), ~25 bookings today spread across all statuses, 180 days of ArrivalHistory per centre plus the training CSV export, and CropRate rows with **real notified MSP rates looked up at build time** (never from memory). Python side: uv venv (python 3.11) with fastapi/uvicorn/scikit-learn/pandas resolves. Repo is git-initialized.

Status machine the schema must encode (from the design session — status is a String + TS union, not a Prisma enum, for SQLite):

```
BOOKED → ARRIVED → SERVING → WEIGHED → PROCURED → PAYMENT_INITIATED → PAID
   ↘ NO_SHOW (from BOOKED/ARRIVED)        ↘ CANCELLED (from BOOKED, admin-only)
```

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] `npm run demo:reset` destructively reseeds everything relative to *now* and exits clean
- [x] Schema encodes: SERVING; Booking denormalizes centreId + date (IST `YYYY-MM-DD` string), carries ratePerQuintal/amountPayable/paymentRef and the 3-away sent-once flag; unique (centreId, date, tokenNumber)
- [x] Seeded today-queue spans all statuses; arrivals CSV exists (3 centres × 180 days, v1 §9 formula)
- [x] CropRate holds ~5 procured crops with real MSP figures
- [x] `npm run dev` boots; uv venv resolves and `uvicorn` starts against a stub app
