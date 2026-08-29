// Client-safe status presentation (no prisma imports).
import type { BookingStatus } from "./status";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  BOOKED: "Booked",
  ARRIVED: "Arrived",
  SERVING: "Being served",
  WEIGHED: "Weighed",
  PROCURED: "Procured",
  PAYMENT_INITIATED: "Payment initiated",
  PAID: "Paid",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
};

// Chips in the coral/ink palette. Five tiers, not nine hues: waiting is
// quiet, in-progress is coral (the live one), settled is ink, trouble is
// danger. Read down a column of 30 rows and the state is obvious.
export const STATUS_BADGE: Record<BookingStatus, string> = {
  BOOKED: "bg-[#F4F4F5] text-[#6B7280]",
  ARRIVED: "bg-[#F4F4F5] text-[#111111]",
  SERVING: "bg-[#FFF1EB] text-[#C2521E]",
  WEIGHED: "bg-[#EFEFF1] text-[#111111]",
  PROCURED: "bg-[#EFEFF1] text-[#111111]",
  PAYMENT_INITIATED: "bg-[#EFEFF1] text-[#111111]",
  PAID: "bg-[#111111] text-white",
  NO_SHOW: "bg-[#FEF1F1] text-[#B4383C]",
  CANCELLED: "bg-[#F4F4F5] text-[#A0A3A8]",
};

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
