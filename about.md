# About this project

**MSP Procurement Slot Booking & Queue Management**
SIH 2026 · Problem Statement 26032 · Ministry of Consumer Affairs, Food & Public Distribution

---

## 1. The problem

Every harvest season, farmers take their grain to a government procurement
centre to sell it at the Minimum Support Price (MSP). Today that trip works
like this:

- The farmer loads his tractor and reaches the centre early in the morning.
- There is **no booking system**. Whoever comes first, gets served first.
- He stands in a line for **hours**, sometimes the whole day, with no idea when
  his turn will come.
- If the centre fills up, he is sent home and has to come back another day.
- After his grain is weighed, he has **no way to know** what happened next —
  was it procured? was the payment started? did the money reach him?
- The centre staff also suffer: some days 200 farmers show up, other days 40.
  They cannot plan the day.

In short: **too much waiting, zero visibility, and no way to plan.**

---

## 2. How we solved it

We replaced the physical line with a **booked slot and a digital token**.

The idea is simple: *the farmer should wait at home, not in a queue.*

1. **Book before you go.** The farmer opens the app, picks a centre, a date, and
   a 3-hour time window. He sees how full each window already is. He books in
   under a minute.
2. **Get a token.** The moment he books, he gets a token number — the same
   "parchi" (paper slip) he is used to, but on his phone. It also shows the
   money he should expect (his quantity × the real MSP rate).
3. **Watch the queue live.** The app shows *now serving #14*, *you are 3 people
   away*, *about 24 minutes*. The screen refreshes every 10 seconds. He leaves
   home only when his turn is close.
4. **Get an SMS at every step.** Booked → arrived → being served → weighed →
   procured → payment started → paid. Every single step sends a message.
5. **Staff get a control screen.** The centre operator presses "Call next
   token", moves people through the steps, marks no-shows, and changes how many
   farmers each window can take.

The result: the farmer knows *when* he will be served and *what happens next*,
from his phone.

---

## 3. Tech stack

| Layer | What we used | Why |
|---|---|---|
| Web app | **Next.js 15** (App Router) + **React 19** + **TypeScript** | One codebase gives us the farmer's mobile site, the staff dashboard, and the APIs |
| Styling | **Tailwind CSS v4** | Fast, consistent design; big text and big buttons for low-literacy users |
| Database | **SQLite** via **Prisma ORM** | Runs offline on one laptop. The schema is written so it moves to PostgreSQL with no code change |
| Language | **Custom i18n** (`lib/i18n.ts`) | English + Hindi from one dictionary file, no extra library |
| SMS | **Mock notification log** (Twilio behind a flag) | Judges can *see* every SMS on screen; real sending is one env variable away |
| Testing | **Vitest** (18 tests) | Tests sit on the service layer, where the real logic lives |
| Fonts | Noto Sans + Noto Sans Devanagari (bundled) | Hindi renders correctly with no internet |

No cloud account, no paid service, no internet needed. `npm run demo:reset &&
npm run dev` and the whole system is running.

---

## 4. System architecture

```
                    FARMER (Android phone)              STAFF (desktop)
                            │                                 │
                    ┌───────┴───────┐                 ┌───────┴────────┐
                    │  Mobile web   │                 │ Admin dashboard│
                    │  /  /book     │                 │ /admin         │
                    │  /bookings/:id│                 │ queue · slots  │
                    └───────┬───────┘                 └───────┬────────┘
                            │  polls every 10s                │
        ════════════════════╪═════════════════════════════════╪═══════════
                            ▼                                 ▼
        ┌──────────────────────────────────────────────────────────────┐
        │                 NEXT.JS 15  (App Router)                     │
        │                                                              │
        │   middleware.ts ── guards every /admin and /api/admin route  │
        │                                                              │
        │   API routes                                                 │
        │   /api/auth/otp      /api/slots       /api/admin/queue       │
        │   /api/bookings      /api/centres     /api/admin/call-next   │
        │   /api/bookings/:id                   /api/admin/slots       │
        │                                       /api/admin/reminders   │
        └───────────────────────────┬──────────────────────────────────┘
                                    ▼
        ┌──────────────────────────────────────────────────────────────┐
        │        SERVICE LAYER  ·  lib/services/   (all the logic)     │
        │                                                              │
        │  auth.ts      OTP + registration folded into one step        │
        │  booking.ts   bookSlot() — one atomic transaction            │
        │  queue.ts     position · now-serving · ETA · wait metrics    │
        │  pipeline.ts  advanceStatus() · callNext() · 3-away alerts   │
        │  slots.ts     window capacity rules                          │
        │  reminders.ts T-1 day reminder blast                         │
        │  notify.ts    ◄── the single SMS chokepoint                  │
        └───────────────────────────┬──────────────────────────────────┘
                                    ▼
        ┌──────────────────────────────────────────────────────────────┐
        │              PRISMA ORM  →  SQLite  (Postgres-portable)      │
        │                                                              │
        │  Farmer ─┬─ Booking ─┬─ BookingEvent   (audit trail)         │
        │          │           └─ Slot ─ Centre                        │
        │          └─ NotificationLog            (every SMS ever sent) │
        │                        CropRate        (real MSP rates)      │
        └──────────────────────────────────────────────────────────────┘
                                    │
                                    ▼  only if SEND_REAL_SMS=true
                            ┌───────────────┐
                            │  Twilio SMS   │
                            └───────────────┘
```

