import { composeStories } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Combobox } from '../combobox';
import * as comboboxStories from '../combobox/Combobox.stories';
import { DateRangePicker } from '../daterangepicker';
import * as dateRangePickerStories from '../daterangepicker/DateRangePicker.stories';
import { MultiSelect } from '../multiselect';
import * as multiSelectStories from '../multiselect/MultiSelect.stories';
import './theme.css';

interface Person {
  id: number;
  name: string;
  email: string;
}

const people: Person[] = ['Ana Petrović', 'Bojan Janković', 'Dana Stanić', 'Elena Kim'].map((name, id) => ({
  id,
  name,
  email: `${name.split(' ')[0]?.toLowerCase() ?? ''}@example.com`,
}));
const tags = ['bug', 'feature', 'frontend', 'design', 'docs'].map((id) => ({ id }));
const week = { start: new Date('2026-11-10T00:00:00Z'), end: new Date('2026-11-16T23:59:59.999Z') };

function Frame({ theme, accent, children }: { theme: string; accent?: string; children: ReactNode }) {
  return (
    <div
      data-testid="frame"
      data-dk-theme={theme}
      data-dk-accent={accent}
      style={{
        width: 1160,
        height: 680,
        padding: 20,
        boxSizing: 'border-box',
        colorScheme: theme,
        background: theme === 'dark' ? '#09090b' : '#ffffff',
        color: theme === 'dark' ? '#fafafa' : '#18181b',
        font: '14px system-ui, sans-serif',
        caretColor: 'transparent',
      }}
    >
      {children}
    </div>
  );
}

function Assignee() {
  return (
    <Combobox items={people} defaultValue={people[0]} itemToString={(p) => p?.name ?? ''} itemToKey={(p) => p.id}>
      <Combobox.Label>Assignee</Combobox.Label>
      <Combobox.Control>
        <Combobox.Input placeholder="Search people…" />
      </Combobox.Control>
      <Combobox.Popup>
        <Combobox.List optionHeight={48}>
          {(person: Person) => (
            <Combobox.Option item={person}>
              <span style={{ display: 'grid' }}>
                <span>{person.name}</span>
                <span style={{ color: 'var(--dk-text-muted)', fontSize: 12 }}>{person.email}</span>
              </span>
            </Combobox.Option>
          )}
        </Combobox.List>
        <Combobox.Count>{(count) => `${count} results`}</Combobox.Count>
      </Combobox.Popup>
    </Combobox>
  );
}

function Labels() {
  return (
    <MultiSelect items={tags} defaultValue={tags.slice(0, 2)} itemToString={(t) => t?.id ?? ''} itemToKey={(t) => t.id}>
      <MultiSelect.Label>Labels</MultiSelect.Label>
      <MultiSelect.Control style={{ width: 360 }}>
        <MultiSelect.Chips>
          {(tag: { id: string }) => (
            <MultiSelect.Chip>
              {tag.id}
              <MultiSelect.ChipRemove />
            </MultiSelect.Chip>
          )}
        </MultiSelect.Chips>
        <MultiSelect.Input placeholder="Add labels…" />
      </MultiSelect.Control>
      <MultiSelect.Popup>
        <MultiSelect.List>
          {(tag: { id: string }) => <MultiSelect.Option item={tag}>{tag.id}</MultiSelect.Option>}
        </MultiSelect.List>
      </MultiSelect.Popup>
    </MultiSelect>
  );
}

const team = (person: Person) => (person.id < 2 ? 'Design' : 'Platform');

function GroupedOwner() {
  return (
    <Combobox items={people} itemToString={(p) => p?.name ?? ''} itemToKey={(p) => p.id} groupBy={team}>
      <Combobox.Label>Owner</Combobox.Label>
      <Combobox.Control>
        <Combobox.Input placeholder="Search people…" />
      </Combobox.Control>
      <Combobox.Popup>
        <Combobox.List>
          {(person: Person) => <Combobox.Option item={person}>{person.name}</Combobox.Option>}
        </Combobox.List>
      </Combobox.Popup>
    </Combobox>
  );
}

