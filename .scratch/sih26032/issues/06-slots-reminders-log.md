# 06 — Slots, reminders, notification log

**What to build:** The remaining admin surfaces on the shell ticket 05 built. **Slots:** set capacity per centre/date/window; a window can never be set below its current bookedCount; edits show up in the farmer app's % full. **Send tomorrow's reminders:** one button fires the T-1 SMS to every booking with status BOOKED for tomorrow at the selected centre. **Notification log:** the proof-that-SMS-works screen — every message, newest first, with farmer, channel, message, time.

**Blocked by:** 05 — Admin queue operations.

**Status:** ready-for-agent

- [x] Capacity edits persist and change the farmer-side % full
- [x] Setting capacity below bookedCount is rejected
- [x] Reminder blast writes one log row per tomorrow-BOOKED booking, immediately visible in the log screen
- [x] Log renders farmer, channel "SMS", message, sent time
