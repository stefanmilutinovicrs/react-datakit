---
'react-datakit': minor
---

New default theme (`react-datakit/styles.css`): neutral grays, one accent color for every active state, 1px borders and a readable date range, with WCAG AA contrast in light and dark.

- Light, dark and auto: components follow `prefers-color-scheme`, and `data-dk-theme="light"` or `"dark"` on any element forces a subtree. The theme no longer sets `color-scheme` on your page's `:root`.
- Accent presets: `data-dk-accent="indigo"` (default), `"teal"`, `"violet"` or `"blue"` on any element. `--dk-accent` still takes any color, now on any subtree, and every color derived from it follows.
- Tokens: `--dk-surface`, `--dk-muted`, `--dk-border`, `--dk-text`, `--dk-text-muted`, `--dk-on-accent`, `--dk-accent-subtle` and `--dk-accent-text`. `--dk-accent-soft`, `--dk-accent-strong` and `--dk-focus-ring` are removed.
- `Combobox.Control` (optional) wraps the input, and the theme draws a search icon and a chevron on it. `Combobox.Count` shows the number of results.
- `MultiSelect.ChipRemove` shows an icon instead of a × character.
- Labels keep your page's text color. Popups never round more than 12px, whatever `--dk-radius` is.
