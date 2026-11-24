---
'react-datakit': minor
---

`DateRangePicker.Weekday` is a full part for the weekday headers, and the calendar's rows and blank cells are no longer parts.

- `Grid` takes `weekday={(weekday) => …}` to render each weekday header; the default is `<DateRangePicker.Weekday weekday={weekday} />`.
- The hook returns `getWeekdayProps(weekday)` and `getMonthsProps()`.
- The part names `daterangepicker-weekdays`, `daterangepicker-week` and `daterangepicker-blank` are removed. Select the rows with `[data-dk-part='daterangepicker-grid'] > [role='row']`.
