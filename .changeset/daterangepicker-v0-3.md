---
'react-datakit': minor
---

Add `DateRangePicker` (experimental): pick a range of whole days in a time zone, built on the new `useDateRangePicker` hook.

- WAI-ARIA Date Picker Dialog pattern: a button opens a modal dialog with one grid per month; arrows, Home/End, PageUp/PageDown and Shift+PageUp/PageDown move through the days
- The value is `{ start, end }` as `Date` instants: the first and last millisecond of the picked days in `timeZone`, correct on daylight saving time changes
- Month and weekday names and the first day of the week come from `Intl`; no date library is bundled
- Presets (Today, Last 7 days, Last 30 days, This month, Last month) or your own list
- `minDate`, `maxDate`, `isDateDisabled` and `maxDays`; `numberOfMonths` (default 2)
- Available from `react-datakit` and `react-datakit/daterangepicker`
