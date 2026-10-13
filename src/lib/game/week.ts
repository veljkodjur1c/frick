// Week boundaries in Europe/Belgrade. Pure functions, no DB or UI imports.
// Week dates are "YYYY-MM-DD" strings, the same format as weeks.starts_on / weeks.ends_on.
// Champ select timing (Sunday evening) is built on these in champSelect.ts.

import { TIMEZONE } from "./config";

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const belgradeParts = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const belgradeHour = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hour: "numeric",
  hourCycle: "h23",
});

/** The calendar day of `date` in Belgrade, as a UTC-midnight Date (safe for plain day arithmetic). */
function belgradeDay(date: Date): Date {
  const parts = belgradeParts.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

function toIsoDate(day: Date): string {
  return day.toISOString().slice(0, 10);
}

function parseIsoDate(value: string): Date {
  const match = ISO_DATE.exec(value);
  const day = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (!day || toIsoDate(day) !== value) {
    throw new Error(`Invalid date "${value}", expected YYYY-MM-DD.`);
  }
  return day;
}

function parseWeekStart(startsOn: string): Date {
  const day = parseIsoDate(startsOn);
  if (day.getUTCDay() !== 1) {
    throw new Error(`Week start "${startsOn}" is not a Monday.`);
  }
  return day;
}

function addDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * DAY_MS);
}

/** Day of the week in Belgrade, ISO numbering: 1 = Monday ... 7 = Sunday. */
export function dayOfWeek(date: Date): number {
  return belgradeDay(date).getUTCDay() || 7;
}

/** Hour of the day in Belgrade, 0-23. */
export function hourOf(date: Date): number {
  return Number(belgradeHour.formatToParts(date).find((p) => p.type === "hour")?.value);
}

/** Monday of the Belgrade week that contains `date`, as "YYYY-MM-DD". */
export function weekStartOf(date: Date): string {
  return toIsoDate(addDays(belgradeDay(date), 1 - dayOfWeek(date)));
}

/** Sunday of the week that starts on `startsOn` (a Monday, "YYYY-MM-DD"). */
export function weekEndOf(startsOn: string): string {
  return toIsoDate(addDays(parseWeekStart(startsOn), 6));
}

/** Monday of the week after the one that starts on `startsOn`. */
export function nextWeekStart(startsOn: string): string {
  return toIsoDate(addDays(parseWeekStart(startsOn), 7));
}

/** Whole weeks from the week starting `from` to the week starting `to` (both Mondays); negative if `to` is earlier. */
export function weeksBetween(from: string, to: string): number {
  return Math.round((parseWeekStart(to).getTime() - parseWeekStart(from).getTime()) / (7 * DAY_MS));
}

/** Monday of the current Belgrade week. */
export function currentWeekStart(now: Date = new Date()): string {
  return weekStartOf(now);
}