**Three design decisions worth knowing:**

1. **Everything goes through the service layer.** The web pages never touch the
   database directly. So a future WhatsApp bot can call `bookSlot()` and
   `getQueueStatus()` directly — no rewrite needed.
2. **Polling, not WebSockets.** The tracker asks the server every 10 seconds.
   That is fresh enough for a physical queue, it survives weak rural network,
   and it keeps the server stateless.
3. **One SMS chokepoint.** Every message in the whole system goes through
   `notify()`. Change one function and all messages switch from mock to real,
   or from SMS to WhatsApp.

---

## 5. Core modules

| Module | What it does |
|---|---|
| **Auth** (`lib/services/auth.ts`) | Phone + OTP login. If the phone is new, registration (name, village, language) happens in the same flow — no separate signup screen. |
| **Booking** (`lib/services/booking.ts`) | Creates a booking in **one database transaction**: checks the window still has space, gives the next token number for that centre and day, calculates the payable amount from the real MSP rate, records the event, and sends the confirmation SMS. A unique constraint on `(centre, date, token)` stops two farmers ever getting the same token. |
| **Queue** (`lib/services/queue.ts`) | The maths of waiting. `position` = how many waiting tokens are ahead of you. `nowServing` = the token at the counter. `ETA` = position × the centre's average service time. It also measures the *real* average wait from event timestamps. |
| **Pipeline** (`lib/services/pipeline.ts`) | The status machine. It refuses illegal jumps, writes an event row for every change, generates the payment reference, frees the seat when a booking is cancelled, and fires the "3 tokens away" alert. |
| **Slots** (`lib/services/slots.ts`) | Creates the three daily windows (9–12, 12–3, 3–6) and lets staff change capacity — but never below what is already booked. |
| **Reminders** (`lib/services/reminders.ts`) | One-click SMS blast to everyone booked for tomorrow. |
| **Notify** (`lib/services/notify.ts`) | Writes every message to `NotificationLog` (visible in the admin panel) and optionally relays it to Twilio. |
| **Dates** (`lib/dates.ts`) | All dates are pinned to **IST**, stored as `"YYYY-MM-DD"` strings, so "today" is correct no matter what timezone the laptop is in. |
| **i18n** (`lib/i18n.ts`) | One dictionary, English and Hindi, one `t()` function. |

### The status machine

```
BOOKED → ARRIVED → SERVING → WEIGHED → PROCURED → PAYMENT_INITIATED → PAID
   │         │
   └─────────┴──→ NO_SHOW
   │
   └──→ CANCELLED (staff only)
```

Every arrow writes one `BookingEvent` row **and** sends one SMS. That is why
the farmer's phone and the audit trail can never disagree.

---

## 6. Features for the farmer

- **Login with just a phone number.** OTP on SMS. No password, no email, no
  Aadhaar. If the number is new, he types his name and village once and he is in.
- **Choose Hindi or English** on the very first screen. Hindi is offered first.
- **Book a slot in under 60 seconds.** Centre → date (next 7 days) → time window
  → crop → quantity. Each window shows how full it is, so he can pick a quiet one.
- **A token slip on the phone.** Big token number, date, centre, window, and the
  amount he should be paid — designed to look like the paper parchi he knows.
- **Live queue tracker.** *Now serving #14 · you are 3 away · about 24 minutes.*
  Refreshes by itself every 10 seconds.
- **SMS at every step** — booking confirmed, reminder the day before, "get ready,
  you are 3 tokens away", "it's your turn", weighed, procured, payment started,
  payment credited (with reference number).
- **Payment visibility.** He sees his amount from the moment he books —
  quantity × the actual CCEA-notified MSP for that crop — and later the payment
  reference number.
- **Built for a cheap Android in the sun.** Text from 18px up, buttons at least
  56px tall, every icon has a word next to it, one main action per screen, works
  on a 360px-wide screen, one-handed.

## 7. Features for the centre staff (admin)

- **Secure admin area.** A single middleware guard protects every admin page and
  every admin API.
- **Centre selector.** One dashboard, switch between procurement centres.
- **Live queue board** for today: every token, who it belongs to, its status,
  and how long they have been waiting.
- **"Call next token"** — one button. It picks the earliest waiting token, sets
  it to SERVING, sends that farmer the "it's your turn" SMS, *and* sends the
  "3 tokens away" heads-up to the next three farmers automatically.
- **Advance status** through the pipeline with one click per step, all the way
  to PAID with a generated payment reference.
- **Mark no-show** for farmers who did not turn up.
- **Slot capacity editor.** Change how many farmers each window can take, for any
  date. The system blocks any value lower than the bookings already made.
- **Send tomorrow's reminders** — one click sends the T-1 SMS to everyone booked
  for the next day.
- **Notification log.** Every SMS the system ever sent, newest first. Nothing is
  hidden; judges and auditors can see the whole trail.
- **Measured impact numbers.** Average wait and real service time per farmer,
  calculated from actual event timestamps — not guessed.

---

## 8. What we deliberately left out of v1

WhatsApp/LLM assistant · voice and IVR · real payment rails (PFMS) · Aadhaar and
eKYC · native mobile apps · role-based staff permissions · farmer-side
cancellation.

These are not missing by accident. The service layer was built so each one plugs
in without touching the business logic — a WhatsApp bot calls the same
`bookSlot()` function the web page calls.
