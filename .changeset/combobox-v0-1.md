---
'react-datakit': minor
---

Add `Combobox` (experimental) and `useCombobox`: pick one value from a long or remote list by typing to search.

- WAI-ARIA combobox pattern with a listbox popup and full keyboard support
- Static `items` with local filtering, or async `loadOptions`: debounced, aborted when superseded, cached per query, with loading, empty and error states
- Built-in virtualization for 10,000+ options
- Controlled or uncontrolled, with every part styled through `data-dk-part` and state data attributes
- Available from `react-datakit` and `react-datakit/combobox`
