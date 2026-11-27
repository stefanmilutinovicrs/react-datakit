import { endOfDayInZone, fromDateKey, getLocalTimeZone, startOfDayInZone } from '../../shared/date';
import { isDev } from '../../shared/isDev';
import {
  dateOperators,
  enumOperators,
  multiEnumOperators,
  numberOperators,
  textOperators,
  type FilterOperator,
} from './operators';

/** A range of whole calendar days, both ends included, as `YYYY-MM-DD`; no time zone. */
export interface FilterDateRange {
  readonly start: string;
  readonly end: string;
}

export type FilterIssueCode =
  | 'unknown-field'
  | 'unknown-operator'
  | 'invalid'
  | 'required'
  | 'too-long'
  | 'not-integer'
  | 'too-small'
  | 'too-large'
  | 'range-order'
  | 'invalid-date'
  | 'unknown-item'
  | 'custom';

/** Why a filter is not valid. `message` is English; use `code` to show your own text. */
export interface FilterIssue {
  readonly code: FilterIssueCode;
  readonly message: string;
}

export interface FilterFormatContext {
  /** BCP 47 locale. Default: the runtime's locale. */
  locale?: string | undefined;
}

/**
 * A field of the filter bar. Built-in fields come from `textField`, `numberField`, `dateField`, `enumField`
 * and `multiEnumField`; a custom type is any object of this shape.
 *
 * @experimental
 */
export interface FilterField<
  TKey extends string = string,
  TType extends string = string,
  TValue = unknown,
  TOps extends readonly FilterOperator[] = readonly FilterOperator[],
> {
  /** Stable key used in the value and the URL: letters, digits, `_` and `-`. */
  readonly key: TKey;
  readonly label: string;
  /** Group heading in the field picker. */
  readonly group?: string | undefined;
  /** Former keys still accepted when reading a URL; the current key is written back. */
  readonly aliases?: readonly string[] | undefined;
  /** Picks the value editor. */
  readonly type: TType;
  readonly operators: TOps;
  /** Operator of a new filter. Default: the first one. */
  readonly defaultOperator?: TOps[number]['key'] | undefined;
  /** Checks one value: each end of a range, each item of a list. Returns null when it is valid. */
  validate?(value: TValue, op: TOps[number]['key']): FilterIssue | string | null;
  /** Orders two values, so a range can be checked. */
  compare?(a: TValue, b: TValue): number;
  /** Visible text of one value. */
  format(value: TValue, context: FilterFormatContext): string;
  serializeValue(value: TValue): string;
  /** Returns `undefined` for text that is not a value. */
  parseValue(text: string): TValue | undefined;
}

export type AnyFilterField = FilterField;

type ValueFor<TValue, TOp> = TOp extends { readonly arity: 'range' }
  ? readonly [TValue, TValue]
  : TOp extends { readonly arity: 'list' }
    ? readonly TValue[]
    : TValue;

type FilterForOperator<TKey extends string, TValue, TOp> =
  TOp extends FilterOperator<infer TOpKey>
    ? TOp extends { readonly arity: 'none' }
      ? { readonly field: TKey; readonly op: TOpKey }
      : { readonly field: TKey; readonly op: TOpKey; readonly value: ValueFor<TValue, TOp> }
    : never;

/** The filters one field can produce. */
export type FilterOf<TField> =
  TField extends FilterField<infer TKey, string, infer TValue, infer TOps>
    ? FilterForOperator<TKey, TValue, TOps[number]>
    : never;

/**
 * One applied filter of the given fields; `value` narrows by `field` and `op`.
 *
 * @experimental
 */
export type Filter<TFields extends readonly AnyFilterField[]> = FilterOf<TFields[number]>;

/** A filter of any field, for code that doesn't know the schema. */
export interface UntypedFilter {
  readonly field: string;
  readonly op: string;
  readonly value?: unknown;
}

interface FieldOptions<TKey extends string, TOps extends readonly FilterOperator[], TValue> {
  key: TKey;
  label: string;
  group?: string | undefined;
  aliases?: readonly string[] | undefined;
  /** Default: the built-in operators of the type. */
  operators?: TOps | undefined;
  defaultOperator?: TOps[number]['key'] | undefined;
  /** Runs after the built-in checks; returns an error message, or null when the value is valid. */
  validate?: ((value: TValue, op: TOps[number]['key']) => string | null) | undefined;
}

