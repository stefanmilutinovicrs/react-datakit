import { useState } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import '../styles/theme.css';
import { expectNoA11yViolations } from '../test/axe';
import { expectNoOptionsOnDom } from '../test/options';
import { multiSelectOptionKeys } from './useMultiSelect';
import { MultiSelect, type MultiSelectChipProps, type MultiSelectProps, type UseMultiSelectReturn } from './index';

// https://www.w3.org/WAI/ARIA/apg/patterns/combobox/

interface User {
  id: number;
  name: string;
}

const ana: User = { id: 1, name: 'Ana' };
const bojan: User = { id: 2, name: 'Bojan' };
const cvijeta: User = { id: 3, name: 'Cvijeta' };
const dragan: User = { id: 4, name: 'Dragan' };
const users = [ana, bojan, cvijeta, dragan];

type TestProps = Omit<MultiSelectProps<User>, 'children' | 'itemToString' | 'itemToKey'> & {
  controlWidth?: number | undefined;
};

function UserMultiSelect({ controlWidth, ...props }: TestProps) {
  return (
    <MultiSelect itemToString={(u) => u?.name ?? ''} itemToKey={(u) => u.id} {...props}>
      <MultiSelect.Label>Reviewers</MultiSelect.Label>
      <MultiSelect.Control style={controlWidth ? { width: controlWidth } : undefined}>
        <MultiSelect.Chips>
          {(user: User) => (
            <MultiSelect.Chip>
              {user.name}
              <MultiSelect.ChipRemove />
            </MultiSelect.Chip>
          )}
        </MultiSelect.Chips>
        <MultiSelect.ChipsOverflow>{(count) => `+${count} more`}</MultiSelect.ChipsOverflow>
        <MultiSelect.Input />
      </MultiSelect.Control>
      <MultiSelect.Popup>
        <MultiSelect.List>
          {(user: User) => <MultiSelect.Option item={user}>{user.name}</MultiSelect.Option>}
        </MultiSelect.List>
        <MultiSelect.Empty>No users found</MultiSelect.Empty>
        <MultiSelect.Loading>Searching…</MultiSelect.Loading>
      </MultiSelect.Popup>
    </MultiSelect>
  );
}

const input = () => page.getByRole('combobox', { name: 'Reviewers' });
const listbox = () => page.getByRole('listbox');
const option = (name: string) => page.getByRole('option', { name, exact: true });
const chipList = () => page.getByRole('list', { name: 'Selected' });
const chip = (name: string) => chipList().getByRole('listitem').filter({ hasText: name });
const chipNames = () =>
  chipList()
    .getByRole('listitem')
    .elements()
    .map((el) => el.firstChild?.textContent ?? '');
const activeDescendant = () => input().element().getAttribute('aria-activedescendant');

async function expectHighlighted(name: string) {
  await expect.poll(() => activeDescendant()).toBe(option(name).element().id);
}

async function focusInput() {
  await userEvent.click(input());
}

