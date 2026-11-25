import { forwardRef, type ReactNode } from 'react';
import { Part, splitProps, useMergedRefs, type PartProps } from '../shared';
import { Day, Grid, Month, MonthHeading, Months, NextMonth, PrevMonth, Weekday } from './Calendar';
import { PickerContext } from './context';
import { CustomPreset, Popover, Preset, Presets } from './Popover';
import { Label, Trigger } from './Trigger';
import {
  dateRangePickerOptionKeys,
  useDateRangePicker,
  type DateRange,
  type UseDateRangePickerOptions,
} from './useDateRangePicker';

export interface DateRangePickerRootState {
  open: boolean;
  value: DateRange | null;
}

export type DateRangePickerProps = UseDateRangePickerOptions &
  Omit<PartProps<'div', DateRangePickerRootState>, 'onChange' | 'defaultValue' | 'children' | 'id'> & {
    children: ReactNode;
  };

const Root = forwardRef<HTMLDivElement, DateRangePickerProps>(function DateRangePicker({ children, ...props }, ref) {
  const [options, partProps] = splitProps(props, dateRangePickerOptionKeys);
  const picker = useDateRangePicker(options);
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
  CustomPreset,
  PrevMonth,
  NextMonth,
  Months,
  Month,
  MonthHeading,
  Grid,
  Weekday,
  Day,
});
