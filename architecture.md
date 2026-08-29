# System architecture

```mermaid
flowchart TD
    FARMER["Farmer<br/>phone"]
    STAFF["Centre staff<br/>desktop"]

    subgraph APP["Next.js 15 · TypeScript"]
        PAGES["Pages<br/>book · token · tracker · admin queue"]
        API["API routes<br/>+ admin auth guard"]
    end

    subgraph SVC["Service layer — lib/services"]
        LOGIC["auth · booking · queue<br/>pipeline · slots · reminders"]
        NOTIFY["notify — all SMS go through here"]
    end

    DB[("SQLite via Prisma<br/>Farmer · Centre · Slot · Booking<br/>BookingEvent · NotificationLog · CropRate")]
    SMS["Twilio SMS<br/>optional"]

    FARMER --> PAGES
    STAFF --> PAGES
    PAGES -->|"polls every 10 s"| API
    API --> LOGIC
    LOGIC --> DB
    LOGIC --> NOTIFY
    NOTIFY --> DB
    NOTIFY -.-> SMS
    NOTIFY -->|"status SMS"| FARMER
```

**How to read it:** the farmer books a slot and gets a token; his tracker asks
the server every 10 seconds for his position and ETA. Staff move tokens down the
pipeline `BOOKED → ARRIVED → SERVING → WEIGHED → PROCURED → PAYMENT_INITIATED →
PAID`. Every step writes an event row and sends one SMS. All logic lives in the
service layer, so a future WhatsApp bot calls the same functions the web pages do.