describe('MultiSelect', () => {
  it('passes no hook option to the DOM', async () => {
    await expectNoOptionsOnDom(async () => {
      await render(
        <MultiSelect
          data-testid="root"
          id="reviewers"
          items={users}
          loadOptions={() => Promise.resolve(users)}
          filter={() => true}
          itemToString={(u) => u?.name ?? ''}
          itemToKey={(u) => u.id}
          defaultValue={[]}
          onChange={() => {}}
          debounceMs={0}
          formatResultCount={(count) => `${count}`}
          max={2}
          selectAll
          onCreate={(name) => ({ id: 99, name })}
        >
          <MultiSelect.Label>Reviewers</MultiSelect.Label>
          <MultiSelect.Input />
        </MultiSelect>,
      );
      return page.getByTestId('root').element();
    }, multiSelectOptionKeys);
  });

  describe('ARIA', () => {
    it('exposes a multi-selectable listbox connected to the input', async () => {
      await render(<UserMultiSelect items={users} defaultValue={[bojan]} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}');

      await expect.element(listbox()).toHaveAttribute('aria-multiselectable', 'true');
      await expect.element(input()).toHaveAttribute('aria-controls', listbox().element().id);
      await expect.element(input()).toHaveAttribute('aria-autocomplete', 'list');
      await expect.element(option('Bojan')).toHaveAttribute('aria-selected', 'true');
      await expect.element(option('Ana')).toHaveAttribute('aria-selected', 'false');
    });

    it('exposes parts as data attributes', async () => {
      await render(<UserMultiSelect items={users} defaultValue={[ana]} />);
      await expect.element(input()).toHaveAttribute('data-dk-part', 'multiselect-input');
      await expect.element(chip('Ana')).toHaveAttribute('data-dk-part', 'multiselect-chip');

      await focusInput();
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(listbox()).toHaveAttribute('data-dk-part', 'multiselect-list');
      await expect.element(option('Ana')).toHaveAttribute('data-dk-part', 'multiselect-option');
      await expect.element(option('Ana')).toHaveAttribute('data-selected');
    });

    it('labels the remove button of each chip', async () => {
      await render(<UserMultiSelect items={users} defaultValue={[ana]} />);
      await expect.element(page.getByRole('button', { name: 'Remove Ana' })).toBeInTheDocument();
    });

    it('has no axe violations when closed with chips or open', async () => {
      const screen = await render(<UserMultiSelect items={users} defaultValue={[ana, cvijeta]} />);
      await expectNoA11yViolations(screen.container);

      await focusInput();
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(listbox()).toBeVisible();
      await expectNoA11yViolations(screen.container);
    });
  });

  describe('selection', () => {
    it('Enter toggles the highlighted option and keeps the list open', async () => {
      const onChange = vi.fn();
      await render(<UserMultiSelect items={users} onChange={onChange} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

      expect(onChange).toHaveBeenLastCalledWith([bojan]);
      await expect.element(listbox()).toBeVisible();
      await expect.element(chip('Bojan')).toBeInTheDocument();
      await expectHighlighted('Bojan');

      await userEvent.keyboard('{Enter}');
      expect(onChange).toHaveBeenLastCalledWith([]);
      await expect.element(chip('Bojan')).not.toBeInTheDocument();
    });

    it('click toggles an option, keeps the list open and focus in the input', async () => {
      const onChange = vi.fn();
      await render(<UserMultiSelect items={users} onChange={onChange} />);
      await focusInput();
      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');

      await userEvent.click(option('Cvijeta'));
      await userEvent.click(option('Ana'));
      expect(onChange).toHaveBeenLastCalledWith([cvijeta, ana]);
      await expect.element(listbox()).toBeVisible();
      await expect.element(input()).toHaveFocus();
    });

    it('clears the typed query after a selection', async () => {
      await render(<UserMultiSelect items={users} />);
      await userEvent.type(input(), 'dr');
      await expect.poll(() => page.getByRole('option').elements().length).toBe(1);

      await userEvent.keyboard('{ArrowDown}{Enter}');
      await expect.element(input()).toHaveValue('');
      await expect.poll(() => page.getByRole('option').elements().length).toBe(4);
      await expect.element(chip('Dragan')).toBeInTheDocument();
    });

    it('works uncontrolled from defaultValue', async () => {
      await render(<UserMultiSelect items={users} defaultValue={[ana, dragan]} />);
      expect(chipNames()).toEqual(['Ana', 'Dragan']);
    });

    it('works controlled, and stays on the controlled value when the parent rejects a change', async () => {
      function Controlled() {
        const [value, setValue] = useState<readonly User[]>([ana]);
        return (
          <>
            <UserMultiSelect items={users} value={value} onChange={setValue} />
            <button type="button" onClick={() => setValue([])}>
              Reset
            </button>
          </>
        );
      }
      await render(<Controlled />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      expect(chipNames()).toEqual(['Ana', 'Bojan']);

      await userEvent.keyboard('{Escape}');
      await userEvent.click(page.getByRole('button', { name: 'Reset' }));
      await expect.poll(() => chipNames()).toEqual([]);
    });

    it('stays on the controlled value when the parent ignores onChange', async () => {
      await render(<UserMultiSelect items={users} value={[ana]} onChange={() => {}} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      expect(chipNames()).toEqual(['Ana']);
    });

    it('infers the item type for onChange', () => {
      expectTypeOf<NonNullable<MultiSelectProps<User>['onChange']>>().parameter(0).toEqualTypeOf<readonly User[]>();
    });
  });

  describe('chips and keyboard', () => {
    it('names the overflow indicator through a prop getter', () => {
      expectTypeOf<UseMultiSelectReturn<User>>().toHaveProperty('getChipsOverflowProps');
    });

    it('Chip reads its item from Chips, so it takes no item prop', () => {
      expectTypeOf<MultiSelectChipProps>().not.toHaveProperty('item');
    });

    it('Backspace in an empty input removes the last chip', async () => {
      const onChange = vi.fn();
      await render(<UserMultiSelect items={users} defaultValue={[ana, bojan]} onChange={onChange} />);
      await focusInput();
      await userEvent.keyboard('{Backspace}');

      expect(onChange).toHaveBeenLastCalledWith([ana]);
      expect(chipNames()).toEqual(['Ana']);
    });

    it('Backspace with text only edits the text', async () => {
      const onChange = vi.fn();
      await render(<UserMultiSelect items={users} defaultValue={[ana]} onChange={onChange} />);
      await userEvent.type(input(), 'bo');
      await userEvent.keyboard('{Backspace}');

      await expect.element(input()).toHaveValue('b');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('ArrowLeft and ArrowRight move focus through the chips and back to the input', async () => {
      await render(<UserMultiSelect items={users} defaultValue={[ana, bojan, cvijeta]} />);
      await focusInput();

      await userEvent.keyboard('{ArrowLeft}');
      await expect.element(chip('Cvijeta')).toHaveFocus();
      await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
      await expect.element(chip('Ana')).toHaveFocus();
      await userEvent.keyboard('{ArrowLeft}');
      await expect.element(chip('Ana')).toHaveFocus();

      await userEvent.keyboard('{ArrowRight}');
      await expect.element(chip('Bojan')).toHaveFocus();
      await userEvent.keyboard('{ArrowRight}{ArrowRight}');
      await expect.element(input()).toHaveFocus();
    });

    it('ArrowLeft moves the text cursor while there is text before it', async () => {
      await render(<UserMultiSelect items={users} defaultValue={[ana]} />);
      await userEvent.type(input(), 'bo');
      await userEvent.keyboard('{ArrowLeft}');

      await expect.element(input()).toHaveFocus();
      expect((input().element() as HTMLInputElement).selectionStart).toBe(1);
    });

    it('Backspace or Delete on a focused chip removes it and keeps focus on a neighbor', async () => {
      await render(<UserMultiSelect items={users} defaultValue={[ana, bojan, cvijeta]} />);
      await focusInput();
      await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
      await expect.element(chip('Bojan')).toHaveFocus();

      await userEvent.keyboard('{Delete}');
      expect(chipNames()).toEqual(['Ana', 'Cvijeta']);
      await expect.element(chip('Ana')).toHaveFocus();

      await userEvent.keyboard('{Backspace}');
      expect(chipNames()).toEqual(['Cvijeta']);
      await expect.element(chip('Cvijeta')).toHaveFocus();

      await userEvent.keyboard('{Backspace}');
      expect(chipNames()).toEqual([]);
      await expect.element(input()).toHaveFocus();
    });

    it('the remove button removes its chip and returns focus to the input', async () => {
      await render(<UserMultiSelect items={users} defaultValue={[ana, bojan]} />);
      await userEvent.click(page.getByRole('button', { name: 'Remove Ana' }));

      expect(chipNames()).toEqual(['Bojan']);
      await expect.element(input()).toHaveFocus();
    });

    it('chips are not tab stops; Tab goes from the input to the next control', async () => {
      await render(
        <>
          <button type="button">Before</button>
          <UserMultiSelect items={users} defaultValue={[ana, bojan]} />
          <button type="button">After</button>
        </>,
      );
      await userEvent.click(page.getByRole('button', { name: 'Before' }));
      await userEvent.tab();
      await expect.element(input()).toHaveFocus();
      await userEvent.tab();
      await expect.element(page.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('Escape closes the list, then clears the query but keeps the chips', async () => {
      await render(<UserMultiSelect items={users} defaultValue={[ana]} />);
      await userEvent.type(input(), 'bo');
      await expect.element(listbox()).toBeVisible();

      await userEvent.keyboard('{Escape}');
      await expect.element(listbox()).not.toBeInTheDocument();
      await expect.element(input()).toHaveValue('bo');

      await userEvent.keyboard('{Escape}');
      await expect.element(input()).toHaveValue('');
      expect(chipNames()).toEqual(['Ana']);
    });
  });

  describe('max', () => {
    it('disables unselected options once max is reached', async () => {
      const onChange = vi.fn();
      await render(<UserMultiSelect items={users} defaultValue={[ana, bojan]} max={2} onChange={onChange} />);
      await focusInput();
      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');

      await expect.element(option('Cvijeta')).toHaveAttribute('aria-disabled', 'true');
      await expect.element(option('Cvijeta')).toHaveAttribute('data-disabled');
      await expect.element(option('Ana')).not.toHaveAttribute('aria-disabled');

      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
      await expectHighlighted('Cvijeta');
      expect(onChange).not.toHaveBeenCalled();

      await userEvent.click(option('Ana'));
      expect(onChange).toHaveBeenLastCalledWith([bojan]);
      await expect.element(option('Cvijeta')).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('select all', () => {
    it('selects and deselects all filtered options', async () => {
      const onChange = vi.fn();
      await render(<UserMultiSelect items={users} selectAll onChange={onChange} />);
      await userEvent.type(input(), 'an');

      await expect.element(option('Select all')).toBeVisible();
      await expect.element(option('Select all')).toHaveAttribute('aria-selected', 'false');
      await userEvent.keyboard('{ArrowDown}');
      await expectHighlighted('Select all');
      await userEvent.keyboard('{Enter}');

      expect(onChange).toHaveBeenLastCalledWith([ana, bojan, dragan]);
      expect(chipNames()).toEqual(['Ana', 'Bojan', 'Dragan']);

      await userEvent.type(input(), 'an');
      await expect.element(option('Select all')).toHaveAttribute('aria-selected', 'true');
      await userEvent.keyboard('{ArrowDown}{Enter}');
      expect(onChange).toHaveBeenLastCalledWith([]);
    });

    it('keeps other selections and respects max', async () => {
      const onChange = vi.fn();
      await render(<UserMultiSelect items={users} defaultValue={[cvijeta]} selectAll max={3} onChange={onChange} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}{Enter}');

      expect(onChange).toHaveBeenLastCalledWith([cvijeta, ana, bojan]);
    });

    it('counts the select-all row in aria-setsize', async () => {
      await render(<UserMultiSelect items={users} selectAll />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(option('Ana')).toHaveAttribute('aria-setsize', '5');
      await expect.element(option('Ana')).toHaveAttribute('aria-posinset', '2');
    });
  });

  describe('creatable', () => {
    it('offers to create the typed value and adds the created item', async () => {
      const onCreate = vi.fn((name: string): User => ({ id: 99, name }));
      const onChange = vi.fn();
      await render(<UserMultiSelect items={users} onCreate={onCreate} onChange={onChange} />);
      await userEvent.type(input(), 'Zoran');

      await expect.element(option('Create “Zoran”')).toBeVisible();
      await userEvent.keyboard('{ArrowDown}{Enter}');

      expect(onCreate).toHaveBeenCalledExactlyOnceWith('Zoran');
      expect(onChange).toHaveBeenLastCalledWith([{ id: 99, name: 'Zoran' }]);
      expect(chipNames()).toEqual(['Zoran']);
      await expect.element(input()).toHaveValue('');
    });

    it('supports an async onCreate', async () => {
      const onCreate = vi.fn((name: string) => Promise.resolve<User>({ id: 100, name }));
      await render(<UserMultiSelect items={users} onCreate={onCreate} />);
      await userEvent.type(input(), 'Mila');
      await userEvent.keyboard('{ArrowDown}{Enter}');

      await expect.poll(() => chipNames()).toEqual(['Mila']);
    });

    it('does not offer to create a value that already exists', async () => {
      await render(<UserMultiSelect items={users} onCreate={(name) => ({ id: 0, name })} />);
      await userEvent.type(input(), 'ana');

      await expect.element(option('Ana')).toBeVisible();
      await expect.element(page.getByRole('option', { name: /Create/ })).not.toBeInTheDocument();
    });
  });

  describe('overflow', () => {
    it('shows "+N more" instead of wrapping chips to a new line', async () => {
      const many = Array.from({ length: 8 }, (_, i): User => ({ id: i, name: `Person ${i}` }));
      await render(<UserMultiSelect items={many} defaultValue={many} controlWidth={320} />);

      const more = page.getByText(/^\+\d+ more$/);
      await expect.element(more).toBeVisible();

      const hidden = Number(/\d+/.exec(more.element().textContent)?.[0]);
      // Hidden chips are visibility: hidden, so they are out of the accessibility tree; query the DOM.
      const chips = [...document.querySelectorAll('[data-dk-part="multiselect-chip"]')];
      const overflowing = chips.filter((el) => el.hasAttribute('data-overflow'));
      expect(hidden).toBeGreaterThan(0);
      expect(overflowing).toHaveLength(hidden);

      const control = document.querySelector('[data-dk-part="multiselect-control"]');
      const chipsTop = chips[0]?.getBoundingClientRect().top;
      for (const el of chips) expect(el.getBoundingClientRect().top).toBe(chipsTop);
      expect(control?.getBoundingClientRect().height).toBeLessThan(60);
    });

    // "+N more" sits in Control next to Chips and takes width from it, so showing the indicator
    // can hide more chips; the measurement must settle instead of flipping between counts.
    it('settles on one overflow count at every width, with "+N more" next to the chips', async () => {
      const many = Array.from({ length: 8 }, (_, i): User => ({ id: i, name: `Person ${i}` }));
      const screen = await render(<UserMultiSelect items={many} defaultValue={many} controlWidth={180} />);
      const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

      for (let width = 180; width <= 700; width += 26) {
        await screen.rerender(<UserMultiSelect items={many} defaultValue={many} controlWidth={width} />);
        for (let i = 0; i < 4; i++) await frame();

        const control = document.querySelector('[data-dk-part="multiselect-control"]');
        if (!control) throw new Error('No control');
        const changes: MutationRecord[] = [];
        const observer = new MutationObserver((records) => changes.push(...records));
        observer.observe(control, {
          subtree: true,
          childList: true,
          characterData: true,
          attributeFilter: ['data-overflow'],
        });
        await new Promise((resolve) => setTimeout(resolve, 120));
        observer.disconnect();
        expect(changes, `width ${width}`).toEqual([]);

        const container = document.querySelector('[data-dk-part="multiselect-chips"]');
        const chips = [...document.querySelectorAll('[data-dk-part="multiselect-chip"]')];
        const hidden = chips.filter((el) => el.hasAttribute('data-overflow'));
        const indicator = document.querySelector('[data-dk-part="multiselect-chips-overflow"]');
        const right = container?.getBoundingClientRect().right ?? 0;
        for (const el of chips) {
          if (!el.hasAttribute('data-overflow'))
            expect(el.getBoundingClientRect().right).toBeLessThanOrEqual(right + 0.5);
        }
        expect(indicator?.textContent ?? '', `width ${width}`).toBe(hidden.length > 0 ? `+${hidden.length} more` : '');
      }
    });

    it('shows no overflow indicator when every chip fits', async () => {
      await render(<UserMultiSelect items={users} defaultValue={[ana]} controlWidth={400} />);
      await expect.element(chip('Ana')).toBeVisible();
      await expect.element(page.getByText(/more$/)).not.toBeInTheDocument();
    });
  });

  describe('async', () => {
    it('loads options and keeps the list open while selecting', async () => {
      const loadOptions = vi.fn((query: string) =>
        Promise.resolve(users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))),
      );
      await render(<UserMultiSelect loadOptions={loadOptions} debounceMs={0} />);
      await userEvent.type(input(), 'dr');
      await expect.element(option('Dragan')).toBeVisible();

      await userEvent.keyboard('{ArrowDown}{Enter}');
      expect(chipNames()).toEqual(['Dragan']);
      await expect.element(listbox()).toBeVisible();
    });
  });

  describe('SSR', () => {
    it('hydrates server-rendered markup without warnings', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const tree = <UserMultiSelect items={users} defaultValue={[ana, bojan]} />;

      const container = document.createElement('div');
      container.innerHTML = renderToString(tree);
      document.body.append(container);
      const root = hydrateRoot(container, tree, { onRecoverableError: (error) => console.error(error) });

      await expect.element(page.getByRole('button', { name: 'Remove Bojan' })).toBeInTheDocument();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(errors).not.toHaveBeenCalled();

      root.unmount();
      container.remove();
      errors.mockRestore();
    });
  });
});