function issue(code: FilterIssueCode, message: string): FilterIssue {
  return { code, message };
}

function toIssue(result: FilterIssue | string | null | undefined): FilterIssue | null {
  return typeof result === 'string' ? issue('custom', result) : (result ?? null);
}

function baseField<TKey extends string, TType extends string, TValue, TOps extends readonly FilterOperator[]>(
  type: TType,
  options: FieldOptions<TKey, TOps, TValue>,
  defaultOperators: TOps,
  check: (value: TValue) => FilterIssue | null,
) {
  const { validate, ...rest } = options;
  return {
    ...rest,
    type,
    operators: options.operators ?? defaultOperators,
    validate: (value: TValue, op: TOps[number]['key']) => check(value) ?? toIssue(validate?.(value, op)),
  };
}

export interface TextFilterField<TKey extends string, TOps extends readonly FilterOperator[]> extends FilterField<
  TKey,
  'text',
  string,
  TOps
> {
  readonly maxLength?: number | undefined;
}

/**
 * A free-text field; values must not be blank.
 *
 * @experimental
 */
export function textField<
  const TKey extends string,
  const TOps extends readonly FilterOperator[] = typeof textOperators,
>(options: FieldOptions<TKey, TOps, string> & { maxLength?: number | undefined }): TextFilterField<TKey, TOps> {
  const { maxLength } = options;
  return {
    ...baseField('text', options, textOperators as unknown as TOps, (value) =>
      value.trim() === ''
        ? issue('required', 'Enter a value')
        : maxLength !== undefined && value.length > maxLength
          ? issue('too-long', `Use at most ${maxLength} characters`)
          : null,
    ),
    format: (value) => value,
    serializeValue: (value) => value,
    parseValue: (text) => text,
  };
}

// ICU versions differ in the spaces they put in formatted dates and numbers (Node 24 puts thin
// spaces around a range dash where Chromium puts plain ones), so a server-rendered chip would not
// match the client's text when it hydrates. Plain spaces are the same everywhere.
const plainSpaces = (text: string) => text.replace(/\s/g, ' ');

const NUMBER = /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;
const numberFormats = new Map<string, Intl.NumberFormat>();

export interface NumberFilterField<TKey extends string, TOps extends readonly FilterOperator[]> extends FilterField<
  TKey,
  'number',
  number,
  TOps
> {
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly integer?: boolean | undefined;
}

/**
 * A number field. In the URL numbers use `.` as the decimal separator, whatever the locale.
 *
 * @experimental
 */
export function numberField<
  const TKey extends string,
  const TOps extends readonly FilterOperator[] = typeof numberOperators,
>(
  options: FieldOptions<TKey, TOps, number> & {
    min?: number | undefined;
    max?: number | undefined;
    /** Only whole numbers are valid. */
    integer?: boolean | undefined;
  },
): NumberFilterField<TKey, TOps> {
  const { min, max, integer } = options;
  return {
    ...baseField('number', options, numberOperators as unknown as TOps, (value) =>
      !Number.isFinite(value)
        ? issue('invalid', 'Enter a number')
        : integer && !Number.isInteger(value)
          ? issue('not-integer', 'Enter a whole number')
          : min !== undefined && value < min
            ? issue('too-small', `Enter ${min} or more`)
            : max !== undefined && value > max
              ? issue('too-large', `Enter ${max} or less`)
              : null,
    ),
    compare: (a, b) => a - b,
    format: (value, { locale }) => {
      const cacheKey = locale ?? '';
      let format = numberFormats.get(cacheKey);
      if (!format) {
        format = new Intl.NumberFormat(locale);
        numberFormats.set(cacheKey, format);
      }
      return plainSpaces(format.format(value));
    },
    serializeValue: String,
    parseValue: (text) => {
      if (!NUMBER.test(text)) return undefined;
      const value = Number(text);
      // `-0` would be written back as "0", so it is read as 0 to keep the round trip exact.
      return Number.isFinite(value) ? value + 0 : undefined;
    },
  };
}

const DATE_RANGE = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/;

function utcDay(text: string): number {
  const { year = 1970, month = 1, day = 1 } = fromDateKey(text) ?? {};
  return Date.UTC(year, month - 1, day);
}

export interface DateFilterField<TKey extends string, TOps extends readonly FilterOperator[]> extends FilterField<
  TKey,
  'date',
  FilterDateRange,
  TOps
