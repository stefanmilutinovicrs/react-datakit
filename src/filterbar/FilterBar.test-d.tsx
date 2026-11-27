import { useState } from 'react';
import { expectTypeOf } from 'vitest';
import {
  FilterBar,
  enumField,
  numberField,
  textField,
  useFilterBar,
  type Filter,
  type FilterBarChip,
  type FilterEditorProps,
} from './index';

const fields = [
  textField({ key: 'title', label: 'Title' }),
  enumField({
    key: 'status',
    label: 'Status',
    items: [{ id: 'open' }],
    itemToKey: (status) => status.id,
    itemToString: (status) => status?.id ?? '',
  }),
  numberField({ key: 'estimate', label: 'Estimate' }),
];
type IssueFilter = Filter<typeof fields>;

export function Typed() {
  const [value, setValue] = useState<readonly IssueFilter[]>([]);
  const bar = useFilterBar({ fields, value, onChange: setValue });
  expectTypeOf(bar.filters).toEqualTypeOf<readonly IssueFilter[]>();
  expectTypeOf(bar.chips[0]?.field.key).toEqualTypeOf<'title' | 'status' | 'estimate' | undefined>();

  function Stepper(props: FilterEditorProps<number>) {
    expectTypeOf(props.value).toEqualTypeOf<number | undefined>();
    return <button type="button" onClick={() => props.onCommit(1)} />;
  }

  return (
    <>
      <FilterBar
        fields={fields}
        value={value}
        onChange={(next) => {
          expectTypeOf(next).toEqualTypeOf<readonly IssueFilter[]>();
          setValue(next);
        }}
        editors={{ number: Stepper }}
      >
        <FilterBar.Chips>
          {(chip: FilterBarChip<typeof fields>) => {
            expectTypeOf(chip.filter).toEqualTypeOf<IssueFilter | null>();
            return <FilterBar.Chip />;
          }}
        </FilterBar.Chips>
      </FilterBar>
      {/* @ts-expect-error: `estimate` takes a number */}
      <FilterBar fields={fields} defaultValue={[{ field: 'estimate', op: 'gt', value: 'x' }]} />
      {/* @ts-expect-error: unknown field */}
      <FilterBar fields={fields} defaultValue={[{ field: 'priority', op: 'is', value: 'x' }]} />
    </>
  );
}
