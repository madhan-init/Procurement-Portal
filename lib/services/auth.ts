import type { PrismaClient, Farmer } from "@prisma/client";
import { prisma } from "../db";
import { messages } from "../messages";

const MOCK_OTP = "123456";

/** Request an OTP for a phone. Mock mode logs it; reports whether the farmer is new. */
export async function requestOtp(phone: string, db: PrismaClient = prisma) {
  const farmer = await db.farmer.findUnique({ where: { phone } });
  console.log(`[SMS→${phone}] ${messages.otp(MOCK_OTP)}`);
  return { isNewFarmer: !farmer };
}

export type VerifyResult =
  | { ok: true; farmer: Farmer; isNew: boolean }
  | { ok: false; needsProfile: true }
  | { ok: false; error: string };

/** Verify OTP; registration folds in here — an unknown phone + profile fields creates the Farmer. */
export async function verifyOtp(
  input: { phone: string; otp: string; name?: string; village?: string; language?: string },
  db: PrismaClient = prisma,
): Promise<VerifyResult> {
  if (input.otp !== MOCK_OTP) return { ok: false, error: "Invalid OTP" };

  const existing = await db.farmer.findUnique({ where: { phone: input.phone } });
  if (existing) return { ok: true, farmer: existing, isNew: false };

  const name = input.name?.trim();
  const village = input.village?.trim();
  if (!name || !village) return { ok: false, needsProfile: true };

  const farmer = await db.farmer.create({
    data: {
      phone: input.phone,
      name,
      village,
      language: input.language === "hi" ? "hi" : "en",
    },
  });
  return { ok: true, farmer, isNew: true };
}
