import { useState } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { page, server, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import '../styles/theme.css';
import { expectNoA11yViolations } from '../test/axe';
import { hydrationErrors } from '../test/hydration';
import {
  FilterBar,
  defaultFilterBarLabels,
  enumField,
  filtersFromSearchParams,
  numberField,
  textField,
  textOperators,
  dateField,
  multiEnumField,
  type Filter,
  type FilterField,
  type FilterBarProps,
  type FilterEditorProps,
} from './index';

// https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
// https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
// https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

const statuses = [
  { id: 'open', name: 'Open' },
  { id: 'closed', name: 'Closed' },
];
const tags = [
  { id: 'bug', area: 'Fixes' },
  { id: 'feature', area: 'Work' },
  { id: 'docs', area: 'Work' },
];
const users = [
  { id: 1, name: 'Ana', team: 'Design' },
  { id: 2, name: 'Bojan', team: 'Platform' },
];

const fields = [
  textField({
    key: 'title',
    label: 'Title',
    operators: [...textOperators, { key: 'isEmpty', label: 'is empty', arity: 'none' }],
  }),
  enumField({
    key: 'status',
    label: 'Status',
    group: 'Issue',
    items: statuses,
    itemToKey: (s) => s.id,
    itemToString: (s) => s?.name ?? '',
  }),
  enumField({
    key: 'owner',
    label: 'Owner',
    group: 'People',
    items: users,
    itemToKey: (u) => u.id,
    itemToString: (u) => u?.name ?? '',
    groupBy: (u) => u.team,
  }),
  numberField({ key: 'estimate', label: 'Estimate', group: 'Issue', integer: true, min: 0 }),
  numberField({ key: 'price', label: 'Price', group: 'Issue' }),
  dateField({ key: 'created', label: 'Created', group: 'Dates', timeZone: 'UTC' }),
  multiEnumField({
    key: 'labels',
    label: 'Labels',
    group: 'Issue',
    items: tags,
    itemToKey: (t) => t.id,
    itemToString: (t) => t?.id ?? '',
    groupBy: (t) => t.area,
  }),
];

// A custom type the bar has no editor for.
const rating = {
  key: 'rating',
  label: 'Rating',
  type: 'rating',
  operators: [{ key: 'is', label: 'is', arity: 'single' }] as const,
  format: (value: number) => `${value} stars`,
  serializeValue: String,
  parseValue: (text: string) => Number(text),
} satisfies FilterField<'rating', 'rating', number, readonly [{ key: 'is'; label: string; arity: 'single' }]>;
type IssueFilter = Filter<typeof fields>;

const status = (value: string): IssueFilter => ({ field: 'status', op: 'is', value });
const title = (value: string): IssueFilter => ({ field: 'title', op: 'contains', value });

function Bar(props: Partial<FilterBarProps<typeof fields>>) {
  return (
    <>
      <button type="button">Before</button>
      <FilterBar fields={fields} {...props} />
      <button type="button">After</button>
    </>
  );
}

async function renderBar(props: Partial<FilterBarProps<typeof fields>> = {}) {
  const onChange = vi.fn<(value: readonly IssueFilter[]) => void>();
  const result = await render(<Bar onChange={onChange} {...props} />);
  return { ...result, onChange };
}

const toolbar = () => page.getByRole('toolbar', { name: 'Filters' });
const picker = () => page.getByRole('combobox', { name: 'Add filter' });
const chip = (name: string) => page.getByRole('group', { name, exact: true });
const button = (name: string) => page.getByRole('button', { name, exact: true });
const dialog = () => page.getByRole('dialog');
const menu = () => page.getByRole('menu');
const menuItem = (name: string) => page.getByRole('menuitemradio', { name, exact: true });
const option = (name: string) => page.getByRole('option', { name, exact: true });
const announcement = () => toolbar().element().querySelector(':scope > [role="status"]')?.textContent ?? '';
const focused = () => document.activeElement;

async function expectFocus(locator: { element: () => Element }) {
  await expect.poll(() => focused()).toBe(locator.element());
}

describe('adding a filter', () => {
  it('with the keyboard: field, then value; focus returns to the picker', async () => {
    const { onChange } = await renderBar();
    await userEvent.click(button('Before'));
    await userEvent.tab();
    await expectFocus(picker());
    await userEvent.keyboard('sta');
    await userEvent.keyboard('{ArrowDown}{Enter}');

    await expect.element(dialog()).toHaveAccessibleName('Status is');
    await expectFocus(page.getByRole('combobox', { name: 'Status is' }));
    await expect.element(option('Open')).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([status('open')]);
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(chip('Status is Open')).toBeVisible();
    await expectFocus(picker());
    await expect.poll(announcement).toBe('Filter added: Status is Open');
  });

  it('with the pointer: the picker opens on click and shows the field groups', async () => {
    const { onChange } = await renderBar();
    await userEvent.click(picker());
    await expect.element(page.getByRole('group', { name: 'Issue' })).toBeInTheDocument();
    await expect.element(page.getByRole('group', { name: 'People' })).toBeInTheDocument();
    await userEvent.click(option('Title'));

    await expect.element(dialog()).toHaveAccessibleName('Title contains');
    const textbox = page.getByRole('textbox', { name: 'Title contains' });
    await expectFocus(textbox);
    await userEvent.type(textbox, 'login bug');
    await userEvent.click(button('Apply'));
    expect(onChange).toHaveBeenLastCalledWith([title('login bug')]);
    await expectFocus(picker());
  });

  it('does not open the picker on focus, only on ArrowDown, typing or a click', async () => {
    await renderBar();
    await userEvent.click(button('Before'));
    await userEvent.tab();
    await expectFocus(picker());
    await expect.element(picker()).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(picker()).toHaveAttribute('aria-expanded', 'true');
  });

  it('commits a text value with Enter and keeps the editor open while it is invalid', async () => {
    const { onChange } = await renderBar();
    await userEvent.click(picker());
    await userEvent.click(option('Title'));
    const textbox = page.getByRole('textbox', { name: 'Title contains' });
    await userEvent.keyboard('   {Enter}');

    await expect.element(textbox).toHaveAttribute('aria-invalid', 'true');
    await expect.element(textbox).toHaveAccessibleDescription('Enter a value');
    await expect.element(dialog()).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.fill(textbox, 'bug');
    await expect.element(textbox).not.toHaveAttribute('aria-invalid');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([title('bug')]);
  });

  it('removes the new chip on Escape without calling onChange', async () => {
    const { onChange } = await renderBar();
    await userEvent.click(picker());
    await userEvent.click(option('Status'));
    await expect.element(chip('Status is')).toBeVisible();
    await userEvent.keyboard('{Escape}');

    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(chip('Status is')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    await expectFocus(picker());
  });

  it('applies a valid text value on a click outside and cancels an invalid one', async () => {
    const { onChange } = await renderBar();
    await userEvent.click(picker());
    await userEvent.click(option('Title'));
    await userEvent.keyboard('bug');
    await userEvent.click(button('Before'));
    expect(onChange).toHaveBeenLastCalledWith([title('bug')]);

    await userEvent.click(picker());
    await userEvent.click(option('Title'));
    await userEvent.click(button('Before'));
    await expect.element(dialog()).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('commits an operator without a value at once', async () => {
    const onChange = vi.fn();
    const withEmpty = [
      textField({
        key: 'title',
        label: 'Title',
        defaultOperator: 'isEmpty',
        operators: [...textOperators, { key: 'isEmpty', label: 'is empty', arity: 'none' }],
      }),
    ];
    await render(<FilterBar fields={withEmpty} onChange={onChange} />);
    await userEvent.click(picker());
    await userEvent.click(option('Title'));
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'title', op: 'isEmpty' }]);
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(chip('Title is empty')).toBeVisible();
  });

  it('offers every built-in field and leaves custom types without an editor out', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await render(<FilterBar fields={[...fields, rating]} />);
    await userEvent.click(picker());
    for (const name of ['Title', 'Status', 'Owner', 'Estimate', 'Price', 'Created', 'Labels'])
      await expect.element(option(name)).toBeInTheDocument();
    await expect.element(option('Rating')).not.toBeInTheDocument();
    error.mockRestore();
  });

  it('announces a repeated text again', async () => {
    await renderBar();
    const add = async () => {
      await userEvent.click(picker());
      await userEvent.click(option('Status'));
      await userEvent.click(option('Open'));
    };
    await add();
    const first = announcement();
    await add();
    await expect.poll(announcement).not.toBe(first);
    expect(announcement().trim()).toBe(first.trim());
  });
});

