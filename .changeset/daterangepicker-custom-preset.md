---
'react-datakit': minor
---

`DateRangePicker` shows which preset the value matches, including a range picked in the calendar, and adds `DateRangePicker.CustomPreset` for any other range.

- `CustomPreset` is a button (text "Custom" by default, set it with children) that is pressed (`aria-pressed`, `data-selected`) when the value matches no preset. A click keeps the value and moves focus to the start of the range in the calendar, or to today when the value is empty.
- `Presets` ends with a `CustomPreset`, also with your own children. `custom={…}` renders another node in its place, and `custom={null}` renders none.
- `Presets` gets `data-custom` and `custom` in its state when the value matches no preset. With an empty value nothing is pressed.
- The hook returns `isCustomRange` and `getCustomPresetProps()`.