> {
  /** IANA time zone in which the days are read, e.g. for `toDateRange`. Default: the runtime's zone. */
  readonly timeZone?: string | undefined;
}

/**
 * A field whose value is a range of whole days, stored as calendar dates so a link means the same days in every
 * time zone.
 *
 * @experimental
 */
export function dateField<
  const TKey extends string,
  const TOps extends readonly FilterOperator[] = typeof dateOperators,
>(options: FieldOptions<TKey, TOps, FilterDateRange> & { timeZone?: string | undefined }): DateFilterField<TKey, TOps> {
  return {
    ...baseField('date', options, dateOperators as unknown as TOps, ({ start, end }) =>
      !fromDateKey(start) || !fromDateKey(end)
        ? issue('invalid-date', 'Enter a valid date')
        : start > end
          ? issue('range-order', 'The start must not be after the end')
          : null,
    ),
    // The days are formatted as UTC dates, so the time zone of the runtime can't shift them.
    format: ({ start, end }, { locale }) => {
      const format = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
      return plainSpaces(start === end ? format.format(utcDay(start)) : format.formatRange(utcDay(start), utcDay(end)));
    },
    serializeValue: ({ start, end }) => `${start}..${end}`,
    parseValue: (text) => {
      const match = DATE_RANGE.exec(text);
      return match?.[1] && match[2] ? { start: match[1], end: match[2] } : undefined;
    },
  };
}

/**
 * The instants a date filter value covers in a time zone: the first instant of the first day and the last
 * instant of the last day, as `DateRangePicker` does.
 *
 * @experimental
 */
export function toDateRange(value: FilterDateRange, timeZone: string = getLocalTimeZone()): { start: Date; end: Date } {
  const start = fromDateKey(value.start);
  const end = fromDateKey(value.end);
  if (!start || !end) throw new RangeError(`react-datakit: invalid date range ${value.start}..${value.end}`);
  return { start: startOfDayInZone(start, timeZone), end: endOfDayInZone(end, timeZone) };
}

export interface EnumFilterField<
  TKey extends string,
  TType extends 'enum' | 'multiEnum',
  TItem,
  TOps extends readonly FilterOperator[],
> extends FilterField<TKey, TType, string, TOps> {
  readonly items: readonly TItem[];
  readonly itemToKey: (item: TItem) => string | number;
  readonly itemToString: (item: TItem | null) => string;
  readonly groupBy?: ((item: TItem) => string | null) | undefined;
  /** The item whose key, as a string, is `key`. */
  readonly getItem: (key: string) => TItem | undefined;
}

interface EnumFieldOptions<TKey extends string, TItem, TOps extends readonly FilterOperator[]> extends FieldOptions<
  TKey,
  TOps,
  string
> {
  items: readonly TItem[];
  /** Stable, unique key of an item; it is what the value and the URL store. */
  itemToKey: (item: TItem) => string | number;
  itemToString: (item: TItem | null) => string;
  /** Groups the options in the value editor. */
  groupBy?: ((item: TItem) => string | null) | undefined;
}

function enumLike<
  TKey extends string,
  TType extends 'enum' | 'multiEnum',
  TItem,
  TOps extends readonly FilterOperator[],
>(
  type: TType,
  options: EnumFieldOptions<TKey, TItem, TOps>,
  defaultOperators: TOps,
): EnumFilterField<TKey, TType, TItem, TOps> {
  const { items, itemToKey, itemToString } = options;
  let byKey: Map<string, TItem> | undefined;
  const getItem = (key: string) => {
    byKey ??= new Map(items.map((item) => [String(itemToKey(item)), item]));
    return byKey.get(key);
  };
  return {
    ...baseField(type, options, defaultOperators, (value) =>
      getItem(value) === undefined ? issue('unknown-item', 'Pick one of the options') : null,
    ),
    items,
    itemToKey,
    itemToString,
    groupBy: options.groupBy,
    getItem,
    format: (value) => {
      const item = getItem(value);
      return item === undefined ? value : itemToString(item);
    },
    serializeValue: (value) => value,
    parseValue: (text) => (text === '' ? undefined : text),
  };
}

/**
 * A field with one option out of a list; the value is the option's key.
 *
 * @experimental
 */
export function enumField<
  const TKey extends string,
  TItem,
  const TOps extends readonly FilterOperator[] = typeof enumOperators,
