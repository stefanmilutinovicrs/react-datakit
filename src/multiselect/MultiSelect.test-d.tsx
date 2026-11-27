import { useState } from 'react';
import { expectTypeOf } from 'vitest';
import { MultiSelect, useMultiSelect, type MultiSelectProps } from './index';

interface Tag {
  id: string;
  name: string;
}
const tags: Tag[] = [{ id: 'bug', name: 'bug' }];

// Checked with strictFunctionTypes off (tsconfig.test-d.json), where a useState setter
// passed to onChange used to become an inference candidate for TItem.
export function Picker() {
  const [value, setValue] = useState<readonly Tag[]>([]);
  const multiSelect = useMultiSelect({
    items: tags,
    itemToString: (tag) => tag?.name ?? '',
    itemToKey: (tag) => tag.id,
    onChange: setValue,
  });
  expectTypeOf(multiSelect.selectedItems).toEqualTypeOf<readonly Tag[]>();

  return (
    <MultiSelect
      items={tags}
      itemToString={(tag) => tag?.name ?? ''}
      itemToKey={(tag) => tag.id}
      value={value}
      onChange={setValue}
      groupBy={(tag) => {
        expectTypeOf(tag).toEqualTypeOf<Tag>();
        return null;
      }}
    >
      <MultiSelect.Input />
      <MultiSelect.Popup>
        <MultiSelect.List
          groupLabel={(group) => {
            expectTypeOf(group.items).toEqualTypeOf<readonly Tag[]>();
            return <MultiSelect.GroupLabel>{group.key}</MultiSelect.GroupLabel>;
          }}
        >
          {(tag: Tag) => <MultiSelect.Option item={tag}>{tag.name}</MultiSelect.Option>}
        </MultiSelect.List>
      </MultiSelect.Popup>
    </MultiSelect>
  );
}

expectTypeOf<() => number>().not.toExtend<NonNullable<MultiSelectProps<Tag>['groupBy']>>();
