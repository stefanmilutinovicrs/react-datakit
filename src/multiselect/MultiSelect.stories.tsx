import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { MultiSelect } from './index';

interface Tag {
  id: string;
  name: string;
}

const tagNames = [
  'bug',
  'feature',
  'backend',
  'frontend',
  'design',
  'docs',
  'performance',
  'security',
  'accessibility',
  'billing',
  'onboarding',
  'mobile',
];
const tags: Tag[] = tagNames.map((name) => ({ id: name, name }));
const manyTags: Tag[] = Array.from({ length: 10_000 }, (_, i) => ({ id: `tag-${i}`, name: `tag-${i}` }));

const itemToString = (tag: Tag | null) => tag?.name ?? '';
const itemToKey = (tag: Tag) => tag.id;

/** A fake API: 500 ms latency, honors the abort signal. */
function searchTags(query: string, { signal }: { signal: AbortSignal }) {
  return new Promise<Tag[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(manyTags.filter((t) => t.name.includes(query.toLowerCase())).slice(0, 50));
    }, 500);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

function Parts({ placeholder = 'Add labels…' }: { placeholder?: string }) {
  return (
    <>
      <MultiSelect.Label>Labels</MultiSelect.Label>
      <MultiSelect.Control>
        <MultiSelect.Chips>
          {(tag: Tag) => (
            <MultiSelect.Chip item={tag}>
              {tag.name}
              <MultiSelect.ChipRemove />
            </MultiSelect.Chip>
          )}
        </MultiSelect.Chips>
        <MultiSelect.ChipsOverflow>{(count) => `+${count} more`}</MultiSelect.ChipsOverflow>
        <MultiSelect.Input placeholder={placeholder} />
      </MultiSelect.Control>
      <MultiSelect.Popup>
        <MultiSelect.List>
          {(tag: Tag) => <MultiSelect.Option item={tag}>{tag.name}</MultiSelect.Option>}
        </MultiSelect.List>
        <MultiSelect.Empty>No labels found</MultiSelect.Empty>
        <MultiSelect.Loading>Searching…</MultiSelect.Loading>
        <MultiSelect.Error>Could not load labels.</MultiSelect.Error>
      </MultiSelect.Popup>
    </>
  );
}

const meta = {
  title: 'Components/MultiSelect',
  tags: ['experimental'],
  parameters: {
    docs: {
      description: {
        component:
          'Pick several values; selected values are chips. Built on the Combobox core: arrows move the highlight, Enter toggles and keeps the list open, Backspace in an empty input removes the last chip, ArrowLeft/ArrowRight move through the chips.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 400, maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <MultiSelect items={tags} itemToString={itemToString} itemToKey={itemToKey} style={{ width: 360 }}>
      <Parts />
    </MultiSelect>
  ),
};

export const SelectAllAndMax: Story = {
  name: 'Select all, max 5',
  render: () => (
    <MultiSelect
      items={tags}
      selectAll
      max={5}
      itemToString={itemToString}
      itemToKey={itemToKey}
      style={{ width: 360 }}
    >
      <Parts placeholder="Up to 5 labels" />
    </MultiSelect>
  ),
};

export const Creatable: Story = {
  render: function CreatableStory() {
    const [all, setAll] = useState(tags);
    return (
      <MultiSelect
        items={all}
        itemToString={itemToString}
        itemToKey={itemToKey}
        onCreate={(name) => {
          const tag = { id: name.toLowerCase(), name: name.toLowerCase() };
          setAll((prev) => [...prev, tag]);
          return tag;
        }}
        style={{ width: 360 }}
      >
        <Parts placeholder="Type a new label…" />
      </MultiSelect>
    );
  },
};

export const Async: Story = {
  name: 'Async (500 ms API)',
  render: () => (
    <MultiSelect loadOptions={searchTags} itemToString={itemToString} itemToKey={itemToKey} style={{ width: 360 }}>
      <Parts placeholder="Search 10,000 labels…" />
    </MultiSelect>
  ),
};

export const TenThousandOptions: Story = {
  name: '10,000 options',
  render: () => (
    <MultiSelect items={manyTags} selectAll itemToString={itemToString} itemToKey={itemToKey} style={{ width: 360 }}>
      <Parts />
    </MultiSelect>
  ),
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState<readonly Tag[]>(tags.slice(0, 2));
    return (
      <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
        <MultiSelect
          items={tags}
          value={value}
          onChange={setValue}
          itemToString={itemToString}
          itemToKey={itemToKey}
          style={{ width: 360 }}
        >
          <Parts />
        </MultiSelect>
        <output>Selected: {value.map((t) => t.name).join(', ') || 'none'}</output>
        <button
          type="button"
          onClick={() => {
            setValue([]);
          }}
        >
          Clear from outside
        </button>
      </div>
    );
  },
};

export const Overflow: Story = {
  name: 'Edge case: many chips (+N more)',
  render: () => (
    <MultiSelect
      items={tags}
      defaultValue={tags.slice(0, 9)}
      itemToString={itemToString}
      itemToKey={itemToKey}
      style={{ width: 320 }}
    >
      <Parts />
    </MultiSelect>
  ),
};

const themedCss = `
.brand-multiselect {
  --dk-accent: #0f766e;
  --dk-radius: 999px;
}
.brand-multiselect [data-dk-part='multiselect-chip'] {
  background: #0f766e;
  color: white;
}
.brand-multiselect [data-dk-part='multiselect-chip-remove'] {
  color: white;
}
`;

export const Themed: Story = {
  render: () => (
    <>
      <style>{themedCss}</style>
      <MultiSelect
        className="brand-multiselect"
        items={tags}
        defaultValue={tags.slice(1, 3)}
        itemToString={itemToString}
        itemToKey={itemToKey}
        style={{ width: 360 }}
      >
        <Parts />
      </MultiSelect>
    </>
  ),
};
