// SMS templates (English-only in v1 — explicit scope decision).
// Used by the live notify() triggers AND the seed, so demo data matches reality.
import type { BookingStatus } from "./status";

export const messages = {
  otp: (otp: string) => `Your MSP Procurement login OTP is ${otp}.`,
  bookingConfirmed: (token: number, date: string, centre: string) =>
    `Booking confirmed: token #${token} on ${date} at ${centre}. Please arrive 15 min before your window.`,
  reminder: (token: number, date: string, centre: string) =>
    `Reminder: your procurement slot is tomorrow (${date}) at ${centre}, token #${token}.`,
  threeAway: (token: number, centre: string) =>
    `Get ready: you are within 3 tokens of being served at ${centre} (your token #${token}).`,
};

export function statusMessage(
  status: BookingStatus,
  ctx: { token: number; centre: string; amount?: number; ref?: string | null },
): string {
  const rs = ctx.amount != null ? `Rs ${Math.round(ctx.amount).toLocaleString("en-IN")}` : "";
  switch (status) {
    case "ARRIVED":
      return `Arrival recorded at ${ctx.centre}. Your token is #${ctx.token}.`;
    case "SERVING":
      return `It's your turn! Token #${ctx.token} — please come to the weighing counter at ${ctx.centre}.`;
    case "WEIGHED":
      return `Your produce has been weighed at ${ctx.centre} (token #${ctx.token}).`;
    case "PROCURED":
      return `Your produce has been procured at ${ctx.centre} (token #${ctx.token}).`;
    case "PAYMENT_INITIATED":
      return `Payment of ${rs} initiated for token #${ctx.token}${ctx.ref ? ` (ref ${ctx.ref})` : ""}.`;
    case "PAID":
      return `Payment of ${rs} credited for token #${ctx.token}${ctx.ref ? ` (ref ${ctx.ref})` : ""}. Thank you!`;
    case "NO_SHOW":
      return `You were marked absent for token #${ctx.token} at ${ctx.centre}. Please book a new slot.`;
    case "CANCELLED":
      return `Your booking (token #${ctx.token}) at ${ctx.centre} was cancelled.`;
    default:
      return `Your booking (token #${ctx.token}) is now ${status}.`;
  }
}
