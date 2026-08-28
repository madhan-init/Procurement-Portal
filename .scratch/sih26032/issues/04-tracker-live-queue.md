# 04 — Booking tracker + live queue

**What to build:** The parcel-style tracker for one booking: a 6-step pipeline (SERVING rendered as a live sub-state of "Arrived", so it reads as 6 steps while the data stays 7-state), plus the live strip — "Now serving #12 · You are #18 · Est. wait ~48 min" — refreshed by 10s polling, no reload. Queue math exactly as designed: position = count of BOOKED/ARRIVED at same centre+date with lower token; nowServing = the SERVING token, else highest ≥ WEIGHED, else 0; eta = position × avgServiceMinutes. The booking-detail read is session-guarded: a farmer can only read their own bookings. Demoable against the seeded 25-booking queue with no admin UI yet.

**Blocked by:** 03 — Book a slot end-to-end.

**Status:** ready-for-agent

- [x] Tracker shows correct position, now-serving, and ETA against the seeded queue
- [x] A status change in the DB is reflected on screen within 10s without reload
- [x] Requesting another farmer's booking id is denied
- [x] Vitest at the service seam: position/nowServing/ETA across mixed-status fixtures, including SERVING cases