function GroupedReviewers() {
  return (
    <MultiSelect
      items={people}
      defaultValue={people.slice(2, 3)}
      selectAll
      itemToString={(p) => p?.name ?? ''}
      itemToKey={(p) => p.id}
      groupBy={team}
    >
      <MultiSelect.Label>Reviewers</MultiSelect.Label>
      <MultiSelect.Control style={{ width: 360 }}>
        <MultiSelect.Chips>
          {(person: Person) => (
            <MultiSelect.Chip>
              {person.name}
              <MultiSelect.ChipRemove />
            </MultiSelect.Chip>
          )}
        </MultiSelect.Chips>
        <MultiSelect.Input placeholder="Add reviewers…" />
      </MultiSelect.Control>
      <MultiSelect.Popup>
        <MultiSelect.List>
          {(person: Person) => <MultiSelect.Option item={person}>{person.name}</MultiSelect.Option>}
        </MultiSelect.List>
      </MultiSelect.Popup>
    </MultiSelect>
  );
}

function Period() {
  return (
    <DateRangePicker locale="en-US" timeZone="UTC" defaultValue={week}>
      <DateRangePicker.Label>Period</DateRangePicker.Label>
      <DateRangePicker.Trigger />
      <DateRangePicker.Popover>
        <DateRangePicker.Presets aria-label="Presets" />
        <DateRangePicker.PrevMonth />
        <DateRangePicker.NextMonth />
        <DateRangePicker.Months />
      </DateRangePicker.Popover>
    </DateRangePicker>
  );
}

// Each opens with the keyboard, so no pointer hovers an option.
async function open(name: RegExp | string, keys = '{ArrowDown}') {
  const field = page.getByRole('combobox', { name }).or(page.getByRole('button', { name }));
  (field.element() as HTMLElement).focus();
  await userEvent.keyboard(name instanceof RegExp ? '{Enter}' : keys);
}

const frame = () => page.getByTestId('frame');
const { Themed: ComboboxThemed } = composeStories(comboboxStories);
const { Themed: MultiSelectThemed } = composeStories(multiSelectStories);
const { Themed: DateRangePickerThemed } = composeStories(dateRangePickerStories);

describe('visual', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-12T12:00:00Z') });
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  describe.each(['light', 'dark'])('%s', (theme) => {
    it('Combobox open', async () => {
      await render(
        <Frame theme={theme}>
          <Assignee />
        </Frame>,
      );
      await open('Assignee', '{ArrowDown}{ArrowDown}');
      await expect.poll(() => document.querySelector('[data-dk-part="combobox-count"]')?.textContent).toBe('4 results');
      await expect(frame()).toMatchScreenshot(`combobox-${theme}`);
    });

    it('MultiSelect open with chips and checked options', async () => {
      await render(
        <Frame theme={theme}>
          <Labels />
        </Frame>,
      );
      await open('Labels', '{ArrowDown}{ArrowDown}{ArrowDown}');
      await expect.element(page.getByRole('listbox')).toBeVisible();
      await expect(frame()).toMatchScreenshot(`multiselect-${theme}`);
    });

    it('Combobox open with groups', async () => {
      await render(
        <Frame theme={theme}>
          <GroupedOwner />
        </Frame>,
      );
      await open('Owner', '{ArrowDown}{ArrowDown}{ArrowDown}');
      await expect.element(page.getByRole('group', { name: 'Platform' })).toBeInTheDocument();
      await expect(frame()).toMatchScreenshot(`combobox-grouped-${theme}`);
    });

    it('MultiSelect open with groups and select all', async () => {
      await render(
        <Frame theme={theme}>
          <GroupedReviewers />
        </Frame>,
      );
      await open('Reviewers', '{ArrowDown}{ArrowDown}');
      await expect.element(page.getByRole('group', { name: 'Platform' })).toBeInTheDocument();
      await expect(frame()).toMatchScreenshot(`multiselect-grouped-${theme}`);
    });

    it.each(['indigo', 'teal', 'violet', 'blue'])('DateRangePicker open with a range and today, %s', async (accent) => {
      await render(
        <Frame theme={theme} accent={accent}>
          <Period />
        </Frame>,
      );
      await open(/^Period/);
      await expect.element(page.getByRole('dialog')).toBeVisible();
      await expect(frame()).toMatchScreenshot(`daterangepicker-${accent}-${theme}`);
    });

    it.each([
      ['combobox', ComboboxThemed, 'Assignee (custom)'],
      ['multiselect', MultiSelectThemed, 'Labels (custom)'],
      ['daterangepicker', DateRangePickerThemed, /^Period \(custom\)/],
    ] as const)('Themed %s story, custom one open', async (name, Story, label) => {
      await render(
        <Frame theme={theme}>
          <Story />
        </Frame>,
      );
      await open(label);
      await expect.element(page.getByRole('listbox').or(page.getByRole('dialog'))).toBeVisible();
      await expect(frame()).toMatchScreenshot(`themed-${name}-${theme}`);
    });
  });
});
