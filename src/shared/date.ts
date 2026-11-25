/** A day on the calendar. `month` is 1-12. */
export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const DAY_MS = 86_400_000;

function toUtcMs(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

function fromUtcMs(ms: number): CalendarDate {
  const utc = new Date(ms);
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Adds months; the day is clamped to the last day of the target month (Jan 31 + 1 = Feb 28). */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const index = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return toUtcMs(a) - toUtcMs(b);
}

export function isSameDate(a: CalendarDate | null, b: CalendarDate | null): boolean {
  return a !== null && b !== null && compareDates(a, b) === 0;
}

/** Number of days from `a` to `b` (negative when `b` is earlier). */
export function daysBetween(a: CalendarDate, b: CalendarDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: CalendarDate): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

export function minDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return compareDates(a, b) <= 0 ? a : b;
}

export function maxDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return compareDates(a, b) >= 0 ? a : b;
}

/** `YYYY-MM-DD`, used as a key and in `data-date`. */
export function toDateKey(date: CalendarDate): string {
  const pad = (n: number, len: number) => String(n).padStart(len, '0');
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}

/** Weeks of 7 days starting on `weekStart` (0 = Sunday), with `null` for days of other months. */
export function getMonthWeeks(year: number, month: number, weekStart: number): (CalendarDate | null)[][] {
  const first: CalendarDate = { year, month, day: 1 };
  const leading = (dayOfWeek(first) - weekStart + 7) % 7;
  const total = daysInMonth(year, month);
  const cells: (CalendarDate | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= total; day++) cells.push({ year, month, day });
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (CalendarDate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// Regions where the week starts on Sunday, for engines without Intl.Locale week info.
const SUNDAY_REGIONS = new Set(['US', 'CA', 'MX', 'BR', 'JP', 'KR', 'TW', 'HK', 'IL', 'PH', 'IN', 'ZA', 'SA']);

interface WeekInfo {
  firstDay: number;
}

/** First day of the week for a locale (0 = Sunday), from `Intl.Locale` week info. */
export function getWeekStart(locale: string | undefined): number {
  const resolved = new Intl.Locale(locale ?? new Intl.DateTimeFormat().resolvedOptions().locale);
  const withInfo = resolved as Intl.Locale & { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo };
  const info = withInfo.getWeekInfo?.() ?? withInfo.weekInfo;
  if (info) return info.firstDay % 7;
  const region = resolved.maximize().region;
  return region && SUNDAY_REGIONS.has(region) ? 0 : 1;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

// The wall-clock time in `timeZone`, read as if it were UTC, so offsets are plain subtraction.
function wallClockMs(ms: number, timeZone: string): number {
  const values: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(ms)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  const { year = 0, month = 1, day = 1, hour = 0, minute = 0, second = 0 } = values;
  return Date.UTC(year, month - 1, day, hour, minute, second);
}

export function getLocalTimeZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function toCalendarDate(instant: Date | number, timeZone: string): CalendarDate {
  const ms = typeof instant === 'number' ? instant : instant.getTime();
  return fromUtcMs(Math.floor(wallClockMs(ms, timeZone) / DAY_MS) * DAY_MS);
}

/** Local midnight, or the first instant after the gap on a day whose midnight is skipped by DST. */
export function startOfDayInZone(date: CalendarDate, timeZone: string): Date {
  const midnight = toUtcMs(date);
  // The offset at local midnight is either the offset just before or just after it,
  // so two guesses cover every case. The earliest that falls on `date` wins.
  const candidates = new Set<number>();
  for (const probe of [midnight - DAY_MS / 2, midnight, midnight + DAY_MS / 2]) {
    const offset = wallClockMs(probe, timeZone) - Math.floor(probe / 1000) * 1000;
    candidates.add(midnight - offset);
  }
  let best = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    if (candidate < best && compareDates(toCalendarDate(candidate, timeZone), date) === 0) best = candidate;
  }
  // When midnight is skipped, every candidate lands an hour or so after it; the instant
  // right after the previous day ends is the start of this one.
  if (best !== Number.POSITIVE_INFINITY) {
    while (compareDates(toCalendarDate(best - 60_000, timeZone), date) === 0) best -= 60_000;
  }
  return new Date(best);
}

/** The last millisecond of a day in a time zone. */
export function endOfDayInZone(date: CalendarDate, timeZone: string): Date {
  return new Date(startOfDayInZone(addDays(date, 1), timeZone).getTime() - 1);
}