describe('editing a chip', () => {
  it('changes the operator with the menu button; focus returns to the operator', async () => {
    const { onChange } = await renderBar({ defaultValue: [status('open')] });
    const operator = button('Status is');
    await expect.element(operator).toHaveAttribute('aria-haspopup', 'menu');
    await userEvent.click(button('Before'));
    await userEvent.tab();
    await expectFocus(operator);
    await userEvent.keyboard('{Enter}');

    await expect.element(menu()).toBeVisible();
    await expect.element(operator).toHaveAttribute('aria-expanded', 'true');
    await expectFocus(menuItem('is'));
    await expect.element(menuItem('is')).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{ArrowDown}');
    await expectFocus(menuItem('is not'));
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenLastCalledWith([{ field: 'status', op: 'isNot', value: 'open' }]);
    await expect.element(menu()).not.toBeInTheDocument();
    await expectFocus(button('Status is not'));
    await expect.poll(announcement).toBe('Filter changed: Status is not Open');
  });

  it('opens the menu on the last item with ArrowUp and moves with Home, End and wrapping arrows', async () => {
    await renderBar({ defaultValue: [title('bug')] });
    await userEvent.click(button('Before'));
    await userEvent.tab();
    await userEvent.keyboard('{ArrowUp}');
    await expectFocus(menuItem('is empty'));
    await userEvent.keyboard('{ArrowDown}');
    await expectFocus(menuItem('contains'));
    await userEvent.keyboard('{ArrowUp}');
    await expectFocus(menuItem('is empty'));
    await userEvent.keyboard('{Home}');
    await expectFocus(menuItem('contains'));
    await userEvent.keyboard('{End}');
    await expectFocus(menuItem('is empty'));
  });

  it('closes the menu on Escape without a change, and on Tab', async () => {
    const { onChange } = await renderBar({ defaultValue: [status('open')] });
    await userEvent.click(button('Status is'));
    await expect.element(menu()).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(menu()).not.toBeInTheDocument();
    await expectFocus(button('Status is'));

    await userEvent.keyboard('{ArrowDown}');
    await expect.element(menu()).toBeVisible();
    await userEvent.tab();
    await expect.element(menu()).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes the menu on a click outside', async () => {
    await renderBar({ defaultValue: [status('open')] });
    await userEvent.click(button('Status is'));
    await userEvent.click(button('Before'));
    await expect.element(menu()).not.toBeInTheDocument();
  });

  it('keeps the filter until a value for an operator of another arity is committed', async () => {
    const { onChange } = await renderBar({ defaultValue: [{ field: 'title', op: 'isEmpty' }] });
    await userEvent.click(button('Title is empty'));
    await userEvent.click(menuItem('contains'));
    await expect.element(dialog()).toHaveAccessibleName('Title contains');
    await userEvent.keyboard('{Escape}');
    expect(onChange).not.toHaveBeenCalled();
    await expect.element(chip('Title is empty')).toBeVisible();
    await expectFocus(button('Title is empty'));

    await userEvent.click(button('Title is empty'));
    await userEvent.click(menuItem('contains'));
    await userEvent.keyboard('bug{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([title('bug')]);
    await expectFocus(button('Title contains'));

    await userEvent.click(button('Title contains'));
    await userEvent.click(menuItem('is empty'));
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'title', op: 'isEmpty' }]);
  });

  it('edits the value; the editor starts on the current value and focus returns to the value', async () => {
    const { onChange } = await renderBar({ defaultValue: [status('open')] });
    const value = button('Status is Open');
    await expect.element(value).toHaveAttribute('aria-haspopup', 'dialog');
    await userEvent.click(value);
    const search = page.getByRole('combobox', { name: 'Status is' });
    await expect.poll(() => search.element().getAttribute('aria-activedescendant')).toBe(option('Open').element().id);
    await userEvent.click(option('Closed'));

    expect(onChange).toHaveBeenLastCalledWith([status('closed')]);
    await expectFocus(button('Status is Closed'));
    await expect.poll(announcement).toBe('Filter changed: Status is Closed');
  });

  it('closes the enum editor with one Escape and keeps the value', async () => {
    const { onChange } = await renderBar({ defaultValue: [status('open')] });
    await userEvent.click(button('Status is Open'));
    await userEvent.keyboard('clo');
    await userEvent.keyboard('{Escape}');
    await expect.element(dialog()).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    await expectFocus(button('Status is Open'));
  });

  it('groups enum options by the field groupBy', async () => {
    await renderBar({ defaultValue: [{ field: 'owner', op: 'is', value: '1' }] });
    await userEvent.click(button('Owner is Ana'));
    await expect.element(dialog().getByRole('group', { name: 'Design' })).toBeInTheDocument();
    await expect.element(dialog().getByRole('group', { name: 'Platform' })).toBeInTheDocument();
  });

  it('keeps Tab inside the editor', async () => {
    await renderBar({ defaultValue: [title('bug')] });
    await userEvent.click(button('Title contains bug'));
    const textbox = page.getByRole('textbox', { name: 'Title contains' });
    await expectFocus(textbox);
    await userEvent.tab();
    await expectFocus(button('Apply'));
    await userEvent.tab();
    await expectFocus(textbox);
    await userEvent.tab({ shift: true });
    await expectFocus(button('Apply'));
  });
});

