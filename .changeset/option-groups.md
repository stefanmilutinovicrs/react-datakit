---
'react-datakit': minor
---

Add option groups to `Combobox` and `MultiSelect`. `groupBy` on the root puts options under headings, with `items` or `loadOptions`; groups keep the order in which they first appear, and empty ones disappear while filtering. Headings render as the new `GroupLabel` part (`data-dk-part="combobox-group-label"` / `"multiselect-group-label"`), customizable through `<List groupLabel={(group) => …}>`. Options of a group sit in a `role="group"` element named by its heading, also in the virtualized list, so screen readers announce the group of the highlighted option. Arrows and the new PageUp/PageDown keys skip headings; Select all still selects every filtered option across groups.

`ComboboxRow` has a new `group-label` variant, and `ComboboxCore` has `rowGroups`, `getGroupProps` and `getGroupLabelProps`.
