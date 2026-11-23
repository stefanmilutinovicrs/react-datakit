import { forwardRef, type ReactNode } from 'react';
import { Part, useMergedRefs, type PartProps } from '../shared';
import { Day, Grid, Month, MonthHeading, Months, NextMonth, PrevMonth } from './Calendar';
import { PickerContext } from './context';
import { Popover, Preset, Presets } from './Popover';
import { Label, Trigger } from './Trigger';
import { useDateRangePicker, type DateRange, type UseDateRangePickerOptions } from './useDateRangePicker';

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