describe('removing filters', () => {
  const three = [status('open'), title('bug'), { field: 'owner', op: 'is', value: '2' }] satisfies IssueFilter[];

  it('moves focus to the next chip, then the previous one, then the picker', async () => {
    const { onChange } = await renderBar({ defaultValue: three });
    await userEvent.click(button('Remove filter Title contains bug'));
    expect(onChange).toHaveBeenLastCalledWith([three[0], three[2]]);
    await expectFocus(button('Owner is'));
    await expect.poll(announcement).toBe('Filter removed: Title contains bug');

    await userEvent.click(button('Remove filter Owner is Bojan'));
    await expectFocus(button('Status is'));
    await userEvent.click(button('Remove filter Status is Open'));
    await expectFocus(picker());
  });

  it('removes a chip with Delete or Backspace on any of its segments', async () => {
    const { onChange } = await renderBar({ defaultValue: three });
    await userEvent.click(button('Before'));
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    await expectFocus(button('Status is Open'));
    await userEvent.keyboard('{Delete}');
    expect(onChange).toHaveBeenLastCalledWith([three[1], three[2]]);
    await expectFocus(button('Title contains'));
    await userEvent.keyboard('{Backspace}');
    expect(onChange).toHaveBeenLastCalledWith([three[2]]);
  });

  it('removes the last chip with Backspace in the empty picker', async () => {
    const { onChange } = await renderBar({ defaultValue: three });
    await userEvent.click(picker());
    await userEvent.keyboard('{Escape}{Backspace}');
    expect(onChange).toHaveBeenLastCalledWith([three[0], three[1]]);
    await expectFocus(picker());
    await userEvent.keyboard('s{Backspace}');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('clears all filters; Clear is only shown while there are filters', async () => {
    const { onChange } = await renderBar({ defaultValue: three });
    await userEvent.click(button('Clear'));
    expect(onChange).toHaveBeenLastCalledWith([]);
    await expectFocus(picker());
    await expect.element(button('Clear')).not.toBeInTheDocument();
    await expect.poll(announcement).toBe('All filters cleared');
  });
});

describe('toolbar', () => {
  const two = [status('open'), title('bug')] satisfies IssueFilter[];

  it('is one Tab stop', async () => {
    await renderBar({ defaultValue: two });
    await userEvent.click(button('Before'));
    await userEvent.tab();
    await expectFocus(button('Status is'));
    await userEvent.tab();
    await expectFocus(button('After'));
    await userEvent.tab({ shift: true });
    await expectFocus(button('Status is'));
  });

  it('moves with the arrow keys, Home and End, without wrapping', async () => {
    await renderBar({ defaultValue: two });
    await userEvent.click(button('Before'));
    await userEvent.tab();
    const order = [
      'Status is',
      'Status is Open',
      'Remove filter Status is Open',
      'Title contains',
      'Title contains bug',
      'Remove filter Title contains bug',
      'Clear',
    ];
    for (const name of order.slice(1)) {
      await userEvent.keyboard('{ArrowRight}');
      await expectFocus(button(name));
    }
    await userEvent.keyboard('{ArrowRight}');
    await expectFocus(picker());
    await userEvent.keyboard('{ArrowLeft}');
    await expectFocus(button('Clear'));
    await userEvent.keyboard('{Home}');
    await expectFocus(button('Status is'));
    await userEvent.keyboard('{ArrowLeft}');
    await expectFocus(button('Status is'));
    await userEvent.keyboard('{End}');
    await expectFocus(picker());
  });

  it('leaves the picker with ArrowLeft only when the caret is at the start', async () => {
    await renderBar({ defaultValue: two });
    await userEvent.click(picker());
    await userEvent.keyboard('{Escape}ab{ArrowLeft}');
    await expectFocus(picker());
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await expectFocus(button('Clear'));
  });

  it('returns to the last focused item', async () => {
    await renderBar({ defaultValue: two });
    await userEvent.click(button('Before'));
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    await expectFocus(button('Title contains'));
    await userEvent.tab();
    await userEvent.tab({ shift: true });
    await expectFocus(button('Title contains'));
  });

  it('is the picker alone while there are no filters', async () => {
    await renderBar();
    await userEvent.click(button('Before'));
    await userEvent.tab();
    await expectFocus(picker());
    await userEvent.tab();
    await expectFocus(button('After'));
  });
});

describe('accessibility', () => {
  it('names the toolbar, the chips and their parts', async () => {
    await renderBar({ defaultValue: [status('open')] });
    await expect.element(toolbar()).toBeVisible();
    await expect.element(chip('Status is Open')).toBeVisible();
    await expect.element(button('Status is')).toBeVisible();
    await expect.element(button('Status is Open')).toBeVisible();
    await expect.element(button('Remove filter Status is Open')).toBeVisible();
  });

  it('passes axe with chips and with the picker open', async () => {
    await renderBar({ defaultValue: [status('open'), title('bug')] });
    await expectNoA11yViolations(toolbar().element());
    await userEvent.click(picker());
    await expect.element(option('Title')).toBeVisible();
    await expectNoA11yViolations(toolbar().element());
  });

  // Firefox crashes when a role+name locator resolves after axe-core has read
  // ariaLabelledByElements in the page. Fixed in Firefox 163; remove this skip once
  // Playwright ships a Firefox 163+ build.
  // https://github.com/microsoft/playwright/issues/43967
  // https://bugzilla.mozilla.org/show_bug.cgi?id=2090055
  it.skipIf(server.browser === 'firefox')('passes axe with the menu and each editor open', async () => {
    await renderBar({
      defaultValue: [
        status('open'),
        title('bug'),
        { field: 'estimate', op: 'between', value: [1, 5] },
        labels(['bug']),
        created(),
      ],
    });
    const root = () => toolbar().element();
    await userEvent.click(button('Status is'));
    await expect.element(menu()).toBeVisible();
    await expectNoA11yViolations(root());
    await userEvent.keyboard('{Escape}');
    await userEvent.click(button('Status is Open'));
    await expect.element(option('Closed')).toBeVisible();
    await expectNoA11yViolations(root());
    await userEvent.keyboard('{Escape}');
    await userEvent.click(button('Title contains bug'));
    await userEvent.fill(page.getByRole('textbox', { name: 'Title contains' }), ' ');
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByText('Enter a value')).toBeVisible();
    await expectNoA11yViolations(root());
    await userEvent.keyboard('{Escape}');
    for (const [value, popup] of [
      [() => button('Estimate is between 1 – 5'), () => textbox('Estimate is between, from')],
      [() => button('Labels is any of bug'), () => option('docs')],
      [marchValue, dialog],
    ] as const) {
      await userEvent.click(value());
      await expect.element(popup()).toBeVisible();
      await expectNoA11yViolations(root());
      await userEvent.keyboard('{Escape}');
    }
  });

  it('passes axe while empty', async () => {
    await renderBar();
    await expectNoA11yViolations(toolbar().element());
  });

  it('uses the given labels', async () => {
    await renderBar({
      defaultValue: [status('open')],
      labels: {
        toolbar: 'Filteri',
        addFilter: 'Dodaj filter',
        remove: (summary) => `Ukloni ${summary}`,
        removed: (summary) => `Uklonjeno: ${summary}`,
      },
    });
    await expect.element(page.getByRole('toolbar', { name: 'Filteri' })).toBeVisible();
    await expect.element(page.getByRole('combobox', { name: 'Dodaj filter' })).toBeVisible();
    await userEvent.click(button('Ukloni Status is Open'));
    await expect
      .poll(() => page.getByRole('toolbar').element().querySelector(':scope > [role="status"]')?.textContent)
      .toBe('Uklonjeno: Status is Open');
    expect(defaultFilterBarLabels.toolbar).toBe('Filters');
  });
});

describe('value', () => {
  it('follows a controlled value', async () => {
    function Controlled() {
      const [value, setValue] = useState<readonly IssueFilter[]>([status('open')]);
      return (
        <>
          <FilterBar fields={fields} value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue([title('x')])}>
            Replace
          </button>
          <output>{JSON.stringify(value)}</output>
        </>
      );
    }
    await render(<Controlled />);
    await userEvent.click(button('Replace'));
    await expect.element(chip('Title contains x')).toBeVisible();
    await expect.element(chip('Status is Open')).not.toBeInTheDocument();
    await userEvent.click(button('Remove filter Title contains x'));
    await expect.element(page.getByRole('status').filter({ hasText: '[]' })).toBeInTheDocument();
  });

  it('ignores changes while controlled without onChange', async () => {
    await render(<FilterBar fields={fields} value={[status('open')]} />);
    await userEvent.click(button('Remove filter Status is Open'));
    await expect.element(chip('Status is Open')).toBeVisible();
  });

  it('shows a chip of a custom type without an editor read-only and reports it once in development', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await render(<FilterBar fields={[...fields, rating]} defaultValue={[{ field: 'rating', op: 'is', value: 4 }]} />);
    const value = button('Rating is 4 stars');
    await expect.element(value).toHaveAttribute('aria-disabled', 'true');
    // Playwright won't click an aria-disabled button, so the click is dispatched directly.
    (value.element() as HTMLElement).click();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(button('Remove filter Rating is 4 stars')).toBeVisible();
    expect(error.mock.calls.filter(([message]) => String(message).includes('"rating"'))).toHaveLength(1);
    error.mockRestore();
  });

  it('uses a custom editor from `editors`', async () => {
    function Stepper(props: FilterEditorProps<number>) {
      return (
        <button type="button" onClick={() => props.onCommit((props.value ?? 0) + 1)}>
          Add one
        </button>
      );
    }
    const { onChange } = await renderBar({
      editors: { number: Stepper },
      defaultValue: [{ field: 'estimate', op: 'gt', value: 3 }],
    });
    await userEvent.click(button('Estimate is greater than 3'));
    await userEvent.click(button('Add one'));
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'estimate', op: 'gt', value: 4 }]);
  });
});

