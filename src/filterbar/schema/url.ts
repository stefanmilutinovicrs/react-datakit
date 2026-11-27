import { isDev } from '../../shared/isDev';
import {
  checkFields,
  checkValue,
  findField,
  validateFilter,
  type AnyFilterField,
  type Filter,
  type UntypedFilter,
} from './fields';

/** A query string (with or without `?`), `URLSearchParams`, or the `searchParams` object of a Next.js page. */
export type SearchParamsInput =
  string | URLSearchParams | Readonly<Record<string, string | readonly string[] | undefined>>;

export interface FilterUrlOptions {
  /** Name of the repeated query parameter. Default `filter`. */
  param?: string | undefined;
}

export type FilterUrlErrorReason = 'malformed' | 'unknown-field' | 'unknown-operator' | 'invalid-value';

/** An entry of the URL that was left out of the filters. */
export interface FilterUrlError {
  /** The raw value of the parameter, e.g. `status.is.archived`. */
  entry: string;
  reason: FilterUrlErrorReason;
  message?: string;
}

function toParams(input: SearchParamsInput | undefined): URLSearchParams {
  if (input === undefined || typeof input === 'string' || input instanceof URLSearchParams)
    return new URLSearchParams(input);
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(input)) {
    if (typeof value === 'string') params.append(name, value);
    else if (value) for (const item of value) params.append(name, item);
  }
  return params;
}

// Only list items need escaping: a single value is everything after the operator, so it may hold dots, and range
// ends are numbers or dates, which never hold "..".
const escapeItem = (item: string) => item.replace(/[%,]/g, (char) => (char === '%' ? '%25' : '%2C'));
const unescapeItem = (item: string) => item.replace(/%(25|2C)/gi, (escaped) => (escaped === '%25' ? '%' : ','));

function serialize(field: AnyFilterField, filter: UntypedFilter, arity: string): string {
  const head = `${field.key}.${filter.op}`;
  const value = filter.value;
  if (arity === 'none') return head;
  if (!Array.isArray(value)) return `${head}.${field.serializeValue(value)}`;
  const parts = value.map((item) => field.serializeValue(item));
  return `${head}.${arity === 'range' ? parts.join('..') : parts.map(escapeItem).join(',')}`;
}

/**
 * Writes the filters to `URLSearchParams`, one `filter=field.op.value` entry each, keeping the other parameters of
 * `base`. Invalid filters are left out.
 *
 * @experimental
 */
export function filtersToSearchParams<const TFields extends readonly AnyFilterField[]>(
  filters: readonly Filter<TFields>[],
  fields: TFields,
  base?: SearchParamsInput,
  options: FilterUrlOptions = {},
): URLSearchParams {
  const param = options.param ?? 'filter';
  const params = toParams(base);
  params.delete(param);
  for (const filter of filters as readonly UntypedFilter[]) {
    const problem = validateFilter(filter, fields);
    const field = findField(fields, filter.field);
    const op = field?.operators.find((candidate) => candidate.key === filter.op);
    if (problem || !field || !op) {
      if (isDev()) console.error('react-datakit: left an invalid filter out of the URL.', filter, problem);
      continue;
    }
    params.append(param, serialize(field, filter, op.arity ?? 'single'));
  }
  return params;
}

/**
 * Reads the filters from a URL. Entries with an unknown field or operator, or an invalid value, are left out and
 * listed in `errors`; it never throws.
 *
 * @experimental
 */
export function filtersFromSearchParams<const TFields extends readonly AnyFilterField[]>(
  input: SearchParamsInput,
  fields: TFields,
  options: FilterUrlOptions = {},
): { filters: Filter<TFields>[]; errors: FilterUrlError[] } {
  checkFields(fields);
  const filters: UntypedFilter[] = [];
  const errors: FilterUrlError[] = [];
  const fail = (entry: string, reason: FilterUrlErrorReason, message?: string) => {
    errors.push(message === undefined ? { entry, reason } : { entry, reason, message });
  };

  for (const entry of toParams(input).getAll(options.param ?? 'filter')) {
    const fieldEnd = entry.indexOf('.');
    const opEnd = entry.indexOf('.', fieldEnd + 1);
    const fieldKey = entry.slice(0, Math.max(fieldEnd, 0));
    const opKey = opEnd < 0 ? entry.slice(fieldEnd + 1) : entry.slice(fieldEnd + 1, opEnd);
    const text = opEnd < 0 ? undefined : entry.slice(opEnd + 1);
    if (fieldEnd <= 0 || opKey === '') {
      fail(entry, 'malformed');
      continue;
    }
    const field = findField(fields, fieldKey);
    if (!field) {
      fail(entry, 'unknown-field');
      continue;
    }
    const op = field.operators.find((candidate) => candidate.key === opKey);
    if (!op) {
      fail(entry, 'unknown-operator');
      continue;
    }

    const arity = op.arity ?? 'single';
    let value: unknown;
    if (arity === 'none' && text !== undefined) {
      fail(entry, 'invalid-value', 'This operator takes no value');
      continue;
    }
    if (arity !== 'none') {
      if (text === undefined) {
        fail(entry, 'invalid-value', 'Enter a value');
        continue;
      }
      if (arity === 'single') value = field.parseValue(text);
      else if (arity === 'range') {
        const split = text.indexOf('..');
        const ends = split < 0 ? [] : [text.slice(0, split), text.slice(split + 2)].map((end) => field.parseValue(end));
        value = ends.length === 2 && !ends.includes(undefined) ? ends : undefined;
      } else {
        // A bad item is dropped on its own, so one renamed option doesn't drop the whole filter.
        const seen = new Set<string>();
        const items: unknown[] = [];
        for (const raw of text.split(',')) {
          const item = field.parseValue(unescapeItem(raw));
          const problem = item === undefined ? undefined : checkValue(field, op, [item]);
          if (item === undefined || problem) {
            fail(entry, 'invalid-value', problem?.message ?? `Unknown value "${unescapeItem(raw)}"`);
            continue;
          }
          const key = field.serializeValue(item);
          if (!seen.has(key)) items.push(item);
          seen.add(key);
        }
        if (items.length === 0) {
          if (!errors.some((error) => error.entry === entry)) fail(entry, 'invalid-value', 'Pick at least one value');
          continue;
        }
        value = items;
      }
      if (value === undefined) {
        fail(entry, 'invalid-value', `Unreadable value "${text}"`);
        continue;
      }
    }

    const filter: UntypedFilter =
      arity === 'none' ? { field: field.key, op: op.key } : { field: field.key, op: op.key, value };
    const problem = checkValue(field, op, filter.value);
    if (problem) fail(entry, 'invalid-value', problem.message);
    else filters.push(filter);
  }
  return { filters: filters as Filter<TFields>[], errors };
}
