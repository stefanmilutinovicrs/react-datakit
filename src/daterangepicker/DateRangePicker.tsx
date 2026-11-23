import { createContext, forwardRef, Fragment, useContext, type ReactNode } from 'react';
import { Part, useIsomorphicLayoutEffect, useMergedRefs, visuallyHidden, type PartProps } from '../shared';
import {
  useDateRangePicker,
  type CalendarDate,
  type CalendarMonth,
  type DateRange,
  type DateRangePickerDayState,
  type DateRangePreset,
  type UseDateRangePickerOptions,
  type UseDateRangePickerReturn,
} from './useDateRangePicker';

const PickerContext = createContext<UseDateRangePickerReturn | null>(null);
const MonthContext = createContext<CalendarMonth | null>(null);

function usePicker(part: string): UseDateRangePickerReturn {
  const context = useContext(PickerContext);
  if (!context) throw new Error(`react-datakit: <DateRangePicker.${part}> must be rendered inside <DateRangePicker>.`);
  return context;
}

function useMonth(part: string): CalendarMonth {
  const month = useContext(MonthContext);
  if (!month)
    throw new Error(`react-datakit: <DateRangePicker.${part}> must be rendered inside <DateRangePicker.Month>.`);
  return month;
}

export interface DateRangePickerRootState {
  open: boolean;
  value: DateRange | null;
}

export type DateRangePickerProps = UseDateRangePickerOptions &
  Omit<PartProps<'div', DateRangePickerRootState>, 'onChange' | 'defaultValue' | 'children' | 'id'> & {
    children: ReactNode;
  };

const Root = forwardRef<HTMLDivElement, DateRangePickerProps>(function DateRangePicker(props, ref) {
  const {
    id,
    value,
    defaultValue,
    onChange,
    open,
    defaultOpen,
    onOpenChange,
    timeZone,
    locale,
    weekStartsOn,
    numberOfMonths,
    minDate,
    maxDate,
    isDateDisabled,
    maxDays,
    presets,
    closeOnSelect,
    children,
    ...partProps
  } = props;
  const picker = useDateRangePicker({
    id,
    value,
    defaultValue,
    onChange,
    open,
    defaultOpen,
    onOpenChange,
    timeZone,
    locale,
    weekStartsOn,
    numberOfMonths,
    minDate,
    maxDate,
    isDateDisabled,
    maxDays,
    presets,
    closeOnSelect,
  });
  const mergedRef = useMergedRefs<HTMLDivElement>(picker.rootRef, ref);
  const state: DateRangePickerRootState = { open: picker.isOpen, value: picker.value };
  return (
    <PickerContext.Provider value={picker}>
      <Part
        tag="div"
        state={state}
        ours={{ ...picker.getRootProps(), children }}
        theirs={partProps}
        forwardedRef={mergedRef}
      />
    </PickerContext.Provider>
  );
});

export interface DateRangePickerLabelState {
  open: boolean;
}

export type DateRangePickerLabelProps = PartProps<'label', DateRangePickerLabelState>;

const Label = forwardRef<HTMLLabelElement, DateRangePickerLabelProps>(function Label(props, ref) {
  const picker = usePicker('Label');
  const { registerLabel } = picker;
  useIsomorphicLayoutEffect(() => registerLabel(), [registerLabel]);
  return (
    <Part tag="label" state={{ open: picker.isOpen }} ours={picker.getLabelProps()} theirs={props} forwardedRef={ref} />
  );
});

export interface DateRangePickerTriggerState {
  open: boolean;
  value: DateRange | null;
  /** The value formatted for the locale, e.g. "Mar 10 – 14, 2026". */
  formattedValue: string | null;
}

export type DateRangePickerTriggerProps = Omit<PartProps<'button', DateRangePickerTriggerState>, 'children'> & {
  /** Content of the button. Default: the formatted value, or `placeholder`. */
  children?: ReactNode | ((state: DateRangePickerTriggerState) => ReactNode);
  /** Shown when there is no value and no `children`. */
  placeholder?: ReactNode;
};

const Trigger = forwardRef<HTMLButtonElement, DateRangePickerTriggerProps>(function Trigger(
  { children, placeholder, ...props },
  ref,
) {
  const picker = usePicker('Trigger');
  const mergedRef = useMergedRefs<HTMLButtonElement>(picker.triggerRef, ref);
  const state: DateRangePickerTriggerState = {
    open: picker.isOpen,
    value: picker.value,
    formattedValue: picker.formattedValue,
  };
  const content = typeof children === 'function' ? children(state) : (children ?? picker.formattedValue ?? placeholder);
  return (
    <Part
      tag="button"
      state={state}
      ours={{ ...picker.getTriggerProps(), children: <span {...picker.getTriggerValueProps()}>{content}</span> }}
      theirs={props}
      forwardedRef={mergedRef}
    />
  );
});

