# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: smallholder farmers in western Uttar Pradesh (Rampur, Shahjahanpur, Hardoi districts) selling paddy, wheat, and coarse grains to government procurement centres at MSP. Scene (confirmed): self-serve on a budget Android phone, often one-handed, outdoors, patchy signal, frequently a first smartphone; minimal typing tolerance, numbers over text. Many prefer Hindi; literacy varies widely.
Secondary: procurement-centre staff (desktop admin dashboard) managing the day's queue, statuses, slot capacity, and notifications.
Evaluators: SIH 2026 internal-hackathon judges watching a 5-minute demo + Q&A on a laptop (phone emulation for the farmer app).

## Product Purpose

Replace unmanaged physical queues at MSP procurement centres with booked slots, live tokens, and status tracking (SIH PS 26032, Dept. of Consumer Affairs). A farmer books a slot and gets a token; the app shows a live queue position and ETA so waiting happens at home, not in line; every procurement step through payment is tracked and notified. Success: a farmer books in under 60 seconds; status changes reach the tracker within 10 seconds; the whole demo runs offline on one laptop.

## Positioning

Not a generic booking form: a queue-management system with a per-centre arrival forecast (RandomForest vs seasonal-naive baseline, honest MAE shown on-screen) that converts predictions into applied slot capacity. The service layer is deliberately agent-ready for a v2 WhatsApp assistant.

## Operating Context

- Demo ritual: `npm run demo:reset` reseeds relative to "now" minutes before presenting; demo opens logged in as protagonist Ramesh Kumar (+919876500001, village Rampur, hi).
- Mock boundaries: OTP fixed to 123456 when MOCK_MODE=true (the on-screen demo hint chip must stay visible for judges); SMS mocked into a visible NotificationLog; Twilio optional behind SEND_REAL_SMS.
- All dates are IST calendar dates; queue math: position = waiting tokens below mine, ETA = position × avgServiceMinutes.

## Capabilities and Constraints

- Farmer: phone+OTP login with registration folded in (unknown phone → OTP → name/village/language), slot booking (7-day window, 3 windows/day, % full, capacity-enforced), parchi token, live tracker (10s polling — no WebSockets), payment amount = declared qty × real MSP rate.
- Admin: hardcoded admin/admin123, centre selector, call-next (SERVING status), advance-status pipeline, no-show, slot capacity editor, T-1 reminder blast, notification log, forecast screen with apply-suggested-capacity.
- Stack fixed: Next.js 15 App Router + TS + Tailwind v4, Prisma/SQLite (Postgres-portable), recharts, FastAPI + scikit-learn forecast service, Vitest at the service seam. No new runtime dependencies without cause.
- i18n: EN/HI via one dictionary (lib/i18n.ts, t()); farmer-facing strings must go through t(). SMS templates are English-only in v1 (explicit scope decision).
- Out of scope v1: WhatsApp/LLM agent, real payments, Aadhaar/eKYC, native apps, RBAC, email, Telugu, farmer-side cancellation.

## Brand Commitments

- Product name (confirmed, binding): **Procurement Portal** (hi: खरीद पोर्टल). Prior names: Mandi Mitra, Agri-Portal.
- Visual world (user-pinned via approved mockup, binding): leaf green #3B6D11 primary; wheat token-slip family #FAEEDA/#854F0B/#412402; page #F6F7F2; white cards; 12px radius; status-chip palette as implemented in lib/status-ui.ts; Noto Sans + Noto Sans Devanagari (local, committed); signature element: the paper "parchi" token slip with dashed tear-line (components/token-slip.tsx).
- Tone: friendly-official; plain language; no hype.

## Evidence on Hand

- Real CCEA-notified MSP rates seeded (KMS 2026-27 paddy ₹2,441/₹2,461, maize ₹2,410, bajra ₹2,900; RMS 2026-27 wheat ₹2,585).
- Live seeded demo data: 3 UP centres, 40 farmers, ~46 bookings across all statuses, 180-day arrival history + training CSV.
- Forecast honesty: RF MAE vs seasonal-naive baseline on a 14-day holdout, displayed in-product. Training data is synthetic (generator stands in for FCI/mandi data; CSV is the swap point) — never claim it is real.
- Do not fabricate: government endorsements, real farmer testimonials, live SMS delivery, production deployments.

## Product Principles

1. The queue is the product: every farmer surface answers "when am I served and what happens next" before anything else.
2. Waiting happens at home: design for glanceable status over engagement.
3. Honest numbers: measured wait times, baseline-compared forecasts, real MSP rates — nothing invented on screen.
4. Demo-critical paths must be boring-reliable: offline, reseedable, and legible from the back of a room.
5. Keep the service seam clean: every farmer action is a function a future WhatsApp agent can call.

## Accessibility & Inclusion

Low-literacy floor (confirmed, durable): farmer surfaces use ≥18px body text, ≥56px touch targets, every icon paired with a text label, oversized numerals for tokens/amounts, and Hindi offered before English on first-visit screens. One primary action per screen. Works one-handed on small Androids (360px).
