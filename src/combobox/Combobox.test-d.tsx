import { useState } from 'react';
import { expectTypeOf } from 'vitest';
import { Combobox, useCombobox } from './index';

interface User {
  id: number;
  name: string;
}
const users: User[] = [{ id: 1, name: 'Ana' }];

// Checked with strictFunctionTypes off (tsconfig.test-d.json), where a useState setter
// passed to onChange used to become an inference candidate for TItem.
export function Picker() {
  const [value, setValue] = useState<User | null>(null);
  const combobox = useCombobox({
    items: users,
    itemToString: (user) => user?.name ?? '',
    itemToKey: (user) => user.id,
    onChange: setValue,
  });
  expectTypeOf(combobox.selectedItem).toEqualTypeOf<User | null>();

  return (
    <Combobox
      items={users}
      itemToString={(user) => user?.name ?? ''}
      itemToKey={(user) => user.id}
      value={value}
      onChange={setValue}
    >
      <Combobox.Input />
    </Combobox>
  );
}
