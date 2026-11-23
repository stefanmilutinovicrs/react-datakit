---
'react-datakit': minor
---

`useCombobox` and `useMultiSelect` return prop getters for every part: `getPopupProps`, `getEmptyProps`, `getLoadingProps`, `getErrorProps` and, in `useMultiSelect`, `getChipsOverflowProps`. Headless users can now render these parts with the same attributes as the built-in ones.
