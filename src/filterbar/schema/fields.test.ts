import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dateField,
  enumField,
  formatFilterValue,
  multiEnumField,
  numberField,
  textField,
  toDateRange,
  validateFilter,
  type UntypedFilter,
} from './fields';
import { numberOperators, textOperators } from './operators';

const users = [
  { id: 1, name: 'Ana' },
  { id: 2, name: 'Bojan' },
];
const fields = [
  textField({ key: 'title', label: 'Title', maxLength: 5 }),
  numberField({ key: 'estimate', label: 'Estimate', min: 0, max: 10, integer: true }),
  numberField({ key: 'price', label: 'Price' }),
  dateField({ key: 'created', label: 'Created', timeZone: 'Europe/Belgrade' }),
  enumField({ key: 'owner', label: 'Owner', items: users, itemToKey: (u) => u.id, itemToString: (u) => u?.name ?? '' }),
  multiEnumField({
    key: 'owners',
    label: 'Owners',
    items: users,
    itemToKey: (u) => u.id,
    itemToString: (u) => u?.name ?? '',
  }),
];
const check = (filter: UntypedFilter) => validateFilter(filter, fields)?.code ?? null;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('built-in fields', () => {
  it('use the built-in operators by default, the first one as the default', () => {
    expect(textField({ key: 'a', label: 'A' }).operators).toBe(textOperators);
    expect(numberField({ key: 'a', label: 'A' }).operators).toBe(numberOperators);
    expect(textField({ key: 'a', label: 'A' }).defaultOperator).toBeUndefined();
  });

  it('keep their options for the editors', () => {
    const [, estimate, , created, owner] = fields;
    expect(estimate).toMatchObject({ type: 'number', min: 0, max: 10, integer: true });
    expect(created).toMatchObject({ type: 'date', timeZone: 'Europe/Belgrade' });
    expect(owner).toMatchObject({ type: 'enum', items: users });
    expect(fields[5]?.type).toBe('multiEnum');
  });

  it('find enum items by their key as a string', () => {
    const owner = enumField({
      key: 'o',
      label: 'O',
      items: users,
      itemToKey: (u) => u.id,
      itemToString: (u) => u?.name ?? '',
    });
    expect(owner.getItem('2')).toBe(users[1]);
    expect(owner.getItem('3')).toBeUndefined();
  });
});

describe('validateFilter', () => {
  it.each<[UntypedFilter, string | null]>([
    [{ field: 'title', op: 'contains', value: 'bug' }, null],
    [{ field: 'title', op: 'contains', value: '   ' }, 'required'],
    [{ field: 'title', op: 'contains', value: 'toolong' }, 'too-long'],
    [{ field: 'title', op: 'contains' }, 'required'],
    [{ field: 'estimate', op: 'gt', value: 3 }, null],
    [{ field: 'estimate', op: 'gt', value: 3.5 }, 'not-integer'],
    [{ field: 'estimate', op: 'gt', value: -1 }, 'too-small'],
    [{ field: 'estimate', op: 'gt', value: 11 }, 'too-large'],
    [{ field: 'price', op: 'gt', value: Number.NaN }, 'invalid'],
    [{ field: 'price', op: 'between', value: [1, 2] }, null],
    [{ field: 'price', op: 'between', value: [2, 1] }, 'range-order'],
    [{ field: 'price', op: 'between', value: [1] }, 'invalid'],
    [{ field: 'price', op: 'between', value: 1 }, 'invalid'],
    [{ field: 'created', op: 'between', value: { start: '2026-03-01', end: '2026-03-14' } }, null],
    [{ field: 'created', op: 'between', value: { start: '2026-02-29', end: '2026-03-01' } }, 'invalid-date'],
    [{ field: 'created', op: 'between', value: { start: '2026-03-14', end: '2026-03-01' } }, 'range-order'],
    [{ field: 'owner', op: 'is', value: '1' }, null],
    [{ field: 'owner', op: 'is', value: '3' }, 'unknown-item'],
    [{ field: 'owners', op: 'isAnyOf', value: ['1', '2'] }, null],
    [{ field: 'owners', op: 'isAnyOf', value: [] }, 'required'],
    [{ field: 'owners', op: 'isAnyOf', value: ['1', '3'] }, 'unknown-item'],
    [{ field: 'nope', op: 'is', value: '1' }, 'unknown-field'],
    [{ field: 'owner', op: 'isAnyOf', value: ['1'] }, 'unknown-operator'],
  ])('%o → %s', (filter, code) => {
    expect(check(filter)).toBe(code);
  });

  it('runs a custom validate after the built-in checks', () => {
    const validate = vi.fn((value: number) => (value % 2 === 0 ? null : 'Use an even number'));
    const even = [numberField({ key: 'n', label: 'N', min: 0, validate })];
    expect(validateFilter({ field: 'n', op: 'gt', value: 3 }, even)).toEqual({
      code: 'custom',
      message: 'Use an even number',
    });
    expect(validateFilter({ field: 'n', op: 'gt', value: -1 }, even)?.code).toBe('too-small');
    expect(validate).toHaveBeenCalledTimes(1);
  });

  it('accepts an operator without a value only when no value is given', () => {
    const withEmpty = [
      textField({ key: 't', label: 'T', operators: [{ key: 'isEmpty', label: 'is empty', arity: 'none' }] }),
    ];
    expect(validateFilter({ field: 't', op: 'isEmpty' }, withEmpty)).toBeNull();
    expect(validateFilter({ field: 't', op: 'isEmpty', value: 'x' }, withEmpty)?.code).toBe('invalid');
  });
});

