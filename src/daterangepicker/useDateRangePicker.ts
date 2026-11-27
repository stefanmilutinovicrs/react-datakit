import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type RefObject } from 'react';
import {
  daterangepickerParts,
  optionKeys,
  trapTab,
  useControllableState,
  useId,
  useIsomorphicLayoutEffect,
  useOutsidePointerDown,
  type DataAttributes,
} from '../shared';
import {
  addDays,
  addMonths,
  compareDates,
  dayOfWeek,
  daysBetween,
  endOfDayInZone,
  getLocalTimeZone,
  getMonthWeeks,
  getWeekStart,
  isSameDate,
  maxDate as laterOf,
  minDate as earlierOf,
  startOfDayInZone,
  toCalendarDate,
  toDateKey,
  type CalendarDate,
} from '../shared/date';
import { plainSpaces } from '../shared/plainSpaces';
import { defaultPresets, presetContextHelpers, type DateRangePreset } from './presets';

export type { CalendarDate };

/** A range of whole days: `start` is the first instant of the first day, `end` the last instant of the last day. */
export interface DateRange {
  start: Date;
  end: Date;
}

/** A visible month. `month` is 1-12. */
export interface CalendarMonth {
  year: number;
  month: number;
}

/** 0 = Sunday … 6 = Saturday, for `isDateDisabled` (e.g. weekends). */
export function getDayOfWeek(date: CalendarDate): number {
  return dayOfWeek(date);
}

export interface DateRangePickerWeekday {
  short: string;
  long: string;
}

export interface DateRangePickerLabels {
  previousMonth: string;
  nextMonth: string;
}

export const defaultDateRangePickerLabels: DateRangePickerLabels = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
};

export interface UseDateRangePickerOptions {
  /** Base id for the parts. Generated when omitted. */
  id?: string | undefined;
  value?: DateRange | null | undefined;
  defaultValue?: DateRange | null | undefined;
  onChange?: ((value: DateRange | null) => void) | undefined;
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** IANA time zone for the calendar and the value, e.g. `Europe/Belgrade`. Default: the runtime's zone. */
  timeZone?: string | undefined;
  /** BCP 47 locale for month and day names and the first day of the week. Default: the runtime's locale. */
  locale?: string | undefined;
  /** First day of the week, 0 = Sunday … 6 = Saturday. Default: from the locale. */
  weekStartsOn?: number | undefined;
  /** Months shown side by side. Default 2. */
  numberOfMonths?: number | undefined;
  /** Earliest selectable day (the calendar day of this instant in `timeZone`). */
  minDate?: Date | undefined;
  /** Latest selectable day (the calendar day of this instant in `timeZone`). */
  maxDate?: Date | undefined;
  isDateDisabled?: ((date: CalendarDate) => boolean) | undefined;
  /** Longest allowed range in days, counting both ends. */
  maxDays?: number | undefined;
  /** Default: `defaultPresets`. */
  presets?: readonly DateRangePreset[] | undefined;
  /** Close the dialog once a range is picked. Default true. */
  closeOnSelect?: boolean | undefined;
  /** Screen reader texts; English by default. */
  labels?: Partial<DateRangePickerLabels> | undefined;
}

export const dateRangePickerOptionKeys = optionKeys<UseDateRangePickerOptions>()([
  'id',
  'value',
  'defaultValue',
  'onChange',
  'open',
  'defaultOpen',
  'onOpenChange',
  'timeZone',
  'locale',
  'weekStartsOn',
  'numberOfMonths',
  'minDate',
  'maxDate',
  'isDateDisabled',
  'maxDays',
  'presets',
  'closeOnSelect',
  'labels',
]);

export interface DateRangePickerDayState {
  date: CalendarDate;
  /** Inside the selected (or previewed) range, ends included. */
  selected: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  /** Strictly between the ends of the range. */
  inRange: boolean;
  /** The range is a preview: a start is picked and the end is not yet. */
  preview: boolean;
  today: boolean;
  disabled: boolean;
  focused: boolean;
}

type Props = DataAttributes & Record<string, unknown>;

