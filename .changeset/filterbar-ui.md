---
'react-datakit': minor
---

Add the experimental `FilterBar` (`react-datakit/filterbar`): filters as chips of field, operator and value, on the field schema from `react-datakit/filterbar/schema`. The bar is a WAI-ARIA toolbar with one Tab stop; the operator is a menu button and the value opens a modal dialog with the editor of the field type. Text and enum fields have built-in editors; other types take an editor from the new `editors` prop. The field picker is a Combobox grouped by each field's `group`. The value holds only complete filters, so it can go straight to `filtersToSearchParams`. The client build imports the schema entry instead of bundling a copy, so apps that also parse the URL on the server ship it once.
