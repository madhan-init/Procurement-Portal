// Client-safe status presentation (no prisma imports).
export const STATUS_LABEL: Record<string, string> = {
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

export const STATUS_BADGE: Record<string, string> = {
  BOOKED: "bg-sky-100 text-sky-800",
  ARRIVED: "bg-amber-100 text-amber-800",
  SERVING: "bg-violet-100 text-violet-800 animate-pulse",
  WEIGHED: "bg-cyan-100 text-cyan-800",
  PROCURED: "bg-teal-100 text-teal-800",
  PAYMENT_INITIATED: "bg-lime-100 text-lime-800",
  PAID: "bg-green-100 text-green-800",
  NO_SHOW: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-200 text-gray-600",
};

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
