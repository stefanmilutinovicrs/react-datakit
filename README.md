<div align="center">

<a href="https://github.com/stefanmilutinovicrs/react-datakit/actions/workflows/ci.yml"><img src="https://github.com/stefanmilutinovicrs/react-datakit/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
<a href="https://www.npmjs.com/package/react-datakit"><img src="https://img.shields.io/npm/v/react-datakit.svg" alt="npm version" /></a>
<a href="https://bundlejs.com/?q=react-datakit&config=%7B%22esbuild%22%3A%7B%22external%22%3A%5B%22react%22%2C%22react-dom%22%5D%7D%7D"><img src="https://deno.bundlejs.com/?q=react-datakit&config={%22esbuild%22:{%22external%22:[%22react%22,%22react-dom%22]}}&badge=detailed" alt="Bundle size" /></a>
<a href="https://github.com/stefanmilutinovicrs/react-datakit/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/react-datakit.svg" alt="MIT license" /></a>

</div>

# react-datakit

Headless, accessible React components for data-heavy apps: admin panels, dashboards and ERP systems.

- Searchable selects and date ranges built for thousands of records
- Keyboard and screen reader support following the WAI-ARIA Authoring Practices
- Headless hooks plus an optional theme that your CSS always overrides
- Typed with generics, SSR-safe, React as the only dependency

### <a href="https://stefanmilutinovicrs.github.io/react-datakit/">Read the docs →</a>

## Components

| Component       | What it solves                                    | Status       |
| --------------- | ------------------------------------------------- | ------------ |
| Combobox        | Pick one value from a long, searchable list       | experimental |
| MultiSelect     | Pick several values, shown as removable chips     | experimental |
| DateRangePicker | Pick a period for dashboards, with presets        | experimental |
| FilterBar       | Linear/Notion-style filters, serialized to a URL  | planned      |
| Sparkline       | Tiny pure-SVG chart for table cells and KPI cards | planned      |

Experimental components may change their API in minor versions before 1.0. Check the [release notes](https://github.com/stefanmilutinovicrs/react-datakit/releases) when you upgrade.

## Quick start

```sh
npm install react-datakit
```

Works with React 18 and 19. The types need TypeScript 5.4 or later.

```tsx
import { useState } from 'react';
import { Combobox } from 'react-datakit/combobox';
import 'react-datakit/styles.css'; // optional default theme

interface User {
  id: number;
  name: string;
}

const users: User[] = [
  { id: 1, name: 'Ana Petrović' },
  { id: 2, name: 'Bojan Jović' },
  { id: 3, name: 'Elena Kim' },
];

// Stands in for your API: answers after 300 ms and stops when the search is superseded.
function searchUsers(query: string, signal: AbortSignal): Promise<User[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(users.filter((user) => user.name.toLowerCase().includes(query.toLowerCase())));
    }, 300);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

export function AssigneePicker() {
  const [assignee, setAssignee] = useState<User | null>(null);

  return (
    <Combobox
      loadOptions={(query, { signal }) => searchUsers(query, signal)}
      itemToString={(user) => user?.name ?? ''}
      itemToKey={(user) => user.id}
      value={assignee}
      onChange={setAssignee}
    >
      <Combobox.Label>Assignee</Combobox.Label>
      <Combobox.Input placeholder="Search people…" />
      <Combobox.Popup>
        <Combobox.List>{(user: User) => <Combobox.Option item={user}>{user.name}</Combobox.Option>}</Combobox.List>
        <Combobox.Empty>No people found</Combobox.Empty>
        <Combobox.Loading>Searching…</Combobox.Loading>
        <Combobox.Error>
          {({ retry }) => (
            <button type="button" onClick={retry}>
              Try again
            </button>
          )}
        </Combobox.Error>
      </Combobox.Popup>
    </Combobox>
  );
}
```

`loadOptions` is debounced, aborted when a newer query starts and cached per query. For a short static list, pass `items` instead; it is filtered locally.

```css
:root {
  --dk-accent: #7c3aed; /* every other color derives from it */
}
```

## Theming

`react-datakit/styles.css` is an optional default theme. Every rule lives in `@layer datakit` and uses `:where()` selectors, so any CSS you write wins regardless of specificity or load order.

- Most apps only set `--dk-accent`; the other colors derive from it.
- Parts are targeted by `[data-dk-part]` and state by data attributes such as `data-state`, `data-highlighted`, `data-selected`, `data-disabled` and `data-loading`.
- MultiSelect chips: `data-expanded` is set on the Control and Chips while focus is in the component, `data-overflow` on chips that don't fit, and `--dk-chips-visible-width` on Chips holds the width up to the last chip that fits, for a `max-width` that cuts there.
- DateRangePicker: every part has a `data-dk-part`, including each weekday header (`daterangepicker-weekday`). Calendar rows have only a role; select them with `[data-dk-part='daterangepicker-grid'] > [role='row']`. `data-custom` is set on Presets while the value matches no preset. On narrow screens the months stack; pass `numberOfMonths={1}` to show one month instead.
- With Tailwind v4, declare the layer order first in your main CSS file:

  ```css
  @layer datakit, theme, base, components, utilities;
  ```

## Get involved

- We welcome issues and pull requests!
- Ask questions in [GitHub Discussions](https://github.com/stefanmilutinovicrs/react-datakit/discussions)
- See [CONTRIBUTING.md](https://github.com/stefanmilutinovicrs/react-datakit/blob/main/CONTRIBUTING.md) for setup instructions

## License

[MIT](https://github.com/stefanmilutinovicrs/react-datakit/blob/main/LICENSE)
