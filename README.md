<div align="center">

<a href="https://github.com/stefanmilutinovicrs/react-datakit/actions/workflows/ci.yml"><img src="https://github.com/stefanmilutinovicrs/react-datakit/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
<a href="https://www.npmjs.com/package/react-datakit"><img src="https://img.shields.io/npm/v/react-datakit.svg" alt="npm version" /></a>
<a href="https://bundlejs.com/?q=react-datakit&config=%7B%22esbuild%22%3A%7B%22external%22%3A%5B%22react%22%2C%22react-dom%22%5D%7D%7D"><img src="https://deno.bundlejs.com/?q=react-datakit&config={%22esbuild%22:{%22external%22:[%22react%22,%22react-dom%22]}}&badge=detailed" alt="Bundle size" /></a>
<a href="./LICENSE"><img src="https://img.shields.io/npm/l/react-datakit.svg" alt="MIT license" /></a>

</div>

# react-datakit

Headless, accessible React components for data-heavy apps: admin panels, dashboards and ERP systems.

- Searchable selects, date ranges and filters built for thousands of records
- Keyboard and screen reader support following the WAI-ARIA Authoring Practices
- Headless hooks plus an optional theme that your CSS always overrides
- Typed with generics, SSR-safe, React as the only dependency

### <a href="https://stefanmilutinovicrs.github.io/react-datakit/">Read the docs →</a>

## Components

| Component       | What it solves                                    | Status              |
| --------------- | ------------------------------------------------- | ------------------- |
| Combobox        | Pick one value from a long, searchable list       | experimental (v0.1) |
| MultiSelect     | Pick several values, shown as removable chips     | experimental (v0.2) |
| DateRangePicker | Pick a period for dashboards, with presets        | experimental (v0.3) |
| FilterBar       | Linear/Notion-style filters, serialized to a URL  | planned             |
| Sparkline       | Tiny pure-SVG chart for table cells and KPI cards | planned             |

## Quick start

```sh
npm install react-datakit
```

```tsx
import { Combobox } from 'react-datakit/combobox';
import 'react-datakit/styles.css'; // optional default theme

<Combobox
  loadOptions={(query, { signal }) => fetchUsers(query, { signal })}
  itemToString={(user) => user?.name ?? ''}
  itemToKey={(user) => user.id}
  onChange={setAssignee}
>
  <Combobox.Label>Assignee</Combobox.Label>
  <Combobox.Input placeholder="Search people…" />
  <Combobox.Popup>
    <Combobox.List>{(user: User) => <Combobox.Option item={user}>{user.name}</Combobox.Option>}</Combobox.List>
    <Combobox.Empty>No people found</Combobox.Empty>
    <Combobox.Loading>Searching…</Combobox.Loading>
    <Combobox.Error>{({ retry }) => <button onClick={retry}>Try again</button>}</Combobox.Error>
  </Combobox.Popup>
</Combobox>;
```

```css
:root {
  --dk-accent: #7c3aed; /* every other color derives from it */
}
```

## Theming

`react-datakit/styles.css` is an optional default theme. Every rule lives in `@layer datakit` and uses `:where()` selectors, so any CSS you write wins regardless of specificity or load order.

- Most apps only set `--dk-accent`; the other colors derive from it.
- Parts are targeted by `[data-dk-part]` and state by data attributes such as `data-state`, `data-highlighted`, `data-selected`, `data-disabled` and `data-loading`.
- With Tailwind v4, declare the layer order first in your main CSS file:

  ```css
  @layer datakit, theme, base, components, utilities;
  ```

## Get involved

- We welcome issues and pull requests!
- Ask questions in [GitHub Discussions](https://github.com/stefanmilutinovicrs/react-datakit/discussions)
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions

## License

[MIT](./LICENSE)
