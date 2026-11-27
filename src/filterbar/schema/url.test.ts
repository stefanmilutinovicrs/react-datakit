import { describe, expect, it, vi } from 'vitest';
import { dateField, enumField, multiEnumField, numberField, textField, type Filter } from './fields';
import { textOperators } from './operators';
import { filtersFromSearchParams, filtersToSearchParams } from './url';

const statuses = [
  { id: 'open', name: 'Open' },
  { id: 'closed', name: 'Closed' },
];
const users = [
  { id: 1, name: 'Ana' },
  { id: 2, name: 'Bojan' },
  { id: 'a,b%c', name: 'Odd key' },
];

const fields = [
  textField({
    key: 'title',
    label: 'Title',
    aliases: ['name'],
    operators: [...textOperators, { key: 'isEmpty', label: 'is empty', arity: 'none' }],
  }),
  numberField({ key: 'estimate', label: 'Estimate', min: 0, integer: true }),
  numberField({ key: 'price', label: 'Price' }),
  dateField({ key: 'created', label: 'Created' }),
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
    items: users,
    itemToKey: (u) => u.id,
    itemToString: (u) => u?.name ?? '',
  }),
];
type IssueFilter = Filter<typeof fields>;

const write = (filters: readonly IssueFilter[]) => filtersToSearchParams(filters, fields).getAll('filter');
const read = (...entries: string[]) =>
  filtersFromSearchParams(new URLSearchParams(entries.map((entry) => ['filter', entry])), fields);
const roundTrip = (filters: readonly IssueFilter[]) =>
  filtersFromSearchParams(filtersToSearchParams(filters, fields).toString(), fields);

