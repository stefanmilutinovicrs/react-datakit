---
'react-datakit': minor
---

Add `Sparkline` (`react-datakit/sparkline`), a small chart in plain SVG that renders the same on the server and in the browser. Its parts are `Line` (the default), `Area`, `Bars` (with `xScale="band"`), `Marker` (`at="min" | "max" | "first" | "last"` or an index) and `ReferenceLine`, each a single path with `data-dk-part`. Data is numbers or items read with `itemToValue`; `null`, `undefined` and `NaN` are gaps. `domain` sets the ends of the y axis. The SVG is an image named from `label` and a summary of the values (trend, low, high, last), formatted with `locale` and `formatOptions` and worded through `labels`, or `decorative` when the text next to it says enough. The headless hook is `useSparkline`.
