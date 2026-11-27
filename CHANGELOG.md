# react-datakit

## 0.4.0

### Minor Changes

- [#17](https://github.com/stefanmilutinovicrs/react-datakit/pull/17) [`5de46fc`](https://github.com/stefanmilutinovicrs/react-datakit/commit/5de46fc00bd6f82fde94da8df248d2bc5add29ff) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Add `FilterBar` (experimental): filters as chips of field, operator and value, like the filter bars of issue trackers, whose value is a plain array that round-trips through the URL.
  
  - Declare fields with `textField`, `numberField`, `dateField`, `enumField` and `multiEnumField` from the new `react-datakit/filterbar/schema` entry. It has no React and no `"use client"`, so a server component can read the filters with `filtersFromSearchParams` and query with them; `filtersToSearchParams` writes them back as `?filter=field.op.value`, keeping the other parameters. Unreadable entries are left out and listed in `errors`, never thrown. Dates are calendar days, so a link means the same days in every time zone; `toDateRange` gives the instants for a query. `Filter<typeof fields>` narrows each filter's value by field and operator.
  - `react-datakit/filterbar` has `FilterBar` and `useFilterBar`. The bar is a WAI-ARIA toolbar with one Tab stop; each chip's operator is a menu button, and its value opens the editor of its type: a text input, a number input (two for a range), the DateRangePicker, or a searchable list of options for enums (one) and multi-enums (several). The field picker is a Combobox grouped by each field's `group`. The value holds only complete filters, and changes are announced to screen readers.
  - Customize with `operators` on a field (pick, translate or add some, e.g. `isEmpty`), custom field types with `editors`, screen reader texts with `labels`, and every part through `data-dk-part`, `className`, `render` and the default theme.
  - The client build imports the schema entry instead of bundling a copy, so apps that also parse the URL on the server ship it once.

- [#13](https://github.com/stefanmilutinovicrs/react-datakit/pull/13) [`685afd5`](https://github.com/stefanmilutinovicrs/react-datakit/commit/685afd537b8d2ad98ab734389579dc6aeda25257) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Add option groups to `Combobox` and `MultiSelect`. `groupBy` on the root puts options under headings, with `items` or `loadOptions`; groups keep the order in which they first appear, and empty ones disappear while filtering. Headings render as the new `GroupLabel` part (`data-dk-part="combobox-group-label"` / `"multiselect-group-label"`), customizable through `<List groupLabel={(group) => …}>`. Options of a group sit in a `role="group"` element named by its heading, also in the virtualized list, so screen readers announce the group of the highlighted option. Arrows and the new PageUp/PageDown keys skip headings; Select all still selects every filtered option across groups.
  
  `ComboboxRow` has a new `group-label` variant, and `ComboboxCore` has `rowGroups`, `getGroupProps` and `getGroupLabelProps`.

- [#19](https://github.com/stefanmilutinovicrs/react-datakit/pull/19) [`6c1134a`](https://github.com/stefanmilutinovicrs/react-datakit/commit/6c1134ac6fdc58c1b59cf8a6e6c2c6f9363653a3) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Add `Sparkline` (`react-datakit/sparkline`), a small chart in plain SVG that renders the same on the server and in the browser. Its parts are `Line` (the default), `Area`, `Bars` (with `xScale="band"`), `Marker` (`at="min" | "max" | "first" | "last"` or an index) and `ReferenceLine`, each a single path with `data-dk-part`. Data is numbers or items read with `itemToValue`; `null`, `undefined` and `NaN` are gaps. `domain` sets the ends of the y axis. The SVG is an image named from `label` and a summary of the values (trend, low, high, last), formatted with `locale` and `formatOptions` and worded through `labels`, or `decorative` when the text next to it says enough. The headless hook is `useSparkline`.

### Patch Changes

- [#18](https://github.com/stefanmilutinovicrs/react-datakit/pull/18) [`0eb32a8`](https://github.com/stefanmilutinovicrs/react-datakit/commit/0eb32a8663803d7453ee47154c7d89141b6d462e) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Fix a hydration mismatch in `DateRangePicker` with a server-rendered value: the formatted value, month headings, day labels and the visible months label now use plain spaces. Node's ICU puts thin spaces around the range dash ("Mar 10 – 14, 2026") where browsers may put plain ones, so the server text did not match the client's.

## 0.3.0

### Minor Changes

- [#10](https://github.com/stefanmilutinovicrs/react-datakit/pull/10) [`b3e65b8`](https://github.com/stefanmilutinovicrs/react-datakit/commit/b3e65b824b72b68a10d6ca5cf63050696d0bd6c2) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - `DateRangePicker.Value` is a new part: the picked range (or a placeholder) inside the trigger, with `className`, `style`, `render`, a ref and `data-placeholder`. `Trigger` renders it by default, so existing code looks and is announced the same. Render it yourself to add an icon to the trigger; the button's name stays the label plus the value. Trigger `children` are no longer wrapped in a hidden span. The hook adds `registerValue`.

### Patch Changes

- [#12](https://github.com/stefanmilutinovicrs/react-datakit/pull/12) [`91c94a6`](https://github.com/stefanmilutinovicrs/react-datakit/commit/91c94a67ec33035c901fef3e263fd92bf30b8f1b) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - MultiSelect: a single click on a chip's remove button always removes the chip. The button no longer takes focus on mousedown, which expanded the chips and could move the button away before mouseup; focus still goes to the input after the click.

## 0.2.2

### Patch Changes

- [#8](https://github.com/stefanmilutinovicrs/react-datakit/pull/8) [`0c4ee2a`](https://github.com/stefanmilutinovicrs/react-datakit/commit/0c4ee2a4824822f53321fc30929edf3a695f9032) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Fix the default theme in Next.js and Vite builds. Their CSS step (Lightning CSS) transpiles `light-dark()` for older browsers, which left every theme color empty or ignored `data-dk-theme` on a subtree. The theme now resolves its colors on each part without `light-dark()`, which also makes it work in Safari 16.2 to 17.4. Tokens, `data-dk-theme` and `data-dk-accent` work as before. The color tokens are now only readable inside components, unless you set them yourself.

## 0.2.1

### Patch Changes

- [#6](https://github.com/stefanmilutinovicrs/react-datakit/pull/6) [`e6dc390`](https://github.com/stefanmilutinovicrs/react-datakit/commit/e6dc390ae379c7178825ae52e052d4481e303377) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - `MultiSelect`: a rejected `onCreate` promise no longer causes an unhandled rejection. Nothing is added, the error is logged in development, and the user can create the value again.

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

- [`dab48d2`](https://github.com/stefanmilutinovicrs/react-datakit/commit/dab48d24be080b1cb015bdbad5de6c2918fb4f31) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Add `Combobox` (experimental) and `useCombobox`: pick one value from a long or remote list by typing to search, with async loading and virtualization. Available from `react-datakit` and `react-datakit/combobox`.

- [#1](https://github.com/stefanmilutinovicrs/react-datakit/pull/1) [`9c73e57`](https://github.com/stefanmilutinovicrs/react-datakit/commit/9c73e574d359b681093cba92e7ab3f6d57591950) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Add `DateRangePicker` (experimental) and `useDateRangePicker`: pick a range of whole days in a time zone, with presets, in a WAI-ARIA date picker dialog. Available from `react-datakit` and `react-datakit/daterangepicker`.

- [#1](https://github.com/stefanmilutinovicrs/react-datakit/pull/1) [`2fe2589`](https://github.com/stefanmilutinovicrs/react-datakit/commit/2fe25891265ecf975388adf846aa90999323546a) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Every component takes a `labels` option for screen reader texts that no part shows (ARIA names, live region announcements). The English defaults are exported as `defaultComboboxLabels`, `defaultMultiSelectLabels` and `defaultDateRangePickerLabels`.

- [#1](https://github.com/stefanmilutinovicrs/react-datakit/pull/1) [`ad93f3e`](https://github.com/stefanmilutinovicrs/react-datakit/commit/ad93f3e0ad6c45602605b7407f9380d8b4506def) Thanks [@stefanmilutinovicrs](https://github.com/stefanmilutinovicrs)! - Add `MultiSelect` (experimental) and `useMultiSelect`: pick several values from a long or remote list, shown as removable chips. Supports select all, a maximum, creating new values and collapsing chips that don't fit. Available from `react-datakit` and `react-datakit/multiselect`.