export interface DateRangePickerPopoverState {
  /** A start is picked and the end is not yet. */
  pending: boolean;
}

export type DateRangePickerPopoverProps = PartProps<'div', DateRangePickerPopoverState>;

/** The modal dialog. Rendered only while open; announces the visible months when they change. */
const Popover = forwardRef<HTMLDivElement, DateRangePickerPopoverProps>(function Popover({ children, ...props }, ref) {
  const picker = usePicker('Popover');
  const mergedRef = useMergedRefs<HTMLDivElement>(picker.popoverRef, ref);
  if (!picker.isOpen) return null;
  const ours = {
    ...picker.getPopoverProps(),
    children: (
      <>
        {children}
        <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
          {picker.visibleMonthsLabel}
        </div>
      </>
    ),
  };
  return (
    <Part
      tag="div"
      state={{ pending: picker.pendingStart !== null }}
      ours={ours}
      theirs={props}
      forwardedRef={mergedRef}
    />
  );
});

export interface DateRangePickerPresetsState {
  count: number;
}

export type DateRangePickerPresetsProps = Omit<PartProps<'div', DateRangePickerPresetsState>, 'children'> & {
  /** Renders one preset. Default: a `Preset` button with the preset's label. */
  children?: ((preset: DateRangePreset, index: number) => ReactNode) | undefined;
};

/** A group of preset buttons. Give it an `aria-label`, e.g. "Presets". */
const Presets = forwardRef<HTMLDivElement, DateRangePickerPresetsProps>(function Presets({ children, ...props }, ref) {
  const picker = usePicker('Presets');
  const renderPreset = children ?? ((preset: DateRangePreset) => <Preset preset={preset} />);
  const ours = {
    ...picker.getPresetsProps(),
    children: picker.presets.map((preset, index) => (
      <Fragment key={preset.label}>{renderPreset(preset, index)}</Fragment>
    )),
  };
  return <Part tag="div" state={{ count: picker.presets.length }} ours={ours} theirs={props} forwardedRef={ref} />;
});

export interface DateRangePickerPresetState {
  selected: boolean;
  disabled: boolean;
}

export type DateRangePickerPresetProps = PartProps<'button', DateRangePickerPresetState> & {
  preset: DateRangePreset;
};

/** Applies a preset range and closes. Disabled when the preset breaks min, max or `maxDays`. */
const Preset = forwardRef<HTMLButtonElement, DateRangePickerPresetProps>(function Preset(
  { preset, children, ...props },
  ref,
) {
  const picker = usePicker('Preset');
  const state: DateRangePickerPresetState = {
    selected: picker.isPresetSelected(preset),
    disabled: picker.getPresetRange(preset) === null,
  };
  const ours = { ...picker.getPresetProps(preset), children: children ?? preset.label };
  return <Part tag="button" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});

export interface DateRangePickerNavState {
  visibleMonths: CalendarMonth[];
}

export type DateRangePickerNavProps = PartProps<'button', DateRangePickerNavState>;

/** Shows the previous month. Labelled "Previous month"; pass `aria-label` to translate. */
const PrevMonth = forwardRef<HTMLButtonElement, DateRangePickerNavProps>(function PrevMonth(props, ref) {
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
const NextMonth = forwardRef<HTMLButtonElement, DateRangePickerNavProps>(function NextMonth(props, ref) {
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
const Months = forwardRef<HTMLDivElement, DateRangePickerMonthsProps>(function Months({ children, ...props }, ref) {
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
const Month = forwardRef<HTMLDivElement, DateRangePickerMonthProps>(function Month({ month, ...props }, ref) {
  const picker = usePicker('Month');
  return (
    <MonthContext.Provider value={month}>
      <Part tag="div" state={{ month }} ours={picker.getMonthProps(month)} theirs={props} forwardedRef={ref} />
    </MonthContext.Provider>
  );
});

export type DateRangePickerMonthHeadingProps = PartProps<'h2', DateRangePickerMonthState>;

/** The month name and year; labels the month's grid. */
const MonthHeading = forwardRef<HTMLHeadingElement, DateRangePickerMonthHeadingProps>(
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
const Grid = forwardRef<HTMLDivElement, DateRangePickerGridProps>(function Grid({ children, ...props }, ref) {
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
const Day = forwardRef<HTMLDivElement, DateRangePickerDayProps>(function Day({ date, children, ...props }, ref) {
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

/**
 * Pick a range of whole days in a time zone.
 *
 * @experimental
 */
export const DateRangePicker = Object.assign(Root, {
  Label,
  Trigger,
  Popover,
  Presets,
  Preset,
  PrevMonth,
  NextMonth,
  Months,
  Month,
  MonthHeading,
  Grid,
  Day,
});
