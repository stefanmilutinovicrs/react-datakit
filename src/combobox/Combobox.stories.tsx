import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Combobox } from './index';

interface User {
  id: number;
  name: string;
  email: string;
}

const firstNames = ['Ana', 'Bojan', 'Cvijeta', 'Dragan', 'Elena', 'Filip', 'Gordana', 'Huan', 'Ivana', 'Jovan'];
const lastNames = ['Petrović', 'Jović', 'Kim', 'Novak', 'Smith', 'García', 'Ilić', 'Weber', 'Rossi', 'Tanaka'];

function makeUsers(count: number): User[] {
  return Array.from({ length: count }, (_, i) => {
    const first = firstNames[i % firstNames.length] ?? 'User';
    const last = lastNames[Math.floor(i / firstNames.length) % lastNames.length] ?? '';
    const name = count > 100 ? `${first} ${last} ${i}` : `${first} ${last}`;
    return { id: i, name, email: `${first.toLowerCase()}.${i}@example.com` };
  });
}

const users = makeUsers(20);
const manyUsers = makeUsers(10_000);

const itemToString = (user: User | null) => user?.name ?? '';
const itemToKey = (user: User) => user.id;

/** A fake API: 500 ms latency, honors the abort signal. */
function searchUsers(query: string, { signal }: { signal: AbortSignal }, options: { fail?: boolean } = {}) {
  return new Promise<User[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (options.fail) reject(new Error('Network error'));
      else resolve(manyUsers.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())).slice(0, 50));
    }, 500);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

function Parts({ placeholder = 'Search people…' }: { placeholder?: string }) {
  return (
    <>
      <Combobox.Label>Assignee</Combobox.Label>
      <Combobox.Input placeholder={placeholder} />
      <Combobox.Popup>
        <Combobox.List>{(user: User) => <Combobox.Option item={user}>{user.name}</Combobox.Option>}</Combobox.List>
        <Combobox.Empty>No people found</Combobox.Empty>
        <Combobox.Loading>Searching…</Combobox.Loading>
        <Combobox.Error>
          {({ retry }) => (
            <>
              Could not load people.
              <button type="button" onClick={retry}>
                Try again
              </button>
            </>
          )}
        </Combobox.Error>
      </Combobox.Popup>
    </>
  );
}

const meta = {
  title: 'Components/Combobox',
  tags: ['experimental'],
  parameters: {
    docs: {
      description: {
        component:
          'Searchable select for large or remote option lists. Follows the WAI-ARIA combobox pattern with a listbox popup: focus stays in the input, arrows move the highlight, Enter selects, Escape closes and then clears.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 380 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <Combobox items={users} itemToString={itemToString} itemToKey={itemToKey}>
      <Parts />
    </Combobox>
  ),
};

export const Async: Story = {
  name: 'Async (500 ms API)',
  render: () => (
    <Combobox loadOptions={searchUsers} itemToString={itemToString} itemToKey={itemToKey}>
      <Parts placeholder="Type to search 10,000 people…" />
    </Combobox>
  ),
};

export const TenThousandOptions: Story = {
  name: '10,000 options',
  render: () => (
    <Combobox items={manyUsers} itemToString={itemToString} itemToKey={itemToKey}>
      <Parts />
    </Combobox>
  ),
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState<User | null>(users[2] ?? null);
    return (
      <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
        <Combobox items={users} value={value} onChange={setValue} itemToString={itemToString} itemToKey={itemToKey}>
          <Parts />
        </Combobox>
        <output>Selected: {value ? `${value.name} (${value.email})` : 'nobody'}</output>
        <button
          type="button"
          onClick={() => {
            setValue(null);
          }}
        >
          Clear from outside
        </button>
      </div>
    );
  },
};

export const ErrorState: Story = {
  name: 'Edge case: failing API',
  render: () => (
    <Combobox
      loadOptions={(query, context) => searchUsers(query, context, { fail: true })}
      itemToString={itemToString}
      itemToKey={itemToKey}
    >
      <Parts placeholder="Type anything, the request fails" />
    </Combobox>
  ),
};

export const EmptyState: Story = {
  name: 'Edge case: no options',
  render: () => (
    <Combobox items={[] as User[]} itemToString={itemToString} itemToKey={itemToKey}>
      <Parts placeholder="Press ↓ to open" />
    </Combobox>
  ),
};

export const LongLabels: Story = {
  name: 'Edge case: long names',
  render: () => (
    <Combobox
      items={users.map((u) => ({ ...u, name: `${u.name}, Senior Principal Staff Engineer, Platform Reliability` }))}
      itemToString={itemToString}
      itemToKey={itemToKey}
    >
      <Parts />
    </Combobox>
  ),
};

const themedCss = `
.brand-combobox {
  --dk-accent: #be185d;
  --dk-radius: 12px;
  --dk-control-height: 44px;
}
.brand-combobox [data-dk-part='combobox-option'][data-highlighted] {
  background: #be185d;
  color: white;
}
`;

export const Themed: Story = {
  render: () => (
    <>
      <style>{themedCss}</style>
      <Combobox className="brand-combobox" items={users} itemToString={itemToString} itemToKey={itemToKey}>
        <Combobox.Label>Assignee</Combobox.Label>
        <Combobox.Input placeholder="Search people…" />
        <Combobox.Popup>
          <Combobox.List optionHeight={48}>
            {(user: User) => (
              <Combobox.Option item={user}>
                <span>
                  <strong>{user.name}</strong>
                  <br />
                  <small>{user.email}</small>
                </span>
              </Combobox.Option>
            )}
          </Combobox.List>
          <Combobox.Empty>No people found</Combobox.Empty>
        </Combobox.Popup>
      </Combobox>
    </>
  ),
};
