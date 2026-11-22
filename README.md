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

| Component       | What it solves                                    | Status  |
| --------------- | ------------------------------------------------- | ------- |
| Combobox        | Pick one value from a long, searchable list       | planned |
| MultiSelect     | Pick several values, shown as removable chips     | planned |
| DateRangePicker | Pick a period for dashboards, with presets        | planned |
| FilterBar       | Linear/Notion-style filters, serialized to a URL  | planned |
| Sparkline       | Tiny pure-SVG chart for table cells and KPI cards | planned |

## Quick start

```sh
npm install react-datakit
```

```ts
import 'react-datakit/styles.css'; // optional default theme
```

```css
:root {
  --dk-accent: #7c3aed; /* every other color derives from it */
}
```

## Get involved

- We welcome issues and pull requests!
- Ask questions in [GitHub Discussions](https://github.com/stefanmilutinovicrs/react-datakit/discussions)
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions

## License

[MIT](./LICENSE)
