# react-datakit

## 0.2.0

### Minor Changes

- [#4](https://github.com/stefanmilutinovicrs/react-datakit/pull/4) [`e9659b8`](https://github.com/stefanmilutinovicrs/react-datakit/commit/e9659b843bf57f1e0a986e83069b4232bcf45e5a) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - New default theme (`react-datakit/styles.css`): neutral grays, one accent color for every active state, 1px borders and a readable date range, with WCAG AA contrast in light and dark.
  
  - Light, dark and auto: components follow `prefers-color-scheme`, and `data-dk-theme="light"` or `"dark"` on any element forces a subtree. The theme no longer sets `color-scheme` on your page's `:root`.
  - Accent presets: `data-dk-accent="indigo"` (default), `"teal"`, `"violet"` or `"blue"` on any element. `--dk-accent` still takes any color, now on any subtree, and every color derived from it follows.
  - Tokens: `--dk-surface`, `--dk-muted`, `--dk-border`, `--dk-text`, `--dk-text-muted`, `--dk-on-accent`, `--dk-accent-subtle` and `--dk-accent-text`. `--dk-accent-soft`, `--dk-accent-strong` and `--dk-focus-ring` are removed.
  - `Combobox.Control` (optional) wraps the input, and the theme draws a search icon and a chevron on it. `Combobox.Count` shows the number of results.
  - `MultiSelect.ChipRemove` shows an icon instead of a × character.
  - Labels keep your page's text color. Popups never round more than 12px, whatever `--dk-radius` is.

## 0.1.0

### Minor Changes

- [`dab48d2`](https://github.com/stefanmilutinovicrs/react-datakit/commit/dab48d24be080b1cb015bdbad5de6c2918fb4f31) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Add `Combobox` (experimental) and `useCombobox`: pick one value from a long or remote list by typing to search.
  
  - WAI-ARIA combobox pattern with a listbox popup and full keyboard support
  - Static `items` with local filtering, or async `loadOptions`: debounced, aborted when superseded, cached per query, with loading, empty and error states
  - Built-in virtualization for 10,000+ options
  - Controlled or uncontrolled, with every part styled through `data-dk-part` and state data attributes
  - Available from `react-datakit` and `react-datakit/combobox`

- [#1](https://github.com/stefanmilutinovicrs/react-datakit/pull/1) [`9c73e57`](https://github.com/stefanmilutinovicrs/react-datakit/commit/9c73e574d359b681093cba92e7ab3f6d57591950) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Add `DateRangePicker` (experimental) and `useDateRangePicker`: pick a range of whole days in a time zone, with presets, in a WAI-ARIA date picker dialog. Available from `react-datakit` and `react-datakit/daterangepicker`.

- [#1](https://github.com/stefanmilutinovicrs/react-datakit/pull/1) [`2fe2589`](https://github.com/stefanmilutinovicrs/react-datakit/commit/2fe25891265ecf975388adf846aa90999323546a) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Every component takes a `labels` option for screen reader texts that no part shows (ARIA names, live region announcements). The English defaults are exported as `defaultComboboxLabels`, `defaultMultiSelectLabels` and `defaultDateRangePickerLabels`.

- [#1](https://github.com/stefanmilutinovicrs/react-datakit/pull/1) [`ad93f3e`](https://github.com/stefanmilutinovicrs/react-datakit/commit/ad93f3e0ad6c45602605b7407f9380d8b4506def) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Add `MultiSelect` (experimental) and `useMultiSelect`: pick several values from a long or remote list, shown as removable chips. Supports select all, a maximum, creating new values and collapsing chips that don't fit. Available from `react-datakit` and `react-datakit/multiselect`.
