import { composeStories } from '@storybook/react-vite';
import axe from 'axe-core';
import type { ComponentType, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Combobox } from '../combobox';
import { DateRangePicker } from '../daterangepicker';
import { MultiSelect } from '../multiselect';
import { contrast, isTransparent, toHex } from '../test/color';
import './theme.css';

type StoryModule = Parameters<typeof composeStories>[0];

const modules = import.meta.glob<StoryModule>('../**/*.stories.tsx', { eager: true });
const stories = Object.entries(modules).flatMap(([file, module]) =>
  Object.entries(composeStories(module)).map(([name, Story]) => ({
    id: `${file.replace(/^.*\/(\w+)\.stories\.tsx$/, '$1')} ${name}`,
    Story: Story as ComponentType,
  })),
);

const themes = ['light', 'dark'] as const;
const accents = ['indigo', 'teal', 'violet', 'blue'] as const;

// The page around the components, as Storybook's preview and an app would set it.
function Page({ theme, accent, children }: { theme: string; accent: string; children: ReactNode }) {
  return (
    <div
      data-dk-theme={theme}
      data-dk-accent={accent}
      style={{
        colorScheme: theme,
        background: theme === 'dark' ? '#09090b' : '#ffffff',
        color: theme === 'dark' ? '#fafafa' : '#18181b',
        font: '14px system-ui, sans-serif',
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}

interface CheckData {
  messageKey?: string;
}

/** Contrast violations, plus every result axe could not decide except those `allowed` explains. */
async function contrastIssues(element: Element, allowed: readonly string[]): Promise<string[]> {
  const results = await axe.run({ include: [element] }, { runOnly: ['color-contrast'] });
  const violations = results.violations.flatMap((v) =>
    v.nodes.map((n) => `violation ${n.target.join(' ')}: ${n.failureSummary ?? ''}`),
  );
  const undecided = results.incomplete.flatMap((v) =>
    v.nodes.flatMap((n) =>
      n.any
        .filter((check) => !allowed.includes((check.data as CheckData | null)?.messageKey ?? ''))
        .map(
          (check) =>
            `incomplete ${n.target.join(' ')} [${(check.data as CheckData | null)?.messageKey ?? '?'}]: ${check.message}`,
        ),
    ),
  );
  return [...violations, ...undecided];
}

const triggerSelector = [
  '[data-dk-part="combobox-input"]',
  '[data-dk-part="multiselect-input"]',
  '[data-dk-part="daterangepicker-trigger"]',
].join(', ');
const popupSelector =
  '[data-dk-part="combobox-popup"], [data-dk-part="multiselect-popup"], [data-dk-part="daterangepicker-popover"]';

// Empty inputs: axe skips placeholders, which the computed-color checks below cover.
const closedAllowed = ['emptyValue'];
// While a popup is open it covers the parts below it, and the virtualized list keeps a few
// options rendered outside its scroll area.
const openAllowed = [
  ...closedAllowed,
  'bgOverlap',
  'elmPartiallyObscured',
  'partiallyObscured',
  'partiallyObscuredNonTabbable',
];

describe('contrast', () => {
  describe.each(themes)('%s', (theme) => {
    describe.each(accents)('%s', (accent) => {
      it.each(stories)('$id', async ({ Story }) => {
        const screen = await render(
          <Page theme={theme} accent={accent}>
            <Story />
          </Page>,
        );
        const issues = await contrastIssues(screen.container, closedAllowed);
        for (const trigger of screen.container.querySelectorAll(triggerSelector)) {
          await userEvent.click(page.elementLocator(trigger));
          if (trigger.tagName === 'INPUT') await userEvent.keyboard('{ArrowDown}');
          await expect.poll(() => screen.container.querySelector(popupSelector)).not.toBeNull();
          issues.push(...(await contrastIssues(screen.container, openAllowed)));
          await userEvent.keyboard('{Escape}');
        }
        expect(issues).toEqual([]);
      });
    });
  });
});

interface Tag {
  id: string;
}

const tags: Tag[] = ['bug', 'feature', 'frontend', 'design'].map((id) => ({ id }));
const tagProps = { itemToString: (tag: Tag | null) => tag?.id ?? '', itemToKey: (tag: Tag) => tag.id };
const DAY = 86_400_000;
const now = Date.now();
const aroundToday = { start: new Date(now - 3 * DAY), end: new Date(now + 3 * DAY) };

function Fields() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 320px', gap: 24, minHeight: 520 }}>
      <Combobox items={tags} defaultValue={tags[0]} {...tagProps}>
        <Combobox.Label>Kind</Combobox.Label>
        <Combobox.Control>
          <Combobox.Input placeholder="Search kinds…" />
        </Combobox.Control>
        <Combobox.Popup>
          <Combobox.List>{(tag: Tag) => <Combobox.Option item={tag}>{tag.id}</Combobox.Option>}</Combobox.List>
          <Combobox.Count>{(count) => `${count} results`}</Combobox.Count>
        </Combobox.Popup>
      </Combobox>
      <MultiSelect items={tags} defaultValue={tags.slice(0, 2)} {...tagProps}>
        <MultiSelect.Label>Labels</MultiSelect.Label>
        <MultiSelect.Control>
          <MultiSelect.Chips>
            {(tag: Tag) => (
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
            {(tag: Tag) => <MultiSelect.Option item={tag}>{tag.id}</MultiSelect.Option>}
          </MultiSelect.List>
        </MultiSelect.Popup>
      </MultiSelect>
      <DateRangePicker timeZone="UTC" locale="en-US">
        <DateRangePicker.Label>Empty period</DateRangePicker.Label>
        <DateRangePicker.Trigger placeholder="Pick a period" />
      </DateRangePicker>
      <DateRangePicker timeZone="UTC" locale="en-US" defaultValue={aroundToday}>
        <DateRangePicker.Label>Period</DateRangePicker.Label>
        <DateRangePicker.Trigger />
        <DateRangePicker.Popover>
          <DateRangePicker.Presets aria-label="Presets" />
          <DateRangePicker.PrevMonth />
          <DateRangePicker.NextMonth />
          <DateRangePicker.Months />
        </DateRangePicker.Popover>
      </DateRangePicker>
    </div>
  );
}

/** The color behind an element: its own background, or that of the nearest ancestor with one. */
function backgroundOf(element: Element): string {
  for (let el: Element | null = element; el; el = el.parentElement) {
    const { backgroundColor } = getComputedStyle(el);
    if (!isTransparent(backgroundColor)) return backgroundColor;
  }
  return '#ffffff';
}

const all = (selector: string) => [...document.querySelectorAll(selector)];

function one(selector: string): Element {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Nothing matches ${selector}.`);
  return element;
}

const pseudo = (element: Element, which: string) => getComputedStyle(element, which);

// axe skips placeholders and non-text parts, and can't see backgrounds drawn by pseudo-elements.
describe('contrast of what axe skips', () => {
  describe.each(themes)('%s', (theme) => {
    it.each(accents)('%s', async (accent) => {
      await render(
        <Page theme={theme} accent={accent}>
          <Fields />
        </Page>,
      );
      const failures: string[] = [];
      const check = (name: string, foreground: string, background: string, minimum: number) => {
        const ratio = contrast(foreground, background);
        if (ratio < minimum)
          failures.push(`${name}: ${toHex(foreground)} on ${toHex(background)} is ${ratio.toFixed(2)}`);
      };
      const text = (name: string, element: Element) => {
        check(name, getComputedStyle(element).color, backgroundOf(element), 4.5);
      };

      for (const input of all('input[placeholder]')) {
        check('placeholder', pseudo(input, '::placeholder').color, backgroundOf(input), 4.5);
      }
      text('trigger placeholder', one('[data-dk-part="daterangepicker-trigger"][data-placeholder]'));
      for (const label of all('[data-dk-part$="-label"]')) text('label', label);
      for (const chip of all('[data-dk-part="multiselect-chip"]')) text('chip', chip);

      await userEvent.click(page.getByRole('combobox', { name: 'Kind' }));
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      const field = one('[data-dk-part="combobox-control"]');
      const border = getComputedStyle(field).borderTopColor;
      check('focused field border', border, backgroundOf(field), 3);
      check('focused field border on the page', border, backgroundOf(field.parentElement as Element), 3);
      const selected = one('[data-dk-part="combobox-option"][data-selected]');
      text('option', selected);
      check('selected check', pseudo(selected, '::after').backgroundColor, backgroundOf(selected), 3);
      text('highlighted option', one('[data-dk-part="combobox-option"][data-highlighted]'));
      text('count', one('[data-dk-part="combobox-count"]'));
      await userEvent.keyboard('{Escape}');

      await userEvent.click(page.getByRole('combobox', { name: 'Labels' }));
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
      for (const option of all('[data-dk-part="multiselect-option"]')) {
        const box = pseudo(option, '::before');
        if (option.hasAttribute('data-selected')) {
          check('checked box', box.backgroundColor, backgroundOf(option), 3);
          check('check in the box', pseudo(option, '::after').backgroundColor, box.backgroundColor, 3);
        } else {
          check('unchecked box', box.borderTopColor, backgroundOf(option), 3);
        }
      }
      text('highlighted multiselect option', one('[data-dk-part="multiselect-option"][data-highlighted]'));
      await userEvent.keyboard('{Escape}');

      await userEvent.click(page.getByRole('button', { name: /^Period/ }));
      await expect.element(page.getByRole('dialog')).toBeVisible();
      for (const preset of all('[data-dk-part$="preset"]:not(:disabled)')) text('preset', preset);
      for (const weekday of all('[data-dk-part="daterangepicker-weekday"]')) text('weekday', weekday);
      for (const day of all('[data-dk-part="daterangepicker-day"]:not([data-disabled])')) {
        text(`day ${day.getAttribute('data-date') ?? ''}`, day);
      }
      const today = one('[data-dk-part="daterangepicker-day"][data-today]');
      check('today dot', pseudo(today, '::after').backgroundColor, backgroundOf(today), 3);
      // Opening with the mouse focuses the range start without a visible focus; arrows show it.
      for (const key of ['{ArrowRight}', '{ArrowLeft}']) {
        await userEvent.keyboard(key);
        const focused = one('[data-dk-part="daterangepicker-day"]:focus-visible');
        const ring = getComputedStyle(focused).outlineColor;
        check(
          `focus ring on ${focused.getAttribute('data-date') ?? ''}`,
          ring,
          backgroundOf(focused.parentElement as Element),
          3,
        );
      }

      expect(failures).toEqual([]);
    });
  });
});
