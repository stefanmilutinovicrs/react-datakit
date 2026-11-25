import { useState } from 'react';
import { expectTypeOf } from 'vitest';
import { MultiSelect, useMultiSelect } from './index';

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
    >
      <MultiSelect.Input />
    </MultiSelect>
  );
}
