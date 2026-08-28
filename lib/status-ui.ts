// Client-safe status presentation (no prisma imports).
// Chip colors from the approved mockup palette.
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

export const STATUS_BADGE: Record<BookingStatus, string> = {
  BOOKED: "bg-[#E6F1FB] text-[#0C447C]",
  ARRIVED: "bg-[#FAEEDA] text-[#633806]",
  SERVING: "bg-[#EEEDFE] text-[#3C3489] animate-pulse",
  WEIGHED: "bg-[#EEEDFE] text-[#3C3489]",
  PROCURED: "bg-[#DFF0EF] text-[#134E4A]",
  PAYMENT_INITIATED: "bg-[#EAF3DE] text-[#3F6212]",
  PAID: "bg-[#EAF3DE] text-[#27500A]",
  NO_SHOW: "bg-[#FCEBEB] text-[#791F1F]",
  CANCELLED: "bg-gray-200 text-gray-600",
};

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
