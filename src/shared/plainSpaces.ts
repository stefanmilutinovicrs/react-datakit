// ICU versions differ in the spaces they put in formatted dates and numbers (Node 24 puts thin
// spaces around a range dash where Chromium puts plain ones, and grouping in fr-FR is a narrow
// no-break space), so server-rendered text would not match the client's when it hydrates. Plain
// spaces are the same everywhere.
export const plainSpaces = (text: string): string => text.replace(/\s/g, ' ');
