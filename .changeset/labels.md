---
'react-datakit': minor
---

Screen reader texts move into a `labels` option with English defaults, the same in every component. It holds only text you can't reach through a part: ARIA names, list names and live region announcements. Visible content is still changed through parts.

- `Combobox`: `labels.resultCount`
- `MultiSelect`: `labels.resultCount`, `selected`, `remove` and `removed`
- `DateRangePicker`: `labels.previousMonth` and `nextMonth`; the visible months are announced with `Intl.DateTimeFormat#formatRange` in the component's `locale`
- Defaults are exported as `defaultComboboxLabels`, `defaultMultiSelectLabels` and `defaultDateRangePickerLabels`
- `formatResultCount` is removed; use `labels.resultCount`. There is no alias because the package has not been published yet.
