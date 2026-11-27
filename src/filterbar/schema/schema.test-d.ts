import { expectTypeOf } from 'vitest';
import {
  dateField,
  enumField,
  filtersFromSearchParams,
  filtersToSearchParams,
  multiEnumField,
  numberField,
  textField,
  textOperators,
  type FilterDateRange,
  type Filter,
} from './index';

interface User {
  id: number;
  name: string;
}
const users: User[] = [{ id: 1, name: 'Ana' }];

const fields = [
  textField({
    key: 'title',
    label: 'Title',
    operators: [...textOperators, { key: 'isEmpty', label: 'is empty', arity: 'none' }],
  }),
  numberField({ key: 'estimate', label: 'Estimate' }),
  dateField({ key: 'created', label: 'Created' }),
  enumField({
    key: 'owner',
    label: 'Owner',
    items: users,
    itemToKey: (user) => user.id,
    itemToString: (user) => user?.name ?? '',
  }),
  multiEnumField({
    key: 'owners',
    label: 'Owners',
    items: users,
    itemToKey: (user) => user.id,
    itemToString: (user) => user?.name ?? '',
  }),
];
type IssueFilter = Filter<typeof fields>;

expectTypeOf<IssueFilter['field']>().toEqualTypeOf<'title' | 'estimate' | 'created' | 'owner' | 'owners'>();
expectTypeOf<Extract<IssueFilter, { field: 'title' }>['op']>().toEqualTypeOf<
  'contains' | 'notContains' | 'is' | 'isNot' | 'isEmpty'
>();
expectTypeOf<Extract<IssueFilter, { field: 'title'; op: 'contains' }>>().toEqualTypeOf<{
  readonly field: 'title';
  readonly op: 'contains';
  readonly value: string;
}>();
expectTypeOf<Extract<IssueFilter, { field: 'title'; op: 'isEmpty' }>>().toEqualTypeOf<{
  readonly field: 'title';
  readonly op: 'isEmpty';
}>();
expectTypeOf<Extract<IssueFilter, { field: 'estimate'; op: 'gt' }>['value']>().toEqualTypeOf<number>();
expectTypeOf<Extract<IssueFilter, { field: 'estimate'; op: 'between' }>['value']>().toEqualTypeOf<
  readonly [number, number]
>();
expectTypeOf<Extract<IssueFilter, { field: 'created' }>['value']>().toEqualTypeOf<FilterDateRange>();
expectTypeOf<Extract<IssueFilter, { field: 'owner' }>['value']>().toEqualTypeOf<string>();
expectTypeOf<Extract<IssueFilter, { field: 'owners' }>['value']>().toEqualTypeOf<readonly string[]>();

expectTypeOf(filtersFromSearchParams('', fields).filters).toEqualTypeOf<IssueFilter[]>();

filtersToSearchParams([{ field: 'estimate', op: 'between', value: [1, 2] }], fields);
// @ts-expect-error: `between` takes two numbers
filtersToSearchParams([{ field: 'estimate', op: 'between', value: 1 }], fields);
// @ts-expect-error: `owner` has no `isAnyOf`
filtersToSearchParams([{ field: 'owner', op: 'isAnyOf', value: ['1'] }], fields);
// @ts-expect-error: unknown field
filtersToSearchParams([{ field: 'priority', op: 'is', value: 'high' }], fields);

// @ts-expect-error: the default operator must be one of the field's operators
textField({ key: 'a', label: 'A', defaultOperator: 'gt' });
