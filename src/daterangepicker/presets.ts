import { addDays, addMonths, daysInMonth, type CalendarDate } from '../shared/date';

/** Date helpers handed to a preset's `range` function. */
export interface DateRangePresetContext {
  /** Today in the picker's time zone. */
  today: CalendarDate;
  addDays: (date: CalendarDate, days: number) => CalendarDate;
  /** Adds months, clamping the day to the end of the month. */
  addMonths: (date: CalendarDate, months: number) => CalendarDate;
  startOfMonth: (date: CalendarDate) => CalendarDate;
  endOfMonth: (date: CalendarDate) => CalendarDate;
}

export interface DateRangePreset {
  label: string;
  range: (context: DateRangePresetContext) => { start: CalendarDate; end: CalendarDate };
}

/** Today, Last 7 days, Last 30 days, This month, Last month. */
export const defaultPresets: readonly DateRangePreset[] = [
  { label: 'Today', range: ({ today }) => ({ start: today, end: today }) },
  { label: 'Last 7 days', range: ({ today, addDays }) => ({ start: addDays(today, -6), end: today }) },
  { label: 'Last 30 days', range: ({ today, addDays }) => ({ start: addDays(today, -29), end: today }) },
  { label: 'This month', range: ({ today, startOfMonth }) => ({ start: startOfMonth(today), end: today }) },
  {
    label: 'Last month',
    range: ({ today, addMonths, startOfMonth, endOfMonth }) => {
      const previous = addMonths(startOfMonth(today), -1);
      return { start: previous, end: endOfMonth(previous) };
    },
  },
];

export const presetContextHelpers = {
  addDays,
  addMonths,
  startOfMonth: (date: CalendarDate): CalendarDate => ({ ...date, day: 1 }),
  endOfMonth: (date: CalendarDate): CalendarDate => ({ ...date, day: daysInMonth(date.year, date.month) }),
};
