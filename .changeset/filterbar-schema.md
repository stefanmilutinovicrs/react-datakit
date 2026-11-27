---
'react-datakit': minor
---

Add the experimental `react-datakit/filterbar/schema` entry, the data layer of the upcoming `FilterBar`. Declare fields with `textField`, `numberField`, `dateField`, `enumField` and `multiEnumField`; `Filter<typeof fields>` narrows each filter's `value` by field and operator. `filtersToSearchParams` writes filters to a repeatable `?filter=field.op.value` parameter and keeps the other parameters; `filtersFromSearchParams` reads them back from a query string, `URLSearchParams` or a Next.js `searchParams` object, and lists entries it could not read in `errors` instead of throwing. Date values are calendar days (`YYYY-MM-DD`), so a link means the same days in every time zone; `toDateRange` turns them into instants. The entry has no `"use client"` and no React import, so server components can import it.
