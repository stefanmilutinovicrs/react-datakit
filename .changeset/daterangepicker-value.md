---
'react-datakit': minor
---

`DateRangePicker.Value` is a new part: the picked range (or a placeholder) inside the trigger, with `className`, `style`, `render`, a ref and `data-placeholder`. `Trigger` renders it by default, so existing code looks and is announced the same. Render it yourself to add an icon to the trigger; the button's name stays the label plus the value. Trigger `children` are no longer wrapped in a hidden span. The hook adds `registerValue`.
