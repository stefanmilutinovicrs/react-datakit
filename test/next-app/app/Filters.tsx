'use client';

import { Combobox } from 'react-datakit/combobox';
import { MultiSelect } from 'react-datakit/multiselect';
import type { Tag, User } from './data';

export function Filters({ users, tags }: { users: User[]; tags: Tag[] }) {
  return (
    <>
      <Combobox items={users} itemToString={(user) => user?.name ?? ''} itemToKey={(user) => user.id}>
        <Combobox.Label>Assignee</Combobox.Label>
        <Combobox.Control>
          <Combobox.Input placeholder="Search people…" />
        </Combobox.Control>
        <Combobox.Popup>
          <Combobox.List>{(user: User) => <Combobox.Option item={user}>{user.name}</Combobox.Option>}</Combobox.List>
          <Combobox.Empty>No people found</Combobox.Empty>
        </Combobox.Popup>
      </Combobox>

      <Combobox
        items={users}
        groupBy={(user) => (user.id === 3 ? 'Platform' : 'Design')}
        itemToString={(user) => user?.name ?? ''}
        itemToKey={(user) => user.id}
      >
        <Combobox.Label>Owner</Combobox.Label>
        <Combobox.Control>
          <Combobox.Input placeholder="Search people…" />
        </Combobox.Control>
        <Combobox.Popup>
          <Combobox.List>{(user: User) => <Combobox.Option item={user}>{user.name}</Combobox.Option>}</Combobox.List>
        </Combobox.Popup>
      </Combobox>

      <MultiSelect items={tags} itemToString={(tag) => tag?.name ?? ''} itemToKey={(tag) => tag.id}>
        <MultiSelect.Label>Labels</MultiSelect.Label>
        <MultiSelect.Control>
          <MultiSelect.Chips>
            {(tag: Tag) => (
              <MultiSelect.Chip>
                {tag.name}
                <MultiSelect.ChipRemove />
              </MultiSelect.Chip>
            )}
          </MultiSelect.Chips>
          <MultiSelect.ChipsOverflow>{(count) => `+${count} more`}</MultiSelect.ChipsOverflow>
          <MultiSelect.Input placeholder="Add labels…" />
        </MultiSelect.Control>
        <MultiSelect.Popup>
          <MultiSelect.List>
            {(tag: Tag) => <MultiSelect.Option item={tag}>{tag.name}</MultiSelect.Option>}
          </MultiSelect.List>
          <MultiSelect.Empty>No labels found</MultiSelect.Empty>
        </MultiSelect.Popup>
      </MultiSelect>
    </>
  );
}
