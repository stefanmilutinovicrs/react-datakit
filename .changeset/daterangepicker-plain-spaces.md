---
'react-datakit': patch
---

Fix a hydration mismatch in `DateRangePicker` with a server-rendered value: the formatted value, month headings, day labels and the visible months label now use plain spaces. Node's ICU puts thin spaces around the range dash ("Mar 10 – 14, 2026") where browsers may put plain ones, so the server text did not match the client's.
