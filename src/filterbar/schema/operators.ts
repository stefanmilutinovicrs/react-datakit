/** `none`: no value (`isEmpty`); `single`: one value; `range`: a `[from, to]` pair; `list`: one or more values. */
export type FilterArity = 'none' | 'single' | 'range' | 'list';

export interface FilterOperator<TKey extends string = string, TArity extends FilterArity = FilterArity> {
  /** Stable key used in the value and the URL: letters, digits, `_` and `-`. */
  readonly key: TKey;
  /** Visible operator text, e.g. "is not". */
  readonly label: string;
  /** Default `single`. */
  readonly arity?: TArity | undefined;
}

export const textOperators = [
  { key: 'contains', label: 'contains', arity: 'single' },
  { key: 'notContains', label: 'does not contain', arity: 'single' },
  { key: 'is', label: 'is', arity: 'single' },
  { key: 'isNot', label: 'is not', arity: 'single' },
] as const satisfies readonly FilterOperator[];

export const numberOperators = [
  { key: 'eq', label: 'is', arity: 'single' },
  { key: 'neq', label: 'is not', arity: 'single' },
  { key: 'gt', label: 'is greater than', arity: 'single' },
  { key: 'gte', label: 'is at least', arity: 'single' },
  { key: 'lt', label: 'is less than', arity: 'single' },
  { key: 'lte', label: 'is at most', arity: 'single' },
  { key: 'between', label: 'is between', arity: 'range' },
] as const satisfies readonly FilterOperator[];

export const dateOperators = [
  { key: 'between', label: 'is between', arity: 'single' },
  { key: 'notBetween', label: 'is not between', arity: 'single' },
] as const satisfies readonly FilterOperator[];

export const enumOperators = [
  { key: 'is', label: 'is', arity: 'single' },
  { key: 'isNot', label: 'is not', arity: 'single' },
] as const satisfies readonly FilterOperator[];

export const multiEnumOperators = [
  { key: 'isAnyOf', label: 'is any of', arity: 'list' },
  { key: 'isNoneOf', label: 'is none of', arity: 'list' },
  { key: 'isAllOf', label: 'includes all of', arity: 'list' },
] as const satisfies readonly FilterOperator[];
