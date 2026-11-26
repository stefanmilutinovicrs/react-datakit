'use client';

import { DateRangePicker } from 'react-datakit/daterangepicker';

export function PeriodParts() {
  return (
    <>
      <DateRangePicker.Label>Period</DateRangePicker.Label>
      <DateRangePicker.Trigger placeholder="Pick a period" />
      <DateRangePicker.Popover>
        <DateRangePicker.Presets aria-label="Presets" />
        <DateRangePicker.PrevMonth />
        <DateRangePicker.NextMonth />
        <DateRangePicker.Months />
      </DateRangePicker.Popover>
    </>
  );
}
