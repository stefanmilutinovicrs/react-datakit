import { forwardRef, Fragment, type ReactNode } from 'react';
import { Part, type PartProps } from '../shared';
import { MonthContext, useMonth, usePicker } from './context';
import type { CalendarDate, CalendarMonth, DateRangePickerDayState } from './useDateRangePicker';

export interface DateRangePickerNavState {
  visibleMonths: CalendarMonth[];
}

export type DateRangePickerNavProps = PartProps<'button', DateRangePickerNavState>;

/** Shows the previous month. Labelled "Previous month"; pass `aria-label` to translate. */
export const PrevMonth = forwardRef<HTMLButtonElement, DateRangePickerNavProps>(function PrevMonth(props, ref) {
  const picker = usePicker('PrevMonth');
  return (
    <Part
      tag="button"
      state={{ visibleMonths: picker.visibleMonths }}
      ours={picker.getPrevMonthProps()}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

/** Shows the next month. Labelled "Next month"; pass `aria-label` to translate. */
export const NextMonth = forwardRef<HTMLButtonElement, DateRangePickerNavProps>(function NextMonth(props, ref) {
  const picker = usePicker('NextMonth');
  return (
    <Part
      tag="button"
      state={{ visibleMonths: picker.visibleMonths }}
      ours={picker.getNextMonthProps()}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

export interface DateRangePickerMonthsState {
  visibleMonths: CalendarMonth[];
}

export type DateRangePickerMonthsProps = Omit<PartProps<'div', DateRangePickerMonthsState>, 'children'> & {
  /** Renders one visible month. Default: `Month` with a `MonthHeading` and a `Grid`. */
  children?: ((month: CalendarMonth, index: number) => ReactNode) | undefined;
};

const defaultMonth = (month: CalendarMonth) => (
  <Month month={month}>
    <MonthHeading />
    <Grid />
  </Month>
);

/** The visible months, side by side (`numberOfMonths`). */
export const Months = forwardRef<HTMLDivElement, DateRangePickerMonthsProps>(function Months(
  { children, ...props },
  ref,
) {
  const picker = usePicker('Months');
  const renderMonth = children ?? defaultMonth;
  const ours = {
    'data-dk-part': 'daterangepicker-months',
    children: picker.visibleMonths.map((month, index) => (
      <MonthContext.Provider key={`${month.year}-${month.month}`} value={month}>
        {renderMonth(month, index)}
      </MonthContext.Provider>
    )),
  };
  return (
    <Part tag="div" state={{ visibleMonths: picker.visibleMonths }} ours={ours} theirs={props} forwardedRef={ref} />
  );
});

export interface DateRangePickerMonthState {
  month: CalendarMonth;
}

export type DateRangePickerMonthProps = PartProps<'div', DateRangePickerMonthState> & {
  month: CalendarMonth;
};

/** One month: holds its `MonthHeading` and `Grid`. */
export const Month = forwardRef<HTMLDivElement, DateRangePickerMonthProps>(function Month({ month, ...props }, ref) {
  const picker = usePicker('Month');
  return (
    <MonthContext.Provider value={month}>
      <Part tag="div" state={{ month }} ours={picker.getMonthProps(month)} theirs={props} forwardedRef={ref} />
    </MonthContext.Provider>
  );
});

export type DateRangePickerMonthHeadingProps = PartProps<'h2', DateRangePickerMonthState>;

/** The month name and year; labels the month's grid. */
export const MonthHeading = forwardRef<HTMLHeadingElement, DateRangePickerMonthHeadingProps>(
  function MonthHeading(props, ref) {
    const picker = usePicker('MonthHeading');
    const month = useMonth('MonthHeading');
    return (
      <Part tag="h2" state={{ month }} ours={picker.getMonthHeadingProps(month)} theirs={props} forwardedRef={ref} />
    );
  },
);

export type DateRangePickerGridProps = Omit<PartProps<'div', DateRangePickerMonthState>, 'children'> & {
  /** Renders one day. Default: `<DateRangePicker.Day date={date} />`. */
  children?: ((date: CalendarDate) => ReactNode) | undefined;
};

/** The days of the month as an ARIA grid; style its rows with `daterangepicker-weekdays`, `-weekday`, `-week` and `-blank` (days of other months). */
export const Grid = forwardRef<HTMLDivElement, DateRangePickerGridProps>(function Grid({ children, ...props }, ref) {
  const picker = usePicker('Grid');
  const month = useMonth('Grid');
  const renderDay = children ?? ((date: CalendarDate) => <Day date={date} />);
  const weeks = picker.getMonthWeeks(month);
  const ours = {
    ...picker.getGridProps(month),
    children: (
      <>
        <div role="row" data-dk-part="daterangepicker-weekdays">
          {picker.weekdays.map((weekday) => (
            <div
              key={weekday.long}
              role="columnheader"
              aria-label={weekday.long}
              data-dk-part="daterangepicker-weekday"
            >
              {weekday.short}
            </div>
          ))}
        </div>
        {weeks.map((week, row) => (
          <div key={row} role="row" data-dk-part="daterangepicker-week">
            {week.map((date, col) =>
              date ? (
                <Fragment key={col}>{renderDay(date)}</Fragment>
              ) : (
                <div key={col} role="gridcell" data-dk-part="daterangepicker-blank" />
              ),
            )}
          </div>
        ))}
      </>
    ),
  };
  return <Part tag="div" state={{ month }} ours={ours} theirs={props} forwardedRef={ref} />;
});

export type DateRangePickerDayProps = Omit<PartProps<'div', DateRangePickerDayState>, 'children'> & {
  date: CalendarDate;
  /** Content of the cell. Default: the day of the month. */
  children?: ReactNode | ((state: DateRangePickerDayState) => ReactNode);
};

const dayNumberFormatters = new Map<string, Intl.DateTimeFormat>();

function formatDayNumber(date: CalendarDate, locale: string | undefined): string {
  const key = locale ?? '';
  let formatter = dayNumberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' });
    dayNumberFormatters.set(key, formatter);
  }
  return formatter.format(Date.UTC(date.year, date.month - 1, date.day));
}

/** A `role="gridcell"` day; only the focused day is in the tab order. */
export const Day = forwardRef<HTMLDivElement, DateRangePickerDayProps>(function Day({ date, children, ...props }, ref) {
  const picker = usePicker('Day');
  const state = picker.getDayState(date);
  const content = typeof children === 'function' ? children(state) : (children ?? formatDayNumber(date, picker.locale));
  return (
    <Part
      tag="div"
      state={state}
      ours={{ ...picker.getDayProps(date), children: content }}
      theirs={props}
      forwardedRef={ref}
    />
  );
});
