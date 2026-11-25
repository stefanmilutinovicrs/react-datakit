import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  compareDates,
  dayOfWeek,
  daysBetween,
  endOfDayInZone,
  getMonthWeeks,
  getWeekStart,
  startOfDayInZone,
  toCalendarDate,
  type CalendarDate,
} from './date';

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });

describe('calendar math', () => {
  it('adds days across month and year boundaries and leap days', () => {
    expect(addDays(d(2026, 1, 31), 1)).toEqual(d(2026, 2, 1));
    expect(addDays(d(2026, 12, 31), 1)).toEqual(d(2027, 1, 1));
    expect(addDays(d(2028, 2, 28), 1)).toEqual(d(2028, 2, 29));
    expect(addDays(d(2026, 3, 1), -1)).toEqual(d(2026, 2, 28));
    expect(addDays(d(2026, 3, 10), 7)).toEqual(d(2026, 3, 17));
  });

  it('adds months and clamps the day to the end of the month', () => {
    expect(addMonths(d(2026, 1, 31), 1)).toEqual(d(2026, 2, 28));
    expect(addMonths(d(2028, 1, 31), 1)).toEqual(d(2028, 2, 29));
    expect(addMonths(d(2026, 12, 15), 1)).toEqual(d(2027, 1, 15));
    expect(addMonths(d(2026, 1, 15), -1)).toEqual(d(2025, 12, 15));
    expect(addMonths(d(2026, 3, 31), -12)).toEqual(d(2025, 3, 31));
  });

  it('compares dates and counts days between them', () => {
    expect(compareDates(d(2026, 3, 1), d(2026, 3, 2))).toBeLessThan(0);
    expect(compareDates(d(2026, 3, 2), d(2026, 3, 2))).toBe(0);
    expect(compareDates(d(2027, 1, 1), d(2026, 12, 31))).toBeGreaterThan(0);
    expect(daysBetween(d(2026, 3, 1), d(2026, 3, 31))).toBe(30);
    expect(daysBetween(d(2026, 3, 31), d(2026, 3, 1))).toBe(-30);
  });

  it('knows the day of the week (0 = Sunday)', () => {
    expect(dayOfWeek(d(2026, 3, 29))).toBe(0);
    expect(dayOfWeek(d(2026, 11, 23))).toBe(1);
  });

  it('builds the weeks of a month, padding days of other months with null', () => {
    // March 2026 starts on a Sunday.
    const mondayFirst = getMonthWeeks(2026, 3, 1);
    expect(mondayFirst[0]).toEqual([null, null, null, null, null, null, d(2026, 3, 1)]);
    expect(mondayFirst.every((week) => week.length === 7)).toBe(true);
    expect(mondayFirst.flat().filter(Boolean)).toHaveLength(31);

    const sundayFirst = getMonthWeeks(2026, 3, 0);
    expect(sundayFirst[0]?.[0]).toEqual(d(2026, 3, 1));
    expect(sundayFirst).toHaveLength(5);
  });

  it('reads the first day of the week from the locale', () => {
    expect(getWeekStart('sr-RS')).toBe(1);
    expect(getWeekStart('de-DE')).toBe(1);
    expect(getWeekStart('en-US')).toBe(0);
  });
});

describe('time zones', () => {
  it('converts an instant to the calendar date in a time zone', () => {
    const instant = new Date('2026-03-28T23:30:00Z');
    expect(toCalendarDate(instant, 'UTC')).toEqual(d(2026, 3, 28));
    expect(toCalendarDate(instant, 'Europe/Belgrade')).toEqual(d(2026, 3, 29));
    expect(toCalendarDate(instant, 'America/New_York')).toEqual(d(2026, 3, 28));
  });

  it('gives the start and end of a regular day', () => {
    expect(startOfDayInZone(d(2026, 6, 15), 'Europe/Belgrade').toISOString()).toBe('2026-06-14T22:00:00.000Z');
    expect(endOfDayInZone(d(2026, 6, 15), 'Europe/Belgrade').toISOString()).toBe('2026-06-15T21:59:59.999Z');
    expect(startOfDayInZone(d(2026, 6, 15), 'UTC').toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });

  it('handles the 23-hour day when daylight saving time starts', () => {
    const start = startOfDayInZone(d(2026, 3, 29), 'Europe/Belgrade');
    const end = endOfDayInZone(d(2026, 3, 29), 'Europe/Belgrade');
    expect(start.toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-29T21:59:59.999Z');
    expect(end.getTime() + 1 - start.getTime()).toBe(23 * 3600_000);
  });

  it('handles the 25-hour day when daylight saving time ends', () => {
    const start = startOfDayInZone(d(2026, 10, 25), 'Europe/Belgrade');
    const end = endOfDayInZone(d(2026, 10, 25), 'Europe/Belgrade');
    expect(start.toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-25T22:59:59.999Z');
    expect(end.getTime() + 1 - start.getTime()).toBe(25 * 3600_000);
  });

  // Every day of two years in zones with DST at 02:00, at midnight, and half-hour offsets:
  // the start and end of a day belong to that day, and the instants around them do not.
  it.each(['Europe/Belgrade', 'America/New_York', 'America/Santiago', 'Australia/Lord_Howe', 'Asia/Kolkata'])(
    'start and end of every day are exact in %s',
    (timeZone) => {
      let day = d(2026, 1, 1);
      for (let i = 0; i < 730; i++) {
        const start = startOfDayInZone(day, timeZone);
        const end = endOfDayInZone(day, timeZone);
        expect(toCalendarDate(start, timeZone)).toEqual(day);
        expect(toCalendarDate(new Date(start.getTime() - 1), timeZone)).toEqual(addDays(day, -1));
        expect(toCalendarDate(end, timeZone)).toEqual(day);
        expect(toCalendarDate(new Date(end.getTime() + 1), timeZone)).toEqual(addDays(day, 1));
        day = addDays(day, 1);
      }
    },
  );
});
