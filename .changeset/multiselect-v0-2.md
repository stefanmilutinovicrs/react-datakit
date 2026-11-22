---
'react-datakit': minor
---

Add `MultiSelect` (experimental): pick several values from a long or remote list, built on the new `useMultiSelect` hook and the Combobox core.

- Listbox with `aria-multiselectable`; Enter and click toggle an option and keep the list open
- Selected values as chips: Backspace in an empty input removes the last one, ArrowLeft/ArrowRight move through them, Delete removes the focused one
- `max`, a "Select all" row for the filtered options, and creatable values with `onCreate` (sync or async)
- Chips stay on one line; the ones that don't fit are counted by `MultiSelect.ChipsOverflow` ("+3 more")
- Async search, virtualization and loading, empty and error states, same as Combobox
- Available from `react-datakit` and `react-datakit/multiselect`