>(options: EnumFieldOptions<TKey, TItem, TOps>): EnumFilterField<TKey, 'enum', TItem, TOps> {
  return enumLike('enum', options, enumOperators as unknown as TOps);
}

/**
 * A field with several options out of a list; the value is the list of their keys.
 *
 * @experimental
 */
export function multiEnumField<
  const TKey extends string,
  TItem,
  const TOps extends readonly FilterOperator[] = typeof multiEnumOperators,
>(options: EnumFieldOptions<TKey, TItem, TOps>): EnumFilterField<TKey, 'multiEnum', TItem, TOps> {
  return enumLike('multiEnum', options, multiEnumOperators as unknown as TOps);
}

const KEY = /^[A-Za-z0-9_-]+$/;
const checkedFields = new WeakSet<object>();

/** Reports keys that can't be written to a URL, or that two fields share, once per fields array. */
export function checkFields(fields: readonly AnyFilterField[]): void {
  if (!isDev() || checkedFields.has(fields)) return;
  checkedFields.add(fields);
  const seen = new Set<string>();
  for (const field of fields) {
    for (const name of [field.key, ...(field.aliases ?? [])]) {
      if (!KEY.test(name))
        console.error(`react-datakit: filter field key "${name}" may only use letters, digits, "_" and "-".`);
      if (seen.has(name)) console.error(`react-datakit: two filter fields use the key "${name}".`);
      seen.add(name);
    }
    for (const op of field.operators)
      if (!KEY.test(op.key))
        console.error(`react-datakit: operator key "${op.key}" may only use letters, digits, "_" and "-".`);
  }
}

export function findField(fields: readonly AnyFilterField[], key: string): AnyFilterField | undefined {
  return fields.find((field) => field.key === key) ?? fields.find((field) => field.aliases?.includes(key));
}

/** Checks a value of an operator, as its arity expects; the value is not trusted to have the right shape. */
export function checkValue(field: AnyFilterField, op: FilterOperator, value: unknown): FilterIssue | null {
  const arity = op.arity ?? 'single';
  const one = (item: unknown) => toIssue(field.validate?.(item, op.key));
  if (arity === 'none') return value === undefined ? null : issue('invalid', 'This operator takes no value');
  if (arity === 'single') return value === undefined ? issue('required', 'Enter a value') : one(value);
  if (!Array.isArray(value)) return issue('invalid', 'Expected a list of values');
  if (arity === 'list') {
    if (value.length === 0) return issue('required', 'Pick at least one value');
    for (const item of value) {
      const found = one(item);
      if (found) return found;
    }
    return null;
  }
  const [from, to] = value as unknown[];
  if (value.length !== 2) return issue('invalid', 'Expected two values');
  const found = one(from) ?? one(to);
  if (found) return found;
  return field.compare && field.compare(from, to) > 0
    ? issue('range-order', 'The start must not be after the end')
    : null;
}

/**
 * Checks a filter against its field: the operator, the shape of the value and the field's rules.
 *
 * @experimental
 */
export function validateFilter<const TFields extends readonly AnyFilterField[]>(
  filter: Filter<TFields> | UntypedFilter,
  fields: TFields,
): FilterIssue | null {
  checkFields(fields);
  const field = findField(fields, filter.field);
  if (!field) return issue('unknown-field', `Unknown field "${filter.field}"`);
  const op = field.operators.find((candidate) => candidate.key === filter.op);
  if (!op) return issue('unknown-operator', `Unknown operator "${filter.op}"`);
  return checkValue(field, op, filter.value);
}

/**
 * Visible text of a filter's value, e.g. "Ana, Bojan" or "Mar 1 – 14, 2026"; empty for an operator without a
 * value.
 *
 * @experimental
 */
export function formatFilterValue<const TFields extends readonly AnyFilterField[]>(
  filter: Filter<TFields> | UntypedFilter,
  fields: TFields,
  context: FilterFormatContext = {},
): string {
  const field = findField(fields, filter.field);
  const op = field?.operators.find((candidate) => candidate.key === filter.op);
  if (!field || !op || filter.value === undefined) return '';
  const format = (value: unknown) => field.format(value, context);
  const arity = op.arity ?? 'single';
  if (arity === 'single' || !Array.isArray(filter.value)) return format(filter.value);
  const values = filter.value as unknown[];
  return arity === 'range' ? values.map(format).join(' – ') : values.map(format).join(', ');
}
