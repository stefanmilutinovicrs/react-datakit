---
'react-datakit': minor
---

Add `Combobox` (experimental): a searchable select for large or remote option lists, built on the new `useCombobox` hook.

- WAI-ARIA combobox pattern with a listbox popup and full keyboard support
- Async search with `loadOptions`: debounced, aborted when superseded, cached per query, with loading, empty and error states
- Built-in virtualization (10,000+ options)
- Controlled and uncontrolled value, parts styled through `data-dk-part` and state attributes
- `useCombobox` returns a prop getter for every part.
- Available from `react-datakit` and `react-datakit/combobox`