export interface UseDateRangePickerReturn {
  value: DateRange | null;
  /** The value as calendar dates in the time zone. */
  selectedRange: { start: CalendarDate; end: CalendarDate } | null;
  /** The value formatted for the locale (`Intl.DateTimeFormat#formatRange`), or null. */
  formattedValue: string | null;
  isOpen: boolean;
  timeZone: string;
  locale: string | undefined;
  weekStartsOn: number;
  visibleMonths: CalendarMonth[];
  focusedDate: CalendarDate;
  /** The picked start while the end is not picked yet. */
  pendingStart: CalendarDate | null;
  presets: readonly DateRangePreset[];
  /** Human-readable list of the visible months, for the live region. */
  visibleMonthsLabel: string;
  openPicker: () => void;
  closePicker: (options?: { restoreFocus?: boolean }) => void;
  selectDate: (date: CalendarDate) => void;
  applyPreset: (preset: DateRangePreset) => void;
  getPresetRange: (preset: DateRangePreset) => { start: CalendarDate; end: CalendarDate } | null;
  isPresetSelected: (preset: DateRangePreset) => boolean;
  /** The value is set and matches none of the presets. */
  isCustomRange: boolean;
  isDateDisabled: (date: CalendarDate) => boolean;
  getDayState: (date: CalendarDate) => DateRangePickerDayState;
  getMonthWeeks: (month: CalendarMonth) => (CalendarDate | null)[][];
  /** Weekday names in display order, starting with `weekStartsOn`. */
  weekdays: DateRangePickerWeekday[];
  formatMonth: (month: CalendarMonth) => string;
  formatDay: (date: CalendarDate) => string;
  registerLabel: () => () => void;
  /** Call while the element with `getTriggerValueProps` is mounted; returns the cleanup. */
  registerValue: () => () => void;
  rootRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  getRootProps: () => Props;
  getLabelProps: () => Props;
  getTriggerProps: () => Props;
  /** Props of the element that shows the value; while registered, it replaces the trigger's content in the trigger's name. */
  getTriggerValueProps: () => Props;
  getPopoverProps: () => Props;
  getPrevMonthProps: () => Props;
  getNextMonthProps: () => Props;
  getMonthsProps: () => Props;
  getMonthProps: (month: CalendarMonth) => Props;
  getMonthHeadingProps: (month: CalendarMonth) => Props;
  getGridProps: (month: CalendarMonth) => Props;
  getWeekdayProps: (weekday: DateRangePickerWeekday) => Props;
  getDayProps: (date: CalendarDate) => Props;
  getPresetsProps: () => Props;
  getPresetProps: (preset: DateRangePreset) => Props;
  getCustomPresetProps: () => Props;
}

const monthKey = (month: CalendarMonth) => `${month.year}-${month.month}`;
const firstOfMonth = (date: CalendarDate): CalendarDate => ({ year: date.year, month: date.month, day: 1 });

function clamp(date: CalendarDate, min: CalendarDate | null, max: CalendarDate | null): CalendarDate {
  if (min && compareDates(date, min) < 0) return min;
  if (max && compareDates(date, max) > 0) return max;
  return date;
}

function between(date: CalendarDate, a: CalendarDate, b: CalendarDate): boolean {
  return compareDates(date, a) >= 0 && compareDates(date, b) <= 0;
}

/**
 * Headless date range picker (WAI-ARIA APG Date Picker Dialog) whose first pick sets the start and second pick the end.
 *
 * @experimental
 */
