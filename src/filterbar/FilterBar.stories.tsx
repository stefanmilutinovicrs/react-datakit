import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState, type CSSProperties } from 'react';
import {
  FilterBar,
  enumField,
  enumOperators,
  filtersFromSearchParams,
  filtersToSearchParams,
  numberField,
  textField,
  textOperators,
  type AnyFilterField,
  type Filter,
  type FilterEditorProps,
  type FilterField,
} from './index';

const statuses = [
  { id: 'backlog', name: 'Backlog' },
  { id: 'open', name: 'Open' },
  { id: 'in-review', name: 'In review' },
  { id: 'done', name: 'Done' },
];
const priorities = [
  { id: 'urgent', name: 'Urgent' },
  { id: 'high', name: 'High' },
  { id: 'medium', name: 'Medium' },
  { id: 'low', name: 'Low' },
];
const people = [
  { id: 'ana', name: 'Ana Petrović', team: 'Design' },
  { id: 'bojan', name: 'Bojan Ilić', team: 'Platform' },
  { id: 'cvijeta', name: 'Cvijeta Marić', team: 'Platform' },
  { id: 'dragan', name: 'Dragan Jovanović', team: 'Growth' },
];
const byName = { itemToString: (item: { name: string } | null) => item?.name ?? '' };

const fields = [
  textField({ key: 'title', label: 'Title' }),
  enumField({ key: 'status', label: 'Status', group: 'Issue', items: statuses, itemToKey: (s) => s.id, ...byName }),
  enumField({
    key: 'priority',
    label: 'Priority',
    group: 'Issue',
    items: priorities,
    itemToKey: (p) => p.id,
    ...byName,
  }),
  enumField({
    key: 'owner',
    label: 'Owner',
    group: 'People',
    items: people,
    itemToKey: (p) => p.id,
    groupBy: (p) => p.team,
    ...byName,
  }),
  textField({ key: 'reporter', label: 'Reporter', group: 'People' }),
];
type IssueFilter = Filter<typeof fields>;

const meta = {
  title: 'Components/FilterBar',
  tags: ['experimental'],
  parameters: {
    docs: {
      description: {
        component:
          'Filters as chips of field, operator and value. The bar is a toolbar with one Tab stop: arrows move between the segments of the chips, Clear and the picker; Delete or Backspace removes a chip. The operator is a menu button, the value opens a dialog with the editor of the field type. The value of the bar is a serialisable array that `react-datakit/filterbar/schema` writes to and reads from the URL.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 440, maxWidth: 720 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <FilterBar fields={fields} defaultValue={[{ field: 'status', op: 'is', value: 'open' }]} />,
};

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The value is the JSON below; `filtersToSearchParams` turns it into the query string an app puts in the URL, and `filtersFromSearchParams` reads it back.',
      },
    },
  },
  render: function ControlledStory() {
    const [value, setValue] = useState<readonly IssueFilter[]>(
      () => filtersFromSearchParams('filter=status.isNot.done&filter=owner.is.bojan', fields).filters,
    );
    const query = filtersToSearchParams(value, fields).toString();
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <FilterBar fields={fields} value={value} onChange={setValue} />
        <output style={{ fontFamily: 'monospace', fontSize: 13 }}>?{query}</output>
        <pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    );
  },
};

export const ManyChips: Story = {
  name: 'Edge case: many chips and long values',
  render: () => (
    <div style={{ width: 420 }}>
      <FilterBar
        fields={fields}
        defaultValue={[
          { field: 'status', op: 'isNot', value: 'done' },
          { field: 'priority', op: 'is', value: 'urgent' },
          { field: 'owner', op: 'is', value: 'dragan' },
          { field: 'title', op: 'contains', value: 'checkout fails when the address has two lines' },
          { field: 'reporter', op: 'is', value: 'support' },
        ]}
      />
    </div>
  ),
};

const validated = [
  textField({
    key: 'ticket',
    label: 'Ticket',
    maxLength: 12,
    validate: (value) => (/^[A-Z]+-\d+$/.test(value.trim()) ? null : 'Use a key like DK-42'),
  }),
];

export const Validation: Story = {
  name: 'Edge case: validation',
  parameters: {
    docs: {
      description: {
        story:
          'A value that fails `validate` keeps the editor open, marks the input invalid and shows the message; a click outside cancels it.',
      },
    },
  },
  render: () => <FilterBar fields={validated} />,
};

const withEmpty = [
  textField({
    key: 'description',
    label: 'Description',
    operators: [...textOperators, { key: 'isEmpty', label: 'is empty', arity: 'none' }],
  }),
  enumField({
    key: 'status',
    label: 'Status',
    items: statuses,
    itemToKey: (s) => s.id,
    operators: [...enumOperators, { key: 'isSet', label: 'is set', arity: 'none' }],
    ...byName,
  }),
];

export const CustomOperators: Story = {
  name: 'Edge case: operators without a value',
  render: () => <FilterBar fields={withEmpty} defaultValue={[{ field: 'description', op: 'isEmpty' }]} />,
};

