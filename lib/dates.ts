// All calendar logic is pinned to IST. "Today" must be the IST day even when
// the demo laptop's clock/UTC disagrees in the evening.
const IST_TZ = "Asia/Kolkata";
const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** IST calendar date of an instant, as "YYYY-MM-DD". */
export function istDateOf(d: Date): string {
  return fmt.format(d);
}

/** IST "today" (+/- offset days), as "YYYY-MM-DD". */
export function istToday(offsetDays = 0): string {
  return istDateOf(new Date(Date.now() + offsetDays * 86_400_000));
}

/** The instant of `HH:MM` IST on the given IST date. */
export function atIST(dateStr: string, hm: string): Date {
  return new Date(`${dateStr}T${hm}:00+05:30`);
}

/** Add days to an IST date string. */
export function addDays(dateStr: string, days: number): string {
  return istDateOf(new Date(atIST(dateStr, "12:00").getTime() + days * 86_400_000));
}

/** Day of week (0 = Sunday) of an IST date string. */
export function dayOfWeek(dateStr: string): number {
  // 12:00 IST is 06:30 UTC of the same calendar date, so UTC day == IST day.
  return atIST(dateStr, "12:00").getUTCDay();
}

/** An IST date string as short human text, e.g. "Fri, 29 Aug". */
export function prettyDate(dateStr: string): string {
  return atIST(dateStr, "12:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
