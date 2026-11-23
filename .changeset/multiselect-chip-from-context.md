---
'react-datakit': minor
---

`MultiSelect.Chip` reads its item from `MultiSelect.Chips`, like `MultiSelect.ChipRemove` already did. Remove the `item` prop: `<MultiSelect.Chip item={user}>` becomes `<MultiSelect.Chip>`. `MultiSelectChipProps` no longer takes a type argument.
