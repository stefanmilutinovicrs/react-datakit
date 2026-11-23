---
'react-datakit': minor
---

`MultiSelect` chips that don't fit are no longer hidden from screen readers and keyboard users.

- While focus is anywhere in the component, every chip is shown and chips wrap (`data-expanded` on `Control` and `Chips`); "+N more" is shown only while focus is outside.
- Chips that don't fit stay in the accessibility tree. The default theme cuts the row at the last chip that fits with `--dk-chips-visible-width` instead of `visibility: hidden`. Without the theme chips simply wrap.
- `ChipsOverflow` has `aria-hidden="true"`, since the chips themselves are announced.
- Removing a chip with its remove button, Backspace or Delete is announced ("{item} removed").
- New `labels` option for the screen reader texts: `selected`, `remove(item)` and `removed(item)`.