describe('writing', () => {
  it('writes one field.op.value entry per filter, in order', () => {
    expect(
      write([
        { field: 'status', op: 'is', value: 'open' },
        { field: 'created', op: 'between', value: { start: '2026-03-01', end: '2026-03-14' } },
        { field: 'owner', op: 'isAnyOf', value: ['1', '2'] },
        { field: 'title', op: 'contains', value: 'login bug' },
        { field: 'estimate', op: 'between', value: [1, 5] },
        { field: 'title', op: 'isEmpty' },
      ]),
    ).toEqual([
      'status.is.open',
      'created.between.2026-03-01..2026-03-14',
      'owner.isAnyOf.1,2',
      'title.contains.login bug',
      'estimate.between.1..5',
      'title.isEmpty',
    ]);
  });

  it('reads like the URL shown in the spec', () => {
    const query = filtersToSearchParams(
      [
        { field: 'status', op: 'is', value: 'open' },
        { field: 'owner', op: 'isAnyOf', value: ['1', '2'] },
        { field: 'title', op: 'contains', value: 'login bug' },
      ],
      fields,
    ).toString();
    expect(query).toBe('filter=status.is.open&filter=owner.isAnyOf.1%2C2&filter=title.contains.login+bug');
  });

  it('keeps the other parameters of the base and replaces the old filters', () => {
    const params = filtersToSearchParams(
      [{ field: 'status', op: 'is', value: 'closed' }],
      fields,
      '?page=2&filter=status.is.open&sort=-created',
    );
    expect(params.toString()).toBe('page=2&sort=-created&filter=status.is.closed');
  });

  it('accepts a URLSearchParams or a Next.js searchParams object as the base, and does not change it', () => {
    const base = new URLSearchParams('page=2');
    filtersToSearchParams([], fields, base);
    expect(base.toString()).toBe('page=2');
    expect(filtersToSearchParams([], fields, { page: '2', tag: ['a', 'b'], none: undefined }).toString()).toBe(
      'page=2&tag=a&tag=b',
    );
  });

  it('uses a custom parameter name', () => {
    const params = filtersToSearchParams([{ field: 'status', op: 'is', value: 'open' }], fields, 'f=old', {
      param: 'f',
    });
    expect(params.toString()).toBe('f=status.is.open');
  });

  it('skips an invalid filter and reports it in development', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(
      write([
        { field: 'estimate', op: 'gt', value: 1.5 },
        { field: 'status', op: 'is', value: 'open' },
      ]),
    ).toEqual(['status.is.open']);
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});

describe('round trip', () => {
  it.each<IssueFilter>([
    { field: 'title', op: 'contains', value: 'a.b..c' },
    { field: 'title', op: 'is', value: 'Ünïcødé 🚀 + 100% & =?#' },
    { field: 'title', op: 'notContains', value: 'a,b' },
    { field: 'title', op: 'isEmpty' },
    { field: 'estimate', op: 'gte', value: 0 },
    { field: 'price', op: 'lt', value: -2.75 },
    { field: 'price', op: 'between', value: [-5, -1] },
    { field: 'price', op: 'eq', value: 1e21 },
    { field: 'price', op: 'eq', value: 1e-7 },
    { field: 'created', op: 'notBetween', value: { start: '2024-02-29', end: '2024-02-29' } },
    { field: 'status', op: 'isNot', value: 'closed' },
    { field: 'owner', op: 'isNoneOf', value: ['a,b%c', '2'] },
    { field: 'owner', op: 'isAllOf', value: ['2'] },
  ])('keeps %o', (filter) => {
    expect(roundTrip([filter])).toEqual({ filters: [filter], errors: [] });
  });

  it('keeps order and duplicate filters', () => {
    const filters: IssueFilter[] = [
      { field: 'price', op: 'gt', value: 1 },
      { field: 'status', op: 'is', value: 'open' },
      { field: 'price', op: 'lt', value: 5 },
      { field: 'price', op: 'gt', value: 1 },
    ];
    expect(roundTrip(filters).filters).toEqual(filters);
  });

  it('escapes "," and "%" inside list items so the URL keeps them apart', () => {
    expect(write([{ field: 'owner', op: 'isAnyOf', value: ['a,b%c', '1'] }])).toEqual(['owner.isAnyOf.a%2Cb%25c,1']);
  });
});

describe('reading', () => {
  it('accepts a query string with or without "?", URLSearchParams and Next.js searchParams', () => {
    const expected = [{ field: 'status', op: 'is', value: 'open' }];
    expect(filtersFromSearchParams('?filter=status.is.open', fields).filters).toEqual(expected);
    expect(filtersFromSearchParams('filter=status.is.open', fields).filters).toEqual(expected);
    expect(filtersFromSearchParams(new URLSearchParams('filter=status.is.open'), fields).filters).toEqual(expected);
    expect(filtersFromSearchParams({ filter: 'status.is.open' }, fields).filters).toEqual(expected);
    expect(filtersFromSearchParams({ filter: ['status.is.open', 'price.gt.1'] }, fields).filters).toHaveLength(2);
    expect(filtersFromSearchParams({ other: 'x', filter: undefined }, fields)).toEqual({ filters: [], errors: [] });
  });

  it('reads a custom parameter name and ignores the others', () => {
    expect(filtersFromSearchParams('f=status.is.open&filter=price.gt.1', fields, { param: 'f' }).filters).toEqual([
      { field: 'status', op: 'is', value: 'open' },
    ]);
  });

  it('reads an alias and returns the current key', () => {
    expect(read('name.contains.bug').filters).toEqual([{ field: 'title', op: 'contains', value: 'bug' }]);
    expect(filtersToSearchParams(read('name.contains.bug').filters, fields).toString()).toBe(
      'filter=title.contains.bug',
    );
  });

  it.each([
    ['', 'malformed'],
    ['status', 'malformed'],
    ['.is.open', 'malformed'],
    ['status..open', 'malformed'],
    ['priority.is.high', 'unknown-field'],
    ['status.equals.open', 'unknown-operator'],
    ['status.is', 'invalid-value'],
    ['status.is.', 'invalid-value'],
    ['status.is.archived', 'invalid-value'],
    ['title.isEmpty.x', 'invalid-value'],
    ['title.isEmpty.', 'invalid-value'],
    ['title.contains.  ', 'invalid-value'],
    ['estimate.gt.1.5', 'invalid-value'],
    ['estimate.gt.-1', 'invalid-value'],
    ['price.gt.', 'invalid-value'],
    ['price.gt.abc', 'invalid-value'],
    ['price.gt.NaN', 'invalid-value'],
    ['price.gt.Infinity', 'invalid-value'],
    ['price.gt.1e999', 'invalid-value'],
    ['price.gt.0x10', 'invalid-value'],
    ['price.gt. 1', 'invalid-value'],
    ['price.between.1', 'invalid-value'],
    ['price.between.5..1', 'invalid-value'],
    ['price.between.1..2..3', 'invalid-value'],
    ['created.between.2026-02-30..2026-03-01', 'invalid-value'],
    ['created.between.2026-13-01..2026-13-02', 'invalid-value'],
    ['created.between.2026-03-14..2026-03-01', 'invalid-value'],
    ['created.between.2026-03-01', 'invalid-value'],
    ['created.between.2026-3-1..2026-3-2', 'invalid-value'],
    ['owner.isAnyOf.', 'invalid-value'],
  ])('drops %j as %s and reports the entry', (entry, reason) => {
    const { filters, errors } = read(entry, 'status.is.open');
    expect(filters).toEqual([{ field: 'status', op: 'is', value: 'open' }]);
    expect(errors).toEqual([expect.objectContaining({ entry, reason })]);
  });

  it('gives a message for an invalid value', () => {
    expect(read('estimate.gt.-1').errors[0]?.message).toBe('Enter 0 or more');
  });

  it('reads -0 as 0', () => {
    expect(read('price.eq.-0').filters).toEqual([{ field: 'price', op: 'eq', value: 0 }]);
  });

  it('accepts a range whose ends are equal', () => {
    expect(read('price.between.2..2').filters).toEqual([{ field: 'price', op: 'between', value: [2, 2] }]);
  });

  it('drops unknown list items, keeps the rest and reports each one', () => {
    const { filters, errors } = read('owner.isAnyOf.1,9,2,8');
    expect(filters).toEqual([{ field: 'owner', op: 'isAnyOf', value: ['1', '2'] }]);
    expect(errors).toEqual([
      expect.objectContaining({ entry: 'owner.isAnyOf.1,9,2,8', reason: 'invalid-value' }),
      expect.objectContaining({ entry: 'owner.isAnyOf.1,9,2,8', reason: 'invalid-value' }),
    ]);
  });

  it('drops a list filter when none of its items is left', () => {
    const { filters, errors } = read('owner.isAnyOf.9');
    expect(filters).toEqual([]);
    expect(errors).toHaveLength(1);
  });

  it('removes duplicate list items', () => {
    expect(read('owner.isAnyOf.1,2,1').filters).toEqual([{ field: 'owner', op: 'isAnyOf', value: ['1', '2'] }]);
  });

  it('keeps dots in a single value', () => {
    expect(read('title.contains.v1.2.3').filters).toEqual([{ field: 'title', op: 'contains', value: 'v1.2.3' }]);
  });

  it('runs the custom validate of a field', () => {
    const strict = [
      textField({ key: 'code', label: 'Code', validate: (value) => (/^[A-Z]+$/.test(value) ? null : 'Use capitals') }),
    ];
    expect(filtersFromSearchParams('filter=code.is.abc', strict).errors).toEqual([
      { entry: 'code.is.abc', reason: 'invalid-value', message: 'Use capitals' },
    ]);
    expect(filtersFromSearchParams('filter=code.is.ABC', strict).filters).toHaveLength(1);
  });
});
