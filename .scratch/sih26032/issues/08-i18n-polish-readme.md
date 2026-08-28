# 08 — EN/HI, polish, README, judge-questions

**What to build:** The demo-hardening pass. EN/HI toggle backed by one dictionary file (no library) covering the whole farmer demo path, persisted choice. Empty states: no bookings, no slots for a date, empty notification log. README: exact cold-start commands (reset, dev server, forecast service) plus a ~10-bullet "questions judges will ask" section with the honest answers (synthetic training data + baseline + CSV swap-point; English-only SMS as a v1 scope line; SQLite demo store with Postgres-portable schema; what stops double-booking; offline/scale story). Finish with a full v1 §14 acceptance pass on a fresh demo:reset. Stretch — only if ahead of schedule: admin impact tile (avg wait today from BookingEvent timestamps, tokens served, no-show rate).

**Blocked by:** 04 — Booking tracker + live queue · 06 — Slots, reminders, notification log · 07 — Forecast service + screen + apply capacity.

**Status:** ready-for-agent

- [x] Toggle flips every demo-path farmer screen EN ↔ HI and the choice sticks
- [x] All four §14 acceptance checks pass on a fresh reset, fully offline
- [x] README gets a cold machine to a running demo without help
- [x] Judge-questions section covers training data, SMS realism, double-booking, scale
