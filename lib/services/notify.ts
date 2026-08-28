import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../db";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * The single notification chokepoint (v2's WhatsApp agent plugs in here).
 * Writes NotificationLog + console; optionally relays real SMS via Twilio.
 */
export async function notify(farmerId: number, message: string, db: Db = prisma) {
  const entry = await db.notificationLog.create({ data: { farmerId, message, channel: "SMS" } });
  const farmer = await db.farmer.findUnique({ where: { id: farmerId }, select: { phone: true } });
  console.log(`[SMS→${farmer?.phone ?? farmerId}] ${message}`);

  const { SEND_REAL_SMS, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM } = process.env;
  if (SEND_REAL_SMS === "true" && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_SMS_FROM && farmer) {
    // Fire-and-forget; the mock log above is the source of truth for the demo.
    fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: farmer.phone, From: TWILIO_SMS_FROM, Body: message }),
    }).catch((e) => console.error("Twilio send failed:", e));
  }
  return entry;
}
