// Booking status machine (design session):
// BOOKED → ARRIVED → SERVING → WEIGHED → PROCURED → PAYMENT_INITIATED → PAID
//    ↘ NO_SHOW (from BOOKED/ARRIVED)   ↘ CANCELLED (from BOOKED, admin-only)
export const STATUS_ORDER = [
  "BOOKED",
  "ARRIVED",
  "SERVING",
  "WEIGHED",
  "PROCURED",
  "PAYMENT_INITIATED",
  "PAID",
] as const;

export type PipelineStatus = (typeof STATUS_ORDER)[number];
export type BookingStatus = PipelineStatus | "NO_SHOW" | "CANCELLED";

/** Statuses that count as "waiting in the queue". */
export const WAITING: readonly BookingStatus[] = ["BOOKED", "ARRIVED"];

export function isPipeline(s: string): s is PipelineStatus {
  return (STATUS_ORDER as readonly string[]).includes(s);
}

export function pipelineIndex(s: string): number {
  return (STATUS_ORDER as readonly string[]).indexOf(s);
}

/** The next pipeline status after `s`, or null if terminal/at the end. */
export function nextStatus(s: string): PipelineStatus | null {
  const i = pipelineIndex(s);
  if (i < 0 || i >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[i + 1];
}
