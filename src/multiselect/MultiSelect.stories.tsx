import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type CSSProperties } from 'react';
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

function Parts({ placeholder = 'Add labels…', label = 'Labels' }: { placeholder?: string; label?: string }) {
  return (
    <>
      <MultiSelect.Label>{label}</MultiSelect.Label>
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
          'Pick several values; selected values are chips. Built on the Combobox core: arrows move the highlight, Enter toggles and keeps the list open, Backspace in an empty input removes the last chip, ArrowLeft/ArrowRight move through the chips. While focus is outside the component, chips stay on one line and the rest are counted by "+N more"; with focus inside, every chip is shown and chips wrap.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 400 }}>
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
  name: 'Edge case: many chips (+N more until focused)',
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

const customTheme = { '--dk-accent': '#be185d', '--dk-radius': '999px' } as CSSProperties;

export const Themed: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The default theme next to a subtree that sets only `--dk-accent` and `--dk-radius`. The field and chips become pills; the popup radius stays at 12px or less.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {[undefined, customTheme].map((style, i) => (
        <div key={i} style={style}>
          <MultiSelect
            items={tags}
            defaultValue={tags.slice(1, 3)}
            itemToString={itemToString}
            itemToKey={itemToKey}
            style={{ width: 320 }}
          >
            <Parts label={style ? 'Labels (custom)' : 'Labels (default)'} />
          </MultiSelect>
        </div>
      ))}
    </div>
  ),
};
