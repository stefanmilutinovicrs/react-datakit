import { useState } from 'react';
import { expectTypeOf } from 'vitest';
import { Combobox, useCombobox, type ComboboxProps } from './index';

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
      groupBy={(user) => {
        expectTypeOf(user).toEqualTypeOf<User>();
        return null;
      }}
    >
      <Combobox.Input />
      <Combobox.Popup>
        <Combobox.List
          groupLabel={(group) => {
            expectTypeOf(group.items).toEqualTypeOf<readonly User[]>();
            return <Combobox.GroupLabel>{group.key}</Combobox.GroupLabel>;
          }}
        >
          {(user: User) => <Combobox.Option item={user}>{user.name}</Combobox.Option>}
        </Combobox.List>
      </Combobox.Popup>
    </Combobox>
  );
}

expectTypeOf<() => number>().not.toExtend<NonNullable<ComboboxProps<User>['groupBy']>>();