function booleanField<const TKey extends string>(key: TKey, label: string) {
  return {
    key,
    label,
    type: 'boolean',
    operators: [{ key: 'is', label: 'is', arity: 'single' }] as const,
    format: (value: boolean) => (value ? 'Yes' : 'No'),
    serializeValue: (value: boolean) => (value ? '1' : '0'),
    parseValue: (text: string) => (text === '1' ? true : text === '0' ? false : undefined),
  } satisfies FilterField<TKey, 'boolean', boolean, readonly [{ key: 'is'; label: string; arity: 'single' }]>;
}

function BooleanEditor(props: FilterEditorProps<boolean>) {
  return (
    <div role="group" aria-label="Value" style={{ display: 'flex', gap: 8 }}>
      {[true, false].map((option) => (
        <button
          key={String(option)}
          type="button"
          aria-pressed={props.value === option}
          onClick={() => props.onCommit(option)}
        >
          {option ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

const withCustomType = [
  ...fields,
  booleanField('blocked', 'Blocked'),
  numberField({ key: 'estimate', label: 'Estimate' }),
];

export const CustomType: Story = {
  name: 'Edge case: a custom field type, and a type without an editor',
  parameters: {
    docs: {
      description: {
        story:
          '`blocked` is a custom `boolean` type with its own editor, passed in `editors`. `estimate` is a number field: its editor comes in a later release, so its chip is read-only and it is not offered in the picker (a development warning says so).',
      },
    },
  },
  render: () => (
    <FilterBar
      fields={withCustomType}
      editors={{ boolean: BooleanEditor }}
      defaultValue={[
        { field: 'blocked', op: 'is', value: true },
        { field: 'estimate', op: 'gt', value: 3 },
      ]}
    />
  ),
};

export const UrlWithErrors: Story = {
  name: 'Edge case: a URL with unknown and invalid entries',
  render: function UrlStory() {
    const query =
      'filter=status.is.open&filter=priority.is.critical&filter=milestone.is.q3&filter=owner.equals.ana&filter=title';
    const { filters, errors } = useMemo(() => filtersFromSearchParams(query, fields), []);
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <FilterBar fields={fields} defaultValue={filters} />
        <output style={{ fontSize: 13 }}>
          Left out:
          <ul>
            {errors.map((error) => (
              <li key={error.entry}>
                <code>{error.entry}</code>: {error.reason}
                {error.message ? ` (${error.message})` : ''}
              </li>
            ))}
          </ul>
        </output>
      </div>
    );
  },
};

const serbianText = [
  { key: 'contains', label: 'sadrži', arity: 'single' },
  { key: 'notContains', label: 'ne sadrži', arity: 'single' },
  { key: 'is', label: 'je', arity: 'single' },
  { key: 'isNot', label: 'nije', arity: 'single' },
] as const;
const serbianEnum = [
  { key: 'is', label: 'je', arity: 'single' },
  { key: 'isNot', label: 'nije', arity: 'single' },
] as const;
const serbianFields: readonly AnyFilterField[] = [
  textField({ key: 'title', label: 'Naslov', operators: serbianText }),
  enumField({
    key: 'status',
    label: 'Status',
    group: 'Zadatak',
    items: [
      { id: 'open', name: 'Otvoren' },
      { id: 'done', name: 'Završen' },
    ],
    itemToKey: (s) => s.id,
    operators: serbianEnum,
    ...byName,
  }),
];

export const Localised: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Operator texts are data on the fields, so they are translated there; screen reader texts come from `labels`. The keys in the URL stay the same in every language.',
      },
    },
  },
  render: () => (
    <FilterBar
      fields={serbianFields}
      defaultValue={[{ field: 'status', op: 'is', value: 'open' }]}
      labels={{
        toolbar: 'Filteri',
        addFilter: 'Dodaj filter',
        resultCount: (count) => (count === 0 ? 'Nema rezultata' : `Rezultata: ${count}`),
        remove: (summary) => `Ukloni filter ${summary}`,
        added: (summary) => `Dodat filter: ${summary}`,
        updated: (summary) => `Promenjen filter: ${summary}`,
        removed: (summary) => `Uklonjen filter: ${summary}`,
        cleared: 'Svi filteri su uklonjeni',
      }}
    >
      <FilterBar.Chips />
      <FilterBar.OperatorMenu />
      <FilterBar.Editor />
      <FilterBar.Clear>Obriši</FilterBar.Clear>
      <FilterBar.Add />
    </FilterBar>
  ),
};

const customTheme = { '--dk-accent': '#be185d', '--dk-radius': '999px' } as CSSProperties;

export const Themed: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The default theme next to a subtree that sets only `--dk-accent` and `--dk-radius`.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      {[undefined, customTheme].map((style, i) => (
        <div key={i} style={style}>
          <FilterBar
            fields={fields}
            defaultValue={[
              { field: 'status', op: 'is', value: 'open' },
              { field: 'owner', op: 'is', value: 'ana' },
            ]}
          />
        </div>
      ))}
    </div>
  ),
};
