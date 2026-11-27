---
'react-datakit': minor
---

Add `FilterBar` (experimental): filters as chips of field, operator and value, like the filter bars of issue trackers, whose value is a plain array that round-trips through the URL.

- Declare fields with `textField`, `numberField`, `dateField`, `enumField` and `multiEnumField` from the new `react-datakit/filterbar/schema` entry. It has no React and no `"use client"`, so a server component can read the filters with `filtersFromSearchParams` and query with them; `filtersToSearchParams` writes them back as `?filter=field.op.value`, keeping the other parameters. Unreadable entries are left out and listed in `errors`, never thrown. Dates are calendar days, so a link means the same days in every time zone; `toDateRange` gives the instants for a query. `Filter<typeof fields>` narrows each filter's value by field and operator.
- `react-datakit/filterbar` has `FilterBar` and `useFilterBar`. The bar is a WAI-ARIA toolbar with one Tab stop; each chip's operator is a menu button, and its value opens the editor of its type: a text input, a number input (two for a range), the DateRangePicker, or a searchable list of options for enums (one) and multi-enums (several). The field picker is a Combobox grouped by each field's `group`. The value holds only complete filters, and changes are announced to screen readers.
- Customize with `operators` on a field (pick, translate or add some, e.g. `isEmpty`), custom field types with `editors`, screen reader texts with `labels`, and every part through `data-dk-part`, `className`, `render` and the default theme.
- The client build imports the schema entry instead of bundling a copy, so apps that also parse the URL on the server ship it once.
