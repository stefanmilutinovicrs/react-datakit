// No directive: the server page parses the URL with these fields, and the client bar renders them.
import { dateField, enumField, multiEnumField, numberField, textField } from 'react-datakit/filterbar/schema';
import type { Filter } from 'react-datakit/filterbar/schema';

export const statuses = [
  { id: 'open', name: 'Open' },
  { id: 'done', name: 'Done' },
];
export const people = [
  { id: 'ana', name: 'Ana' },
  { id: 'bojan', name: 'Bojan' },
];

export const fields = [
  textField({ key: 'title', label: 'Title' }),
  enumField({
    key: 'status',
    label: 'Status',
    items: statuses,
    itemToKey: (s) => s.id,
    itemToString: (s) => s?.name ?? '',
  }),
  multiEnumField({
    key: 'owner',
    label: 'Owner',
    items: people,
    itemToKey: (p) => p.id,
    itemToString: (p) => p?.name ?? '',
  }),
  numberField({ key: 'estimate', label: 'Estimate', integer: true, min: 0 }),
  dateField({ key: 'created', label: 'Created', timeZone: 'UTC' }),
];
export type IssueFilter = Filter<typeof fields>;