const textbox = (name: string) => page.getByRole('textbox', { name, exact: true });

describe('number editor', () => {
  it('adds a number with the keyboard; focus returns to the picker', async () => {
    const { onChange } = await renderBar();
    await userEvent.click(picker());
    await userEvent.keyboard('Estim{ArrowDown}{Enter}');
    await expect.element(dialog()).toHaveAccessibleName('Estimate is');
    const input = textbox('Estimate is');
    await expectFocus(input);
    await expect.element(input).toHaveAttribute('inputmode', 'decimal');
    await userEvent.keyboard('3{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'estimate', op: 'eq', value: 3 }]);
    await expect.element(chip('Estimate is 3')).toBeVisible();
    await expectFocus(picker());
  });

  it('accepts a comma or a dot as the decimal separator', async () => {
    const { onChange } = await renderBar();
    await userEvent.click(picker());
    await userEvent.click(option('Price'));
    await userEvent.keyboard('1,5{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'price', op: 'eq', value: 1.5 }]);
    await userEvent.click(button('Price is 1.5'));
    await userEvent.fill(textbox('Price is'), '2.25');
    await userEvent.click(button('Apply'));
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'price', op: 'eq', value: 2.25 }]);
  });

  it.each([
    ['abc', 'Enter a number'],
    ['1.5', 'Enter a whole number'],
    ['-1', 'Enter 0 or more'],
  ])('keeps the editor open for %j: %s', async (text, message) => {
    const { onChange } = await renderBar();
    await userEvent.click(picker());
    await userEvent.click(option('Estimate'));
    await userEvent.keyboard(`${text}{Enter}`);
    await expect.element(textbox('Estimate is')).toHaveAttribute('aria-invalid', 'true');
    await expect.element(textbox('Estimate is')).toHaveAccessibleDescription(message);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('edits a range in two named inputs; focus returns to the operator', async () => {
    const { onChange } = await renderBar({ defaultValue: [{ field: 'estimate', op: 'gt', value: 3 }] });
    await userEvent.click(button('Estimate is greater than'));
    await userEvent.click(menuItem('is between'));
    await expect.element(dialog()).toHaveAccessibleName('Estimate is between');
    const from = textbox('Estimate is between, from');
    const to = textbox('Estimate is between, to');
    await expectFocus(from);
    await userEvent.keyboard('5');
    await userEvent.fill(to, '2');
    await userEvent.keyboard('{Enter}');
    await expect.element(from).toHaveAccessibleDescription('The start must not be after the end');
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.fill(from, '2');
    await userEvent.fill(to, '5');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'estimate', op: 'between', value: [2, 5] }]);
    await expectFocus(button('Estimate is between'));
  });

  it('applies a valid number on a click outside', async () => {
    const { onChange } = await renderBar();
    await userEvent.click(picker());
    await userEvent.click(option('Price'));
    await userEvent.keyboard('7');
    await userEvent.click(button('Before'));
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'price', op: 'eq', value: 7 }]);
  });
});