describe('formatFilterValue', () => {
  it('formats numbers, ranges and lists for the locale', () => {
    expect(formatFilterValue({ field: 'price', op: 'gt', value: 1234.5 }, fields, { locale: 'en-US' })).toBe('1,234.5');
    expect(formatFilterValue({ field: 'price', op: 'gt', value: 1234.5 }, fields, { locale: 'de-DE' })).toBe('1.234,5');
    expect(formatFilterValue({ field: 'price', op: 'between', value: [1, 5] }, fields, { locale: 'en-US' })).toBe(
      '1 – 5',
    );
    expect(formatFilterValue({ field: 'owners', op: 'isAnyOf', value: ['1', '2'] }, fields)).toBe('Ana, Bojan');
    expect(formatFilterValue({ field: 'owner', op: 'is', value: '9' }, fields)).toBe('9');
  });

  it('formats a date range with the same days in every time zone', () => {
    const value = { start: '2026-03-01', end: '2026-03-14' };
    // Plain spaces only: ICU versions put thin or no-break spaces here differently, and the text
    // must be the same on the server and in the browser for hydration.
    const text = formatFilterValue({ field: 'created', op: 'between', value }, fields, { locale: 'en-US' });
    expect(text).toBe('Mar 1 – 14, 2026');
    expect(formatFilterValue({ field: 'price', op: 'gt', value: 1234.5 }, fields, { locale: 'fr-FR' })).toBe('1 234,5');
    expect(
      formatFilterValue(
        { field: 'created', op: 'between', value: { start: '2026-03-01', end: '2026-03-01' } },
        fields,
        {
          locale: 'en-US',
        },
      ),
    ).toBe('Mar 1, 2026');
  });

  it('is empty for an unknown field or an operator without a value', () => {
    expect(formatFilterValue({ field: 'nope', op: 'is', value: 'x' }, fields)).toBe('');
    expect(formatFilterValue({ field: 'title', op: 'contains' }, fields)).toBe('');
  });
});

describe('toDateRange', () => {
  it('covers whole days in the time zone, across a DST change', () => {
    // Belgrade moves from UTC+1 to UTC+2 on 2026-03-29.
    const { start, end } = toDateRange({ start: '2026-03-28', end: '2026-03-29' }, 'Europe/Belgrade');
    expect(start.toISOString()).toBe('2026-03-27T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-29T21:59:59.999Z');
  });

  it('throws for an invalid value', () => {
    expect(() => toDateRange({ start: '2026-02-30', end: '2026-03-01' }, 'UTC')).toThrow(RangeError);
  });
});

describe('development checks', () => {
  it('report keys that a URL cannot hold and keys used twice, once per fields array', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = [
      textField({ key: 'a.b', label: 'A' }),
      textField({ key: 'c', label: 'C', aliases: ['d'] }),
      textField({ key: 'd', label: 'D', operators: [{ key: 'has space', label: 'x' }] }),
    ];
    validateFilter({ field: 'c', op: 'is', value: 'x' }, bad);
    validateFilter({ field: 'c', op: 'is', value: 'x' }, bad);
    expect(error.mock.calls.map(([message]) => String(message))).toEqual([
      expect.stringContaining('"a.b"'),
      expect.stringContaining('two filter fields use the key "d"'),
      expect.stringContaining('"has space"'),
    ]);
  });
});
