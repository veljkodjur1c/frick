const numberFormat = new Intl.NumberFormat("sr-Latn-RS");

/** Serbian number format: 1240 -> "1.240". Use for points, HP and LP. */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

const relativeFormat = new Intl.RelativeTimeFormat("sr-Latn-RS", { numeric: "auto" });
const dateFormat = new Intl.DateTimeFormat("sr-Latn-RS", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Belgrade",
});

/** Short date in Belgrade time: "18. okt". */
export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

/** How long ago: "pre 5 minuta", "juče". Older than a week shows the date: "3. okt". */
export function formatTimeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 60) return relativeFormat.format(0, "second");
  if (abs < 3600) return relativeFormat.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relativeFormat.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86400) return relativeFormat.format(Math.round(seconds / 86400), "day");
  return dateFormat.format(date);
}
