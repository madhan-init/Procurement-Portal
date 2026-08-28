# 03 — Book a slot end-to-end

**What to build:** From Home, a logged-in farmer books: pick centre → pick a date in the next 7 days → pick one of three windows, each showing % full → pick crop (from the CropRate list) and quantity in quintals → confirm → success screen with the token number and expected payment (quantity × MSP rate). Creation is one transaction: capacity re-checked (full window rejected), bookedCount incremented, token assigned as max+1 for that centre+date with the unique constraint as race backstop, BookingEvent(BOOKED) appended, confirmation SMS written to NotificationLog. Home then shows the booking card. This is demo acceptance #1.

**Blocked by:** 02 — Farmer login + registration.

**Status:** ready-for-agent

- [x] A farmer books on a phone screen in under 60 seconds and sees a token (acceptance #1)
- [x] A full window is unpickable in the UI **and** rejected by the API
- [x] Confirmation notification row exists with token, date, centre
- [x] amountPayable computed and stored at booking time
- [x] Vitest at the service seam: concurrent bookings yield unique sequential tokens and never exceed capacity
