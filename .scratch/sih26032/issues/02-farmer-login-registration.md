# 02 — Farmer login + registration

**What to build:** A farmer opens the app on a phone, enters their phone number, receives the mock OTP (`123456` when MOCK_MODE=true), and gets a cookie session. An **unknown** phone is walked through a short one-screen profile (name, village, language EN/HI) and lands on Home — registration folded into login, PS bullet #1. A **known** phone lands on Home directly. Home leads with the next-booking card, or an empty state with a "Book a slot" button.

**Blocked by:** 01 — Scaffold, schema freeze, seed, demo:reset.

**Status:** ready-for-agent

- [x] New phone → OTP → profile form → Home; Farmer row created with chosen language
- [x] Seeded phone (Ramesh) → OTP → Home directly, no profile form
- [x] Wrong OTP is rejected; session survives a page reload
- [x] Mobile-first layout (usable at 390px width)
