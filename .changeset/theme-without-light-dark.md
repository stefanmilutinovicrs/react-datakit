---
'react-datakit': patch
---

Fix the default theme in Next.js and Vite builds. Their CSS step (Lightning CSS) transpiles `light-dark()` for older browsers, which left every theme color empty or ignored `data-dk-theme` on a subtree. The theme now resolves its colors on each part without `light-dark()`, which also makes it work in Safari 16.2 to 17.4. Tokens, `data-dk-theme` and `data-dk-accent` work as before. The color tokens are now only readable inside components, unless you set them yourself.
