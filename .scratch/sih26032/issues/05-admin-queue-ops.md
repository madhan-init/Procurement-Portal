# 05 — Admin queue operations

**What to build:** Centre staff log in (admin/admin123, cookie session), pick their centre, and run today's queue from one table (token, farmer, crop, quantity, status). **Call next** marks the earliest BOOKED/ARRIVED token SERVING (multiple SERVING allowed — multi-counter centres). Per-row **Advance status** walks SERVING → WEIGHED → PROCURED → PAYMENT_INITIATED → PAID; a mock paymentRef is generated at PAYMENT_INITIATED and the PAID SMS includes the amount. **Mark no-show** available from BOOKED/ARRIVED. Every transition appends exactly one BookingEvent and one NotificationLog entry. After any change at a centre+date, farmers at position ≤ 3 get the "3 tokens away" SMS — once per booking ever, via the sent-once flag. All admin APIs sit behind one auth guard. With ticket 04 live, this completes demo acceptance #2.

**Blocked by:** 03 — Book a slot end-to-end.

**Status:** ready-for-agent

- [x] Call next marks the earliest waiting token SERVING
- [x] Advance walks the full pipeline; paymentRef at PAYMENT_INITIATED; PAID SMS includes amount
- [x] Unauthenticated calls to admin APIs are rejected
- [x] Admin advance → farmer tracker updates within 10s and a log entry appears (acceptance #2, with 04)
- [x] Vitest: exactly one BookingEvent + one NotificationLog per transition; 3-away SMS fires once and only once per booking