const march = { start: '2026-03-01', end: '2026-03-14' };
const created = (value = march): IssueFilter => ({ field: 'created', op: 'between', value });
const marchValue = () => page.getByRole('button', { name: /^Created is between Mar 1\s*–\s*14, 2026$/ });
const dayIn = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

describe('date editor', () => {
  it('is the DateRangePicker trigger, named after the filter', async () => {
    await renderBar({ defaultValue: [created()] });
    const value = marchValue();
    await expect.element(value).toHaveAttribute('aria-haspopup', 'dialog');
    expect(value.element().getAttribute('data-dk-part')).toBe('filterbar-value');
    await userEvent.click(value);
    await expect.element(dialog()).toHaveAccessibleName('Created is between');
    await expect.element(value).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens the calendar at once for a new filter; a preset adds it and focus returns to the picker', async () => {
    const { onChange } = await renderBar();
    await userEvent.click(picker());
    await userEvent.click(option('Created'));
    await expect.element(dialog()).toBeVisible();
    await expect.poll(() => focused()?.hasAttribute('data-date')).toBe(true);
    await userEvent.click(button('Today'));
    const today = dayIn('UTC');
    expect(onChange).toHaveBeenLastCalledWith([created({ start: today, end: today })]);
    await expect.element(dialog()).not.toBeInTheDocument();
    await expectFocus(picker());
  });

  it('removes a new chip on Escape; focus returns to the picker', async () => {
    const { onChange } = await renderBar();
    await userEvent.click(picker());
    await userEvent.click(option('Created'));
    await expect.element(dialog()).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(chip('Created is between')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    await expectFocus(picker());
  });

  it('edits the range; focus returns to the value', async () => {
    const { onChange } = await renderBar({ defaultValue: [created()] });
    await userEvent.click(marchValue());
    await userEvent.click(button('Today'));
    const today = dayIn('UTC');
    expect(onChange).toHaveBeenLastCalledWith([created({ start: today, end: today })]);
    await expect.poll(() => focused()?.getAttribute('data-dk-part')).toBe('filterbar-value');
  });

  it('keeps the value on Escape while editing', async () => {
    const { onChange } = await renderBar({ defaultValue: [created()] });
    await userEvent.click(marchValue());
    await userEvent.keyboard('{Escape}');
    expect(onChange).not.toHaveBeenCalled();
    await expectFocus(marchValue());
  });

  it('writes the calendar days of the field time zone', async () => {
    const onChange = vi.fn();
    const belgrade = [dateField({ key: 'created', label: 'Created', timeZone: 'Europe/Belgrade' })];
    await render(<FilterBar fields={belgrade} onChange={onChange} />);
    await userEvent.click(picker());
    await userEvent.click(option('Created'));
    await userEvent.click(button('Today'));
    const today = dayIn('Europe/Belgrade');
    expect(onChange).toHaveBeenLastCalledWith([
      { field: 'created', op: 'between', value: { start: today, end: today } },
    ]);
  });

  it('stays in the toolbar: arrows move past it and Delete removes the chip', async () => {
    const { onChange } = await renderBar({ defaultValue: [created(), status('open')] });
    await userEvent.click(button('Before'));
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    await expectFocus(marchValue());
    await userEvent.keyboard('{ArrowRight}');
    await expectFocus(button('Remove filter Created is between Mar 1 – 14, 2026'));
    await userEvent.keyboard('{ArrowLeft}{Delete}');
    expect(onChange).toHaveBeenLastCalledWith([status('open')]);
  });
});

const labels = (value: readonly string[]): IssueFilter => ({ field: 'labels', op: 'isAnyOf', value });

describe('multi-enum editor', () => {
  it('toggles several options and applies them; focus returns to the picker', async () => {
    const { onChange } = await renderBar();
    await userEvent.click(picker());
    await userEvent.click(option('Labels'));
    await expect.element(dialog()).toHaveAccessibleName('Labels is any of');
    await expectFocus(page.getByRole('combobox', { name: 'Labels is any of' }));
    await userEvent.keyboard('{ArrowDown}{Enter}{ArrowDown}{Enter}');
    await expect.element(option('bug')).toHaveAttribute('aria-selected', 'true');
    await expect.element(option('feature')).toHaveAttribute('aria-selected', 'true');
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.tab();
    await expectFocus(button('Apply'));
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([labels(['bug', 'feature'])]);
    await expect.element(chip('Labels is any of bug, feature')).toBeVisible();
    await expectFocus(picker());
  });

  it('commits with Enter when no option is highlighted', async () => {
    const { onChange } = await renderBar({ defaultValue: [labels(['bug'])] });
    await userEvent.click(button('Labels is any of bug'));
    await userEvent.keyboard('doc{ArrowDown}{Enter}{Backspace}{Backspace}{Backspace}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([labels(['bug', 'docs'])]);
    await expectFocus(button('Labels is any of bug, docs'));
  });

  it('cancels on Escape', async () => {
    const { onChange } = await renderBar({ defaultValue: [labels(['bug'])] });
    await userEvent.click(button('Labels is any of bug'));
    await userEvent.click(option('docs'));
    await userEvent.keyboard('{Escape}');
    expect(onChange).not.toHaveBeenCalled();
    await expect.element(chip('Labels is any of bug')).toBeVisible();
  });

  it('needs at least one option', async () => {
    const { onChange } = await renderBar({ defaultValue: [labels(['bug'])] });
    await userEvent.click(button('Labels is any of bug'));
    await userEvent.click(option('bug'));
    await userEvent.click(button('Apply'));
    await expect.element(page.getByText('Pick at least one value')).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('groups options by the field groupBy', async () => {
    await renderBar({ defaultValue: [labels(['bug'])] });
    await userEvent.click(button('Labels is any of bug'));
    await expect.element(dialog().getByRole('group', { name: 'Fixes' })).toBeInTheDocument();
    await expect.element(dialog().getByRole('group', { name: 'Work' })).toBeInTheDocument();
  });
});

describe('parts', () => {
  it('have data-dk-part names and state attributes', async () => {
    await renderBar({ defaultValue: [status('open')] });
    const root = toolbar().element();
    expect(root.getAttribute('data-dk-part')).toBe('filterbar');
    const chipElement = chip('Status is Open').element();
    expect(chipElement.getAttribute('data-dk-part')).toBe('filterbar-chip');
    expect(chipElement.getAttribute('data-field')).toBe('status');
    expect(chipElement.getAttribute('data-op')).toBe('is');
    expect(chipElement.getAttribute('data-type')).toBe('enum');
    expect(button('Status is').element().getAttribute('data-dk-part')).toBe('filterbar-operator');
    expect(button('Status is Open').element().getAttribute('data-dk-part')).toBe('filterbar-value');
    expect(button('Remove filter Status is Open').element().getAttribute('data-dk-part')).toBe('filterbar-remove');
    expect(button('Clear').element().getAttribute('data-dk-part')).toBe('filterbar-clear');
    expect(root.querySelector('[data-dk-part="filterbar-field"]')?.textContent).toBe('Status');
    expect(root.querySelector('[data-dk-part="filterbar-add"]')).not.toBeNull();

    await userEvent.click(button('Status is'));
    expect(menu().element().getAttribute('data-dk-part')).toBe('filterbar-operator-menu');
    expect(menuItem('is').element().getAttribute('data-checked')).toBe('');
    expect(chipElement.getAttribute('data-open')).toBe('operator');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(button('Status is Open'));
    expect(dialog().element().getAttribute('data-dk-part')).toBe('filterbar-editor');
    expect(dialog().element().getAttribute('data-type')).toBe('enum');
  });

  it('accept className functions, render props and refs', async () => {
    const chipRef = { current: null as HTMLDivElement | null };
    await render(
      <FilterBar fields={fields} defaultValue={[status('open')]} className={({ empty }) => (empty ? 'e' : 'full')}>
        <FilterBar.Chips>
          {() => (
            <FilterBar.Chip ref={chipRef} className={({ draft }) => (draft ? 'draft' : 'done')}>
              <FilterBar.Field />
              <FilterBar.Operator>{(operator) => `[${operator.label}]`}</FilterBar.Operator>
              <FilterBar.Value render={(props, { text }) => <button {...props}>{text.toUpperCase()}</button>} />
              <FilterBar.Remove />
            </FilterBar.Chip>
          )}
        </FilterBar.Chips>
        <FilterBar.OperatorMenu />
        <FilterBar.Editor />
        <FilterBar.Add />
      </FilterBar>,
    );
    expect(toolbar().element().getAttribute('class')).toBe('full');
    expect(chipRef.current?.className).toBe('done');
    await expect.element(button('Status [is]')).toBeVisible();
    await expect.element(button('Status [is] OPEN')).toBeVisible();
  });
});

describe('server rendering', () => {
  it('hydrates a value read from the URL without warnings', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { filters } = filtersFromSearchParams(
      'filter=status.is.open&filter=title.contains.bug&filter=created.between.2026-03-01..2026-03-14&filter=labels.isAnyOf.bug,docs',
      fields,
    );
    const tree = <FilterBar fields={fields} defaultValue={filters} />;
    const container = document.createElement('div');
    container.innerHTML = renderToString(tree);
    document.body.append(container);
    const root = hydrateRoot(container, tree, { onRecoverableError: (error) => console.error(error) });

    await expect.element(chip('Title contains bug')).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(hydrationErrors(errors)).toEqual([]);
    await userEvent.click(button('Status is Open'));
    await expect.element(dialog()).toBeVisible();

    root.unmount();
    container.remove();
    errors.mockRestore();
  });
});
