---
'react-datakit': patch
---

`MultiSelect`: a rejected `onCreate` promise no longer causes an unhandled rejection. Nothing is added, the error is logged in development, and the user can create the value again.
