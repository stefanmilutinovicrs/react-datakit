import { useState } from 'react';
import { expectTypeOf } from 'vitest';
import {
  DateRangePicker,
  defaultPresets,
  useDateRangePicker,
  type CalendarDate,
  type CalendarMonth,
  type DateRange,
  type DateRangePickerDayState,
  type DateRangePickerTriggerState,
  type DateRangePreset,
} from './index';

const lastWeek: DateRangePreset = {
  label: 'Last week',
  range: ({ today, addDays }) => ({ start: addDays(today, -13), end: addDays(today, -7) }),
};

// Checked with strictFunctionTypes off (tsconfig.test-d.json), like the other type tests.
export function Picker() {
  const [value, setValue] = useState<DateRange | null>(null);
  const picker = useDateRangePicker({ value, onChange: setValue, presets: [...defaultPresets, lastWeek] });
  expectTypeOf(picker.value).toEqualTypeOf<DateRange | null>();
  expectTypeOf(picker.selectedRange).toEqualTypeOf<{ start: CalendarDate; end: CalendarDate } | null>();
  expectTypeOf(picker.getDayState).returns.toEqualTypeOf<DateRangePickerDayState>();

  // @ts-expect-error The value is a range of instants, not calendar dates.
  useDateRangePicker({ defaultValue: { start: { year: 2026, month: 3, day: 10 }, end: new Date() } });

  return (
    <DateRangePicker value={value} onChange={setValue} timeZone="Europe/Belgrade">
      <DateRangePicker.Trigger>
        {(state) => {
          expectTypeOf(state).toEqualTypeOf<DateRangePickerTriggerState>();
          return state.formattedValue ?? 'Pick dates';
        }}
      </DateRangePicker.Trigger>
      <DateRangePicker.Popover>
        <DateRangePicker.Months>
          {(month, index) => {
            expectTypeOf(month).toEqualTypeOf<CalendarMonth>();
            expectTypeOf(index).toBeNumber();
            return (
              <DateRangePicker.Month month={month}>
                <DateRangePicker.Grid>
                  {(date) => (
                    <DateRangePicker.Day date={date} className={(state) => (state.rangeStart ? 'start' : undefined)}>
                      {(state) => {
                        expectTypeOf(state).toEqualTypeOf<DateRangePickerDayState>();
                        return date.day;
                      }}
                    </DateRangePicker.Day>
                  )}
                </DateRangePicker.Grid>
              </DateRangePicker.Month>
            );
          }}
        </DateRangePicker.Months>
      </DateRangePicker.Popover>
    </DateRangePicker>
  );
}