export function useDateRangePicker(options: UseDateRangePickerOptions = {}): UseDateRangePickerReturn {
  const {
    locale,
    numberOfMonths = 2,
    maxDays,
    presets = defaultPresets,
    closeOnSelect = true,
    isDateDisabled: isDateDisabledOption,
  } = options;
  const id = useId(options.id);
  const labels = { ...defaultDateRangePickerLabels, ...options.labels };
  const ids = {
    label: `${id}-label`,
    trigger: `${id}-trigger`,
    value: `${id}-value`,
    popover: `${id}-popover`,
    heading: (month: CalendarMonth) => `${id}-heading-${monthKey(month)}`,
  };
  const timeZone = useMemo(() => options.timeZone ?? getLocalTimeZone(), [options.timeZone]);
  const weekStartsOn = useMemo(() => options.weekStartsOn ?? getWeekStart(locale), [options.weekStartsOn, locale]);

  const [value, setValue] = useControllableState<DateRange | null>({
    value: options.value,
    defaultValue: options.defaultValue ?? null,
    onChange: options.onChange,
  });
  const [isOpen, setOpen] = useControllableState<boolean>({
    value: options.open,
    defaultValue: options.defaultOpen ?? false,
    onChange: options.onOpenChange,
  });

  const minTime = options.minDate?.getTime();
  const maxTime = options.maxDate?.getTime();
  const min = useMemo(() => (minTime === undefined ? null : toCalendarDate(minTime, timeZone)), [minTime, timeZone]);
  const max = useMemo(() => (maxTime === undefined ? null : toCalendarDate(maxTime, timeZone)), [maxTime, timeZone]);

  const startTime = value?.start.getTime();
  const endTime = value?.end.getTime();
  const selectedRange = useMemo(
    () =>
      startTime === undefined || endTime === undefined
        ? null
        : { start: toCalendarDate(startTime, timeZone), end: toCalendarDate(endTime, timeZone) },
    [startTime, endTime, timeZone],
  );

  // "Today" is read when the component mounts and again each time the dialog opens.
  const [now, setNow] = useState(() => Date.now());
  const today = useMemo(() => toCalendarDate(now, timeZone), [now, timeZone]);
  const initialFocus = (todayDate: CalendarDate) => clamp(selectedRange?.start ?? todayDate, min, max);

  const [focusedDate, setFocusedDate] = useState<CalendarDate>(() => initialFocus(today));
  const [firstVisible, setFirstVisible] = useState<CalendarDate>(() => firstOfMonth(initialFocus(today)));
  const [pendingStart, setPendingStart] = useState<CalendarDate | null>(null);
  const [hoveredDate, setHoveredDate] = useState<CalendarDate | null>(null);
  const [labelCount, setLabelCount] = useState(0);
  const [valueCount, setValueCount] = useState(0);
  const focusDayRequested = useRef(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const visibleMonths = useMemo(
    () =>
      Array.from({ length: Math.max(1, numberOfMonths) }, (_, i) => {
        const month = addMonths(firstVisible, i);
        return { year: month.year, month: month.month };
      }),
    [firstVisible, numberOfMonths],
  );

  const formatters = useMemo(
    () => ({
      month: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      day: new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }),
      weekdayShort: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }),
      weekdayLong: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }),
      range: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }),
    }),
    [locale, timeZone],
  );
  const utc = (date: CalendarDate) => Date.UTC(date.year, date.month - 1, date.day);
  const formatMonth = useCallback(
    (month: CalendarMonth) => plainSpaces(formatters.month.format(Date.UTC(month.year, month.month - 1, 1))),
    [formatters],
  );
  const formatDay = (date: CalendarDate) => plainSpaces(formatters.day.format(utc(date)));
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        // 2023-01-01 was a Sunday.
        const sample = Date.UTC(2023, 0, 1 + ((weekStartsOn + i) % 7));
        return { short: formatters.weekdayShort.format(sample), long: formatters.weekdayLong.format(sample) };
      }),
    [formatters, weekStartsOn],
  );
  const formattedValue = value ? plainSpaces(formatters.range.formatRange(value.start, value.end)) : null;
  const firstMonth = visibleMonths[0] as CalendarMonth;
  const lastMonth = visibleMonths[visibleMonths.length - 1] as CalendarMonth;
  const visibleMonthsLabel = plainSpaces(
    formatters.month.formatRange(
      Date.UTC(firstMonth.year, firstMonth.month - 1, 1),
      Date.UTC(lastMonth.year, lastMonth.month - 1, 1),
    ),
  );

  const isDateDisabled = (date: CalendarDate): boolean => {
    if (min && compareDates(date, min) < 0) return true;
    if (max && compareDates(date, max) > 0) return true;
    if (maxDays !== undefined && pendingStart && Math.abs(daysBetween(pendingStart, date)) + 1 > maxDays) return true;
    return isDateDisabledOption?.(date) ?? false;
  };

  const getPresetRange = (preset: DateRangePreset) => {
    const raw = preset.range({ today, ...presetContextHelpers });
    const start = clamp(earlierOf(raw.start, raw.end), min, max);
    const end = clamp(laterOf(raw.start, raw.end), min, max);
    if (compareDates(start, end) > 0) return null;
    if (maxDays !== undefined && daysBetween(start, end) + 1 > maxDays) return null;
    return { start, end };
  };

  const isPresetSelected = (preset: DateRangePreset) => {
    const presetRange = getPresetRange(preset);
    return (
      presetRange !== null &&
      selectedRange !== null &&
      isSameDate(presetRange.start, selectedRange.start) &&
      isSameDate(presetRange.end, selectedRange.end)
    );
  };

  const isCustomRange = selectedRange !== null && !presets.some(isPresetSelected);

  const showDate = (date: CalendarDate) => {
    const first = visibleMonths[0] as CalendarMonth;
    const last = visibleMonths[visibleMonths.length - 1] as CalendarMonth;
    const index = date.year * 12 + date.month;
    if (index < first.year * 12 + first.month) setFirstVisible(firstOfMonth(date));
    else if (index > last.year * 12 + last.month)
      setFirstVisible(addMonths(firstOfMonth(date), 1 - visibleMonths.length));
  };

  const moveFocus = (date: CalendarDate) => {
    const next = clamp(date, min, max);
    focusDayRequested.current = true;
    setFocusedDate(next);
    showDate(next);
  };

  const refreshToday = () => {
    const current = Date.now();
    setNow(current);
    return toCalendarDate(current, timeZone);
  };

  const openPicker = () => {
    const focus = initialFocus(refreshToday());
    setFocusedDate(focus);
    setFirstVisible(firstOfMonth(focus));
    setPendingStart(null);
    setHoveredDate(null);
    focusDayRequested.current = true;
    setOpen(true);
  };

  const closePicker = ({ restoreFocus = true }: { restoreFocus?: boolean } = {}) => {
    focusDayRequested.current = false;
    setOpen(false);
    setPendingStart(null);
    setHoveredDate(null);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const commit = (start: CalendarDate, end: CalendarDate) => {
    setValue({ start: startOfDayInZone(start, timeZone), end: endOfDayInZone(end, timeZone) });
    setPendingStart(null);
    setHoveredDate(null);
    if (closeOnSelect) closePicker();
  };

  const selectDate = (date: CalendarDate) => {
    if (isDateDisabled(date)) return;
    if (!pendingStart) {
      setPendingStart(date);
      return;
    }
    commit(earlierOf(pendingStart, date), laterOf(pendingStart, date));
  };

  const applyPreset = (preset: DateRangePreset) => {
    const presetRange = getPresetRange(preset);
    if (!presetRange) return;
    setFocusedDate(presetRange.start);
    commit(presetRange.start, presetRange.end);
  };

  const goToMonth = (delta: number) => {
    setFirstVisible((prev) => addMonths(prev, delta));
    setFocusedDate((prev) => clamp(addMonths(prev, delta), min, max));
  };

  // Keep the controlled-open case consistent: opening from outside also resets the focus.
  const wasOpen = useRef(isOpen);
  useIsomorphicLayoutEffect(() => {
    if (isOpen && !wasOpen.current && !focusDayRequested.current) {
      const focus = initialFocus(refreshToday());
      setFocusedDate(focus);
      setFirstVisible(firstOfMonth(focus));
      focusDayRequested.current = true;
    }
    wasOpen.current = isOpen;
  });

  // The APG date picker moves DOM focus to the day itself, unlike Combobox, which keeps focus in
  // the input and uses aria-activedescendant: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
  useIsomorphicLayoutEffect(() => {
    if (!isOpen || !focusDayRequested.current) return;
    const cell = popoverRef.current?.querySelector<HTMLElement>(`[data-date="${toDateKey(focusedDate)}"]`);
    if (cell) {
      focusDayRequested.current = false;
      cell.focus();
    }
  });

  useOutsidePointerDown(isOpen, rootRef, () => {
    focusDayRequested.current = false;
    setOpen(false);
    setPendingStart(null);
    setHoveredDate(null);
  });

  const registerLabel = useCallback(() => {
    setLabelCount((count) => count + 1);
    return () => {
      setLabelCount((count) => count - 1);
    };
  }, []);

  const registerValue = useCallback(() => {
    setValueCount((count) => count + 1);
    return () => {
      setValueCount((count) => count - 1);
    };
  }, []);

  const previewEnd = pendingStart ? (hoveredDate ?? focusedDate) : null;
  const shownRange =
    pendingStart && previewEnd
      ? { start: earlierOf(pendingStart, previewEnd), end: laterOf(pendingStart, previewEnd) }
      : selectedRange;

  const getDayState = (date: CalendarDate): DateRangePickerDayState => {
    const rangeStart = shownRange !== null && isSameDate(date, shownRange.start);
    const rangeEnd = shownRange !== null && isSameDate(date, shownRange.end);
    const selected = shownRange !== null && between(date, shownRange.start, shownRange.end);
    return {
      date,
      selected,
      rangeStart,
      rangeEnd,
      inRange: selected && !rangeStart && !rangeEnd,
      preview: pendingStart !== null,
      today: isSameDate(date, today),
      disabled: isDateDisabled(date),
      focused: isSameDate(date, focusedDate),
    };
  };

  const flag = (on: boolean) => (on ? '' : undefined);
  const hasLabel = labelCount > 0;
  const hasValue = valueCount > 0;

  const onDayKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const date = focusedDate;
    const weekday = (dayOfWeek(date) - weekStartsOn + 7) % 7;
    let next: CalendarDate;
    switch (event.key) {
      case 'ArrowLeft':
        next = addDays(date, -1);
        break;
      case 'ArrowRight':
        next = addDays(date, 1);
        break;
      case 'ArrowUp':
        next = addDays(date, -7);
        break;
      case 'ArrowDown':
        next = addDays(date, 7);
        break;
      case 'Home':
        next = addDays(date, -weekday);
        break;
      case 'End':
        next = addDays(date, 6 - weekday);
        break;
      case 'PageUp':
        next = addMonths(date, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        next = addMonths(date, event.shiftKey ? 12 : 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        selectDate(date);
        return;
      default:
        return;
    }
    event.preventDefault();
    moveFocus(next);
  };

  const onPopoverKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closePicker();
      return;
    }
    trapTab(event, popoverRef.current);
  };

  return {
    value,
    selectedRange,
    formattedValue,
    isOpen,
    timeZone,
    locale,
    weekStartsOn,
    visibleMonths,
    focusedDate,
    pendingStart,
    presets,
    visibleMonthsLabel,
    openPicker,
    closePicker,
    selectDate,
    applyPreset,
    getPresetRange,
    isPresetSelected,
    isCustomRange,
    isDateDisabled,
    getDayState,
    getMonthWeeks: (month) => getMonthWeeks(month.year, month.month, weekStartsOn),
    weekdays,
    formatMonth,
    formatDay,
    registerLabel,
    registerValue,
    rootRef,
    triggerRef,
    popoverRef,
    getRootProps: () => ({
      'data-dk-part': daterangepickerParts.root,
      'data-state': isOpen ? 'open' : 'closed',
    }),
    getLabelProps: () => ({
      id: ids.label,
      htmlFor: ids.trigger,
      'data-dk-part': daterangepickerParts.label,
    }),
    getTriggerProps: () => ({
      id: ids.trigger,
      type: 'button',
      'aria-haspopup': 'dialog',
      'aria-expanded': isOpen,
      'aria-controls': isOpen ? ids.popover : undefined,
      // The name is the label plus the picked range; the button's own content would drop the label.
      // Without a Value the trigger names itself: inside an aria-labelledby traversal it contributes
      // its content, so the name is still label plus content (https://www.w3.org/TR/accname-1.2/#step2B).
      'aria-labelledby': hasLabel ? `${ids.label} ${hasValue ? ids.value : ids.trigger}` : undefined,
      'data-dk-part': daterangepickerParts.trigger,
      'data-state': isOpen ? 'open' : 'closed',
      'data-placeholder': flag(value === null),
      onClick: () => {
        if (isOpen) closePicker({ restoreFocus: false });
        else openPicker();
      },
    }),
    getTriggerValueProps: () => ({
      id: ids.value,
      'data-dk-part': daterangepickerParts.value,
      'data-placeholder': flag(value === null),
    }),
    getPopoverProps: () => ({
      id: ids.popover,
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': hasLabel ? ids.label : undefined,
      'data-dk-part': daterangepickerParts.popover,
      'data-state': 'open',
      'data-pending': flag(pendingStart !== null),
      onKeyDown: onPopoverKeyDown,
      onPointerLeave: () => {
        setHoveredDate(null);
      },
    }),
    getPrevMonthProps: () => ({
      type: 'button',
      'aria-label': labels.previousMonth,
      'data-dk-part': daterangepickerParts.prevMonth,
      onClick: () => {
        goToMonth(-1);
      },
    }),
    getNextMonthProps: () => ({
      type: 'button',
      'aria-label': labels.nextMonth,
      'data-dk-part': daterangepickerParts.nextMonth,
      onClick: () => {
        goToMonth(1);
      },
    }),
    getMonthsProps: () => ({
      'data-dk-part': daterangepickerParts.months,
    }),
    getMonthProps: (month) => ({
      'data-dk-part': daterangepickerParts.month,
      'data-month': `${month.year}-${String(month.month).padStart(2, '0')}`,
    }),
    getMonthHeadingProps: (month) => ({
      id: ids.heading(month),
      'data-dk-part': daterangepickerParts.monthHeading,
      children: formatMonth(month),
    }),
    getGridProps: (month) => ({
      role: 'grid',
      'aria-labelledby': ids.heading(month),
      'aria-multiselectable': true,
      'data-dk-part': daterangepickerParts.grid,
    }),
    getWeekdayProps: (weekday) => ({
      role: 'columnheader',
      'aria-label': weekday.long,
      'data-dk-part': daterangepickerParts.weekday,
      children: weekday.short,
    }),
    getDayProps: (date) => {
      const state = getDayState(date);
      return {
        role: 'gridcell',
        tabIndex: state.focused ? 0 : -1,
        'aria-label': formatDay(date),
        'aria-selected': state.selected,
        'aria-disabled': state.disabled || undefined,
        'aria-current': state.today ? 'date' : undefined,
        'data-dk-part': daterangepickerParts.day,
        'data-date': toDateKey(date),
        'data-selected': flag(state.selected),
        'data-range-start': flag(state.rangeStart),
        'data-range-end': flag(state.rangeEnd),
        'data-in-range': flag(state.inRange),
        'data-preview': flag(state.preview && state.selected),
        'data-today': flag(state.today),
        'data-disabled': flag(state.disabled),
        'data-focused': flag(state.focused),
        onClick: () => {
          focusDayRequested.current = true;
          setFocusedDate(date);
          selectDate(date);
        },
        onPointerEnter: () => {
          if (pendingStart) setHoveredDate(date);
        },
        onKeyDown: onDayKeyDown,
        // A disabled day takes no focus when pressed.
        onMouseDown: (event: MouseEvent) => {
          if (state.disabled) event.preventDefault();
        },
      };
    },
    getPresetsProps: () => ({
      role: 'group',
      'data-dk-part': daterangepickerParts.presets,
      'data-custom': flag(isCustomRange),
    }),
    getPresetProps: (preset) => {
      const selected = isPresetSelected(preset);
      const disabled = getPresetRange(preset) === null;
      return {
        type: 'button',
        disabled,
        'aria-pressed': selected,
        'data-dk-part': daterangepickerParts.preset,
        'data-selected': flag(selected),
        'data-disabled': flag(disabled),
        onClick: () => {
          applyPreset(preset);
        },
      };
    },
    getCustomPresetProps: () => ({
      type: 'button',
      'aria-pressed': isCustomRange,
      'data-dk-part': daterangepickerParts.customPreset,
      'data-selected': flag(isCustomRange),
      // A custom range is picked in the calendar, so this only hands focus to the grid, where the
      // APG date picker starts: the selected date, or today: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
      onClick: () => {
        // A fresh object, so focus moves even when the focused date already equals the target.
        moveFocus({ ...(selectedRange?.start ?? refreshToday()) });
      },
    }),
  };
}
