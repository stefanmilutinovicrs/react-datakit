---
'react-datakit': patch
---

MultiSelect: a single click on a chip's remove button always removes the chip. The button no longer takes focus on mousedown, which expanded the chips and could move the button away before mouseup; focus still goes to the input after the click.
