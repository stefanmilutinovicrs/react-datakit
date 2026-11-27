import type { CSSProperties } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { page, server, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Combobox } from '../combobox';
import { DateRangePicker } from '../daterangepicker';
import { FilterBar, enumField, textField } from '../filterbar';
import { MultiSelect } from '../multiselect';
import { mix, toHex, toRgb, type Rgb } from '../test/color';
import { emulateMedia } from '../test/media';
import './theme.css';

interface Item {
  id: string;
}

const items: Item[] = [{ id: 'bug' }, { id: 'feature' }, { id: 'docs' }];
const itemProps = { itemToString: (item: Item | null) => item?.id ?? '', itemToKey: (item: Item) => item.id };

function Select({ id = 'select' }: { id?: string }) {
  return (
    <Combobox items={items} defaultValue={items[0]} {...itemProps} data-testid={id}>
      <Combobox.Label>Kind</Combobox.Label>
      <Combobox.Input data-testid={`${id}-input`} />
      <Combobox.Popup>
        <Combobox.List>{(item: Item) => <Combobox.Option item={item}>{item.id}</Combobox.Option>}</Combobox.List>
      </Combobox.Popup>
    </Combobox>
  );
}

function Multi({ id = 'multi' }: { id?: string }) {
  return (
    <MultiSelect items={items} defaultValue={items.slice(0, 2)} {...itemProps}>
      <MultiSelect.Label>Labels</MultiSelect.Label>
      <MultiSelect.Control data-testid={`${id}-control`}>
        <MultiSelect.Chips>
          {(item: Item) => (
            <MultiSelect.Chip data-testid={`${id}-chip-${item.id}`}>
              {item.id}
              <MultiSelect.ChipRemove />
            </MultiSelect.Chip>
          )}
        </MultiSelect.Chips>
        <MultiSelect.Input data-testid={`${id}-input`} />
      </MultiSelect.Control>
      <MultiSelect.Popup>
        <MultiSelect.List>
          {(item: Item) => <MultiSelect.Option item={item}>{item.id}</MultiSelect.Option>}
        </MultiSelect.List>
      </MultiSelect.Popup>
    </MultiSelect>
  );
}

const march = { start: new Date('2026-03-10T00:00:00Z'), end: new Date('2026-03-14T23:59:59.999Z') };

function Picker() {
  return (
    <DateRangePicker locale="en-US" timeZone="UTC" defaultValue={march} defaultOpen>
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

const barFields = [
  textField({ key: 'title', label: 'Title' }),
  enumField({ key: 'kind', label: 'Kind', items, ...itemProps }),
];

function Bar() {
  return <FilterBar fields={barFields} defaultValue={[{ field: 'kind', op: 'is', value: 'bug' }]} />;
}

function find(selector: string): Element {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Nothing matches ${selector}.`);
  return element;
}

const part = (name: string) => find(`[data-dk-part="${name}"]`);
const day = (date: string) => find(`[data-date="${date}"]`);
const styleOf = (id: string) => getComputedStyle(page.getByTestId(id).element());
const accent = (color: string) => ({ '--dk-accent': color }) as CSSProperties;

// Browsers round color-mix() channels differently by at most one step.
function expectColor(actual: string, expected: Rgb | string) {
  const a = toRgb(actual);
  const b = typeof expected === 'string' ? toRgb(expected) : expected;
  const distance = Math.max(...a.map((channel, i) => Math.abs(channel - (b[i] ?? 0))));
  expect(distance, `${toHex(actual)} is not rgb(${b.join(' ')})`).toBeLessThanOrEqual(1);
}

async function openMulti() {
  await userEvent.click(page.getByTestId('multi-input'));
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(page.getByRole('listbox')).toBeVisible();
}

describe('theme', () => {
  afterEach(() => emulateMedia({ colorScheme: null, forcedColors: null }));

  describe('light, dark and auto', () => {
    it('follows prefers-color-scheme by default', async () => {
      await emulateMedia({ colorScheme: 'light' });
      await render(<Select />);
      expectColor(styleOf('select-input').backgroundColor, '#ffffff');
      expectColor(styleOf('select-input').color, '#18181b');
      await emulateMedia({ colorScheme: 'dark' });
      expectColor(styleOf('select-input').backgroundColor, '#18181b');
      expectColor(styleOf('select-input').color, '#fafafa');
    });

    it.each(['light', 'dark'] as const)(
      'data-dk-theme forces a subtree on a %s system, and can be nested',
      async (os) => {
        await emulateMedia({ colorScheme: os });
        await render(
          <div data-dk-theme="dark">
            <Select id="dark" />
            <div data-dk-theme="light">
              <Select id="light" />
              <div data-dk-theme="dark">
                <Select id="dark-again" />
              </div>
            </div>
          </div>,
        );
        expectColor(styleOf('dark-input').backgroundColor, '#18181b');
        expectColor(styleOf('light-input').backgroundColor, '#ffffff');
        expectColor(styleOf('dark-again-input').backgroundColor, '#18181b');
      },
    );

    it('never sets color-scheme outside the components', async () => {
      await render(
        <div data-dk-theme="dark" data-testid="app">
          <Select />
        </div>,
      );
      expect(getComputedStyle(document.documentElement).colorScheme).toBe('normal');
      expect(styleOf('app').colorScheme).toBe('normal');
      expect(styleOf('select').colorScheme).toBe('dark');
    });

    it('labels use the text color of the app around them', async () => {
      await emulateMedia({ colorScheme: 'dark' });
      await render(
        <div style={{ color: 'rgb(1, 2, 3)' }}>
          <Select />
        </div>,
      );
      const label = getComputedStyle(part('combobox-label'));
      expect(label.color).toBe('rgb(1, 2, 3)');
      expect(label.fontSize).toBe('13px');
      expect(label.fontWeight).toBe('500');
    });
  });

  describe('accent', () => {
    it.each([
      ['indigo', '#4f46e5', '#6061ef'],
      ['teal', '#0f766e', '#0e8177'],
      ['violet', '#7c3aed', '#8650f3'],
      ['blue', '#2563eb', '#2b6bee'],
    ] as const)('%s is a preset with a light and a dark shade', async (name, light, dark) => {
      const picker = (theme: 'light' | 'dark') => (
        <div data-dk-accent={name} data-dk-theme={theme}>
          <Picker />
        </div>
      );
      const screen = await render(picker('light'));
      expectColor(getComputedStyle(day('2026-03-10')).backgroundColor, light);
      expectColor(getComputedStyle(day('2026-03-10')).color, '#ffffff');
      await screen.rerender(picker('dark'));
      expectColor(getComputedStyle(day('2026-03-10')).backgroundColor, dark);
      expectColor(getComputedStyle(day('2026-03-10')).color, '#ffffff');
    });

    it('is indigo by default', async () => {
      await render(
        <div data-dk-theme="light">
          <Picker />
        </div>,
      );
      expectColor(getComputedStyle(day('2026-03-10')).backgroundColor, '#4f46e5');
    });

    it('a nested preset wins over an outer one, and --dk-accent wins over the preset of its element', async () => {
      await render(
        <div data-dk-theme="light" data-dk-accent="teal">
          <Multi id="teal" />
          <div data-dk-accent="violet">
            <Multi id="violet" />
          </div>
          <div data-dk-accent="violet" style={accent('#be185d')}>
            <Multi id="custom" />
          </div>
        </div>,
      );
      expectColor(styleOf('teal-chip-bug').backgroundColor, mix('#0f766e', 0.12, '#ffffff'));
      expectColor(styleOf('violet-chip-bug').backgroundColor, mix('#7c3aed', 0.12, '#ffffff'));
      expectColor(styleOf('custom-chip-bug').backgroundColor, mix('#be185d', 0.12, '#ffffff'));
    });

    it.each([
      ['light', '#ffffff'],
      ['dark', '#18181b'],
    ] as const)('--dk-accent on a %s subtree recolors everything derived from it', async (theme, surface) => {
      await render(
        <div data-dk-theme={theme} style={accent('#be185d')}>
          <Multi />
          <Picker />
        </div>,
      );
      const subtle = mix('#be185d', 0.12, surface);
      const text = theme === 'light' ? mix('#be185d', 0.8, '#18181b') : mix('#be185d', 0.55, '#ffffff');
      expectColor(styleOf('multi-chip-bug').backgroundColor, subtle);
      expectColor(styleOf('multi-chip-bug').color, text);
      expectColor(getComputedStyle(day('2026-03-12')).backgroundColor, subtle);
      expectColor(getComputedStyle(day('2026-03-12')).color, text);
      expectColor(getComputedStyle(day('2026-03-14')).backgroundColor, '#be185d');
      expectColor(getComputedStyle(part('daterangepicker-custom-preset')).backgroundColor, subtle);
      expectColor(getComputedStyle(part('daterangepicker-custom-preset')).color, text);
    });

    it('derived tokens can be set on a subtree', async () => {
      const style = { '--dk-accent-subtle': '#ffe4e6', '--dk-accent-text': '#881337', '--dk-surface': '#fffbeb' };
      await render(
        <div data-dk-theme="light" style={style as CSSProperties}>
          <Multi />
        </div>,
      );
      expectColor(styleOf('multi-chip-bug').backgroundColor, '#ffe4e6');
      expectColor(styleOf('multi-chip-bug').color, '#881337');
      expectColor(styleOf('multi-control').backgroundColor, '#fffbeb');
    });
  });

  describe('radius', () => {
    it('popups and lists stay at 12px or less whatever --dk-radius is', async () => {
      await render(
        <div style={{ '--dk-radius': '999px' } as CSSProperties}>
          <Multi />
          <Picker />
        </div>,
      );
      expect(styleOf('multi-control').borderRadius).toBe('999px');
      expect(parseFloat(getComputedStyle(part('daterangepicker-popover')).borderRadius)).toBeLessThanOrEqual(12);
      await userEvent.keyboard('{Escape}');
      await openMulti();
      for (const name of ['multiselect-popup', 'multiselect-list', 'multiselect-option']) {
        expect(parseFloat(getComputedStyle(part(name)).borderRadius), name).toBeLessThanOrEqual(12);
      }
    });

    it('defaults to 8px for controls, 10px for popups, 6px for options and chips', async () => {
      await render(<Multi />);
      await openMulti();
      expect(styleOf('multi-control').borderRadius).toBe('8px');
      expect(getComputedStyle(part('multiselect-popup')).borderRadius).toBe('10px');
      expect(getComputedStyle(part('multiselect-option')).borderRadius).toBe('6px');
      expect(styleOf('multi-chip-bug').borderRadius).toBe('6px');
    });

    it('FilterBar chips follow --dk-radius; its menu and editor stay at 12px or less', async () => {
      await render(
        <div style={{ '--dk-radius': '999px' } as CSSProperties}>
          <Bar />
        </div>,
      );
      expect(getComputedStyle(part('filterbar-chip')).borderRadius).toBe('997px');
      await userEvent.click(page.getByRole('button', { name: 'Kind is', exact: true }));
      expect(parseFloat(getComputedStyle(part('filterbar-operator-menu')).borderRadius)).toBeLessThanOrEqual(12);
      await userEvent.keyboard('{Escape}');
      await userEvent.click(page.getByRole('button', { name: 'Kind is bug' }));
      expect(parseFloat(getComputedStyle(part('filterbar-editor')).borderRadius)).toBeLessThanOrEqual(12);
    });
  });

  describe('focus', () => {
    const indicators = (id: string) => {
      const { boxShadow, outlineStyle } = styleOf(id);
      return Number(boxShadow !== 'none') + Number(outlineStyle !== 'none');
    };

    it('a focused input has an accent border and exactly one 3px ring', async () => {
      await render(
        <div data-dk-theme="light" style={accent('#be185d')}>
          <Select />
        </div>,
      );
      await userEvent.click(page.getByTestId('select-input'));
      expectColor(styleOf('select-input').borderTopColor, '#be185d');
      expect(styleOf('select-input').boxShadow).toContain('0px 0px 0px 3px');
      expect(indicators('select-input')).toBe(1);
      expect(indicators('select')).toBe(0);
    });

    it('MultiSelect shows the ring on the control only', async () => {
      await render(
        <div data-dk-theme="light" style={accent('#be185d')}>
          <Multi />
        </div>,
      );
      await userEvent.click(page.getByTestId('multi-input'));
      expectColor(styleOf('multi-control').borderTopColor, '#be185d');
      expect(indicators('multi-control')).toBe(1);
      expect(indicators('multi-input')).toBe(0);
    });

    it('a focused FilterBar segment has exactly one ring, inside the segment', async () => {
      await render(
        <div data-dk-theme="light" style={accent('#be185d')}>
          <Bar />
        </div>,
      );
      // A keyboard focus: Firefox doesn't match :focus-visible when script moves focus after a click.
      await userEvent.tab();
      const operator = getComputedStyle(part('filterbar-operator'));
      expect(operator.outlineStyle).toBe('solid');
      expect(operator.outlineOffset).toBe('-2px');
      expectColor(operator.outlineColor, '#be185d');
      expect(operator.boxShadow).toBe('none');
      expect(getComputedStyle(part('filterbar-chip')).outlineStyle).toBe('none');
    });

    // Playwright can't emulate forced colors in WebKit, which has no forced colors mode.
    it.skipIf(server.browser === 'webkit')('forced colors replace the ring with one outline', async () => {
      await emulateMedia({ forcedColors: 'active' });
      await render(
        <>
          <Select />
          <Multi />
        </>,
      );
      await userEvent.click(page.getByTestId('select-input'));
      expect(styleOf('select-input').outlineStyle).toBe('solid');
      await userEvent.click(page.getByTestId('multi-input'));
      expect(styleOf('multi-control').outlineStyle).toBe('solid');
      expect(styleOf('multi-input').outlineStyle).toBe('none');
    });
  });

  it('a selected option keeps the text color', async () => {
    await render(
      <div data-dk-theme="light">
        <Select />
      </div>,
    );
    await userEvent.click(page.getByTestId('select-input'));
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(page.getByRole('listbox')).toBeVisible();
    expect(toHex(getComputedStyle(find('[data-dk-part="combobox-option"][data-selected]')).color)).toBe('#18181b');
  });

  it.each([
    ['light', '#6f6f78'],
    ['dark', '#a1a1aa'],
  ])('group headings are muted, 12px and weight 500 in %s', async (theme, muted) => {
    await render(
      <div data-dk-theme={theme}>
        <Combobox items={items} {...itemProps} groupBy={(item) => (item.id === 'bug' ? 'Fixes' : 'Work')}>
          <Combobox.Label>Kind</Combobox.Label>
          <Combobox.Input data-testid="grouped-input" />
          <Combobox.Popup>
            <Combobox.List>{(item: Item) => <Combobox.Option item={item}>{item.id}</Combobox.Option>}</Combobox.List>
          </Combobox.Popup>
        </Combobox>
      </div>,
    );
    await userEvent.click(page.getByTestId('grouped-input'));
    await userEvent.keyboard('{ArrowDown}');
    const heading = getComputedStyle(part('combobox-group-label'));
    expect(toHex(heading.color)).toBe(muted);
    expect(heading.fontSize).toBe('12px');
    expect(heading.fontWeight).toBe('500');
  });

  it('uses weights 400 and 500 only', async () => {
    const screen = await render(
      <>
        <Select />
        <Multi />
        <Picker />
        <Bar />
      </>,
    );
    const weights = new Set([...screen.container.querySelectorAll('*')].map((el) => getComputedStyle(el).fontWeight));
    expect([...weights].sort()).toEqual(['400', '500']);
  });
});
