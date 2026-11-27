import { createRef, useState, type CSSProperties, type ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { expectNoA11yViolations } from '../test/axe';
import { axOption, hasNativeAxTree } from '../test/axTree';
import { hydrationErrors } from '../test/hydration';
import { deferred, type Deferred } from '../test/deferred';
import { expectNoOptionsOnDom } from '../test/options';
import { comboboxOptionKeys } from './useCombobox';
import { Combobox, type ComboboxCore, type ComboboxGroup, type ComboboxLabels, type ComboboxProps } from './index';

// https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ (listbox popup, aria-autocomplete="list")

interface User {
  id: number;
  name: string;
}

const ana: User = { id: 1, name: 'Ana' };
const bojan: User = { id: 2, name: 'Bojan' };
const cvijeta: User = { id: 3, name: 'Cvijeta' };
const dragan: User = { id: 4, name: 'Dragan' };
const users = [ana, bojan, cvijeta, dragan];

type TestProps = Omit<ComboboxProps<User>, 'children' | 'itemToString' | 'itemToKey'> & {
  listStyle?: CSSProperties | undefined;
};

function UserCombobox({ listStyle, ...props }: TestProps) {
  return (
    <Combobox itemToString={(u) => u?.name ?? ''} itemToKey={(u) => u.id} {...props}>
      <Combobox.Label>Assignee</Combobox.Label>
      <Combobox.Input />
      <Combobox.Popup>
        <Combobox.List style={listStyle}>
          {(user: User) => <Combobox.Option item={user}>{user.name}</Combobox.Option>}
        </Combobox.List>
        <Combobox.Empty>No users found</Combobox.Empty>
        <Combobox.Loading>Searching…</Combobox.Loading>
        <Combobox.Error>
          {({ retry }) => (
            <button type="button" onClick={retry}>
              Try again
            </button>
          )}
        </Combobox.Error>
      </Combobox.Popup>
    </Combobox>
  );
}

const input = () => page.getByRole('combobox', { name: 'Assignee' });
const listbox = () => page.getByRole('listbox');
const option = (name: string) => page.getByRole('option', { name, exact: true });
const status = () => page.getByRole('status');

const activeDescendant = () => input().element().getAttribute('aria-activedescendant');

async function expectHighlighted(name: string) {
  await expect.poll(() => activeDescendant()).toBe(option(name).element().id);
  await expect.element(option(name)).toHaveAttribute('data-highlighted');
}

async function focusInput() {
  await userEvent.click(input());
}

describe('Combobox', () => {
  it('passes no hook option to the DOM', async () => {
    await expectNoOptionsOnDom(async () => {
      await render(
        <Combobox
          data-testid="root"
          id="assignee"
          items={users}
          loadOptions={() => Promise.resolve(users)}
          filter={() => true}
          groupBy={() => null}
          itemToString={(u) => u?.name ?? ''}
          itemToKey={(u) => u.id}
          defaultValue={null}
          onChange={() => {}}
          debounceMs={0}
          selectOnTab
          labels={{ resultCount: (count) => `${count}` }}
        >
          <Combobox.Label>Assignee</Combobox.Label>
          <Combobox.Input />
        </Combobox>,
      );
      return page.getByTestId('root').element();
    }, comboboxOptionKeys);
  });

  describe('ARIA', () => {
    it('labels the input and exposes the combobox role and attributes', async () => {
      await render(<UserCombobox items={users} />);

      await expect.element(input()).toBeInTheDocument();
      await expect.element(input()).toHaveAttribute('aria-expanded', 'false');
      await expect.element(input()).toHaveAttribute('aria-autocomplete', 'list');
      await expect.element(input()).not.toHaveAttribute('aria-activedescendant');
      await expect.element(listbox()).not.toBeInTheDocument();
    });

    it('connects the open listbox to the input', async () => {
      await render(<UserCombobox items={users} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}');

      await expect.element(input()).toHaveAttribute('aria-expanded', 'true');
      await expect.element(listbox()).toBeVisible();
      await expect.element(input()).toHaveAttribute('aria-controls', listbox().element().id);
      await expect.element(listbox()).toHaveAccessibleName('Assignee');
      await expect.poll(() => page.getByRole('option').elements().length).toBe(4);
    });

    it('marks the selected option with aria-selected', async () => {
      await render(<UserCombobox items={users} defaultValue={bojan} />);
      await focusInput();
      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');

      await expect.element(option('Bojan')).toHaveAttribute('aria-selected', 'true');
      await expect.element(option('Ana')).toHaveAttribute('aria-selected', 'false');
    });

    it('keeps DOM focus in the input while moving through options', async () => {
      await render(<UserCombobox items={users} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');

      await expect.element(input()).toHaveFocus();
      await expectHighlighted('Cvijeta');
    });

    it('exposes parts and state as data attributes', async () => {
      await render(<UserCombobox items={users} defaultValue={ana} />);
      await expect.element(input()).toHaveAttribute('data-dk-part', 'combobox-input');
      await expect.element(input()).toHaveAttribute('data-state', 'closed');

      await focusInput();
      await userEvent.keyboard('{ArrowDown}');

      await expect.element(input()).toHaveAttribute('data-state', 'open');
      await expect.element(listbox()).toHaveAttribute('data-dk-part', 'combobox-list');
      await expect.element(option('Ana')).toHaveAttribute('data-dk-part', 'combobox-option');
      await expect.element(option('Ana')).toHaveAttribute('data-selected');
      await expect.element(option('Bojan')).not.toHaveAttribute('data-selected');
    });

    it('has no axe violations when closed or open', async () => {
      const screen = await render(<UserCombobox items={users} defaultValue={bojan} />);
      await expectNoA11yViolations(screen.container);

      await focusInput();
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(listbox()).toBeVisible();
      await expectNoA11yViolations(screen.container);
    });
  });

  describe('parts', () => {
    it('accepts className as a function of state, forwards refs and unknown props', async () => {
      const inputRef = createRef<HTMLInputElement>();
      await render(
        <Combobox items={users} itemToString={(u) => u?.name ?? ''} itemToKey={(u) => u.id}>
          <Combobox.Label>Assignee</Combobox.Label>
          <Combobox.Input
            ref={inputRef}
            placeholder="Pick someone"
            className={(state) => (state.open ? 'is-open' : 'is-closed')}
          />
          <Combobox.Popup>
            <Combobox.List>
              {(user: User) => (
                <Combobox.Option item={user} className={(state) => (state.highlighted ? 'hl' : undefined)}>
                  {user.name}
                </Combobox.Option>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox>,
      );

      expect(inputRef.current).toBe(input().element());
      await expect.element(input()).toHaveAttribute('placeholder', 'Pick someone');
      await expect.element(input()).toHaveClass('is-closed');

      await focusInput();
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(input()).toHaveClass('is-open');
      await expect.element(option('Ana')).toHaveClass('hl');
    });

    it('renders a custom element through the render prop', async () => {
      await render(
        <Combobox items={users} itemToString={(u) => u?.name ?? ''} itemToKey={(u) => u.id}>
          <Combobox.Label render={(props) => <label {...props} data-custom="" />}>Assignee</Combobox.Label>
          <Combobox.Input />
        </Combobox>,
      );
      await expect.element(page.getByText('Assignee')).toHaveAttribute('data-custom');
      await expect.element(page.getByText('Assignee')).toHaveAttribute('data-dk-part', 'combobox-label');
    });

    it('lets a user handler opt out of built-in behavior with preventDefault', async () => {
      const onChange = vi.fn();
      await render(
        <Combobox items={users} itemToString={(u) => u?.name ?? ''} itemToKey={(u) => u.id} onChange={onChange}>
          <Combobox.Label>Assignee</Combobox.Label>
          <Combobox.Input
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
          />
          <Combobox.Popup>
            <Combobox.List>{(user: User) => <Combobox.Option item={user}>{user.name}</Combobox.Option>}</Combobox.List>
          </Combobox.Popup>
        </Combobox>,
      );
      await focusInput();
      await userEvent.keyboard('{ArrowDown}{Enter}');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('Control wraps the input: state, ref and focus on a click next to the input', async () => {
      const ref = createRef<HTMLDivElement>();
      await render(
        <Combobox items={users} itemToString={(u) => u?.name ?? ''} itemToKey={(u) => u.id}>
          <Combobox.Label>Assignee</Combobox.Label>
          <Combobox.Control
            ref={ref}
            style={{ padding: 20 }}
            className={(state) => (state.open ? 'is-open' : 'is-closed')}
            data-testid="control"
          >
            <Combobox.Input />
          </Combobox.Control>
          <Combobox.Popup>
            <Combobox.List>{(user: User) => <Combobox.Option item={user}>{user.name}</Combobox.Option>}</Combobox.List>
          </Combobox.Popup>
        </Combobox>,
      );
      const control = page.getByTestId('control');
      expect(ref.current).toBe(control.element());
      await expect.element(control).toHaveAttribute('data-dk-part', 'combobox-control');
      await expect.element(control).toHaveAttribute('data-state', 'closed');
      await expect.element(control).toHaveClass('is-closed');

      await userEvent.click(control, { position: { x: 5, y: 5 } });
      await expect.element(input()).toHaveFocus();

      await userEvent.keyboard('{ArrowDown}');
      await expect.element(control).toHaveAttribute('data-state', 'open');
      await expect.element(control).toHaveClass('is-open');
    });

    it('Count shows the number of results, hidden from screen readers that already heard it', async () => {
      const ref = createRef<HTMLDivElement>();
      const screen = await render(
        <Combobox items={users} itemToString={(u) => u?.name ?? ''} itemToKey={(u) => u.id}>
          <Combobox.Label>Assignee</Combobox.Label>
          <Combobox.Input />
          <Combobox.Popup>
            <Combobox.List>{(user: User) => <Combobox.Option item={user}>{user.name}</Combobox.Option>}</Combobox.List>
            <Combobox.Count ref={ref} data-testid="count" className={(state) => `count-${state.count}`}>
              {(count) => `${count} people`}
            </Combobox.Count>
          </Combobox.Popup>
        </Combobox>,
      );
      const count = page.getByTestId('count');
      await focusInput();
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(count).toHaveTextContent('4 people');
      await expect.element(count).toHaveAttribute('data-dk-part', 'combobox-count');
      await expect.element(count).toHaveAttribute('aria-hidden', 'true');
      await expect.element(count).toHaveClass('count-4');
      expect(ref.current).toBe(count.element());
      await expectNoA11yViolations(screen.container);

      await userEvent.type(input(), 'an');
      await expect.element(count).toHaveTextContent('3 people');
      await userEvent.type(input(), 'zzz');
      await expect.element(count).not.toBeInTheDocument();
    });

    it('Count is hidden while options load', async () => {
      const request = deferred<User[]>();
      await render(
        <Combobox
          loadOptions={() => request.promise}
          debounceMs={0}
          itemToString={(u) => u?.name ?? ''}
          itemToKey={(u) => u.id}
        >
          <Combobox.Label>Assignee</Combobox.Label>
          <Combobox.Input />
          <Combobox.Popup>
            <Combobox.Count data-testid="count">{(count) => `${count} people`}</Combobox.Count>
            <Combobox.Loading>Searching…</Combobox.Loading>
          </Combobox.Popup>
        </Combobox>,
      );
      await userEvent.type(input(), 'a');
      await expect.element(page.getByText('Searching…')).toBeVisible();
      expect(page.getByTestId('count').query()).toBeNull();
      request.resolve([ana]);
      await expect.element(page.getByTestId('count')).toHaveTextContent('1 people');
    });

    it('has no axe violations in the empty state', async () => {
      const screen = await render(<UserCombobox items={users} />);
      await userEvent.type(input(), 'zzz');
      await expect.element(page.getByText('No users found')).toBeVisible();
      await expectNoA11yViolations(screen.container);
    });
  });

  describe('keyboard', () => {
    it('ArrowDown opens the list and highlights the first option', async () => {
      await render(<UserCombobox items={users} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}');

      await expect.element(listbox()).toBeVisible();
      await expectHighlighted('Ana');
    });

    it('ArrowDown on an open list highlights the next option', async () => {
      await render(<UserCombobox items={users} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');

      await expectHighlighted('Bojan');
    });

    it('ArrowUp highlights the previous option', async () => {
      await render(<UserCombobox items={users} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowUp}');

      await expectHighlighted('Bojan');
    });

    it('Alt+ArrowDown opens the list without highlighting an option', async () => {
      await render(<UserCombobox items={users} />);
      await focusInput();
      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');

      await expect.element(listbox()).toBeVisible();
      expect(activeDescendant()).toBeNull();
    });

    it('Alt+ArrowUp closes the list', async () => {
      await render(<UserCombobox items={users} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(listbox()).toBeVisible();

      await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
      await expect.element(listbox()).not.toBeInTheDocument();
      await expect.element(input()).toHaveAttribute('aria-expanded', 'false');
    });

    it('Enter selects the highlighted option and closes the list', async () => {
      const onChange = vi.fn();
      await render(<UserCombobox items={users} onChange={onChange} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

      expect(onChange).toHaveBeenCalledExactlyOnceWith(bojan);
      await expect.element(input()).toHaveValue('Bojan');
      await expect.element(listbox()).not.toBeInTheDocument();
    });

    it('Enter without a highlighted option does not select anything', async () => {
      const onChange = vi.fn();
      await render(<UserCombobox items={users} onChange={onChange} />);
      await focusInput();
      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}{Enter}');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('Escape closes the list; a second Escape clears the input', async () => {
      const onChange = vi.fn();
      await render(<UserCombobox items={users} defaultValue={ana} onChange={onChange} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(listbox()).toBeVisible();

      await userEvent.keyboard('{Escape}');
      await expect.element(listbox()).not.toBeInTheDocument();
      await expect.element(input()).toHaveValue('Ana');

      await userEvent.keyboard('{Escape}');
      await expect.element(input()).toHaveValue('');
      expect(onChange).toHaveBeenCalledExactlyOnceWith(null);
    });

    it('Home and End move the text cursor, not the highlight', async () => {
      await render(<UserCombobox items={users} />);
      await userEvent.type(input(), 'an');
      await userEvent.keyboard('{ArrowDown}');
      const highlighted = activeDescendant();

      await userEvent.keyboard('{Home}');
      expect((input().element() as HTMLInputElement).selectionStart).toBe(0);
      expect(activeDescendant()).toBe(highlighted);

      await userEvent.keyboard('{End}');
      expect((input().element() as HTMLInputElement).selectionStart).toBe(2);
      expect(activeDescendant()).toBe(highlighted);
    });

    it('Tab closes the list and moves focus on without selecting by default', async () => {
      const onChange = vi.fn();
      await render(
        <>
          <UserCombobox items={users} onChange={onChange} />
          <button type="button">Next</button>
        </>,
      );
      await focusInput();
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.tab();

      expect(onChange).not.toHaveBeenCalled();
      await expect.element(listbox()).not.toBeInTheDocument();
      await expect.element(page.getByRole('button', { name: 'Next' })).toHaveFocus();
    });

    it('Tab selects the highlighted option when selectOnTab is set', async () => {
      const onChange = vi.fn();
      await render(<UserCombobox items={users} onChange={onChange} selectOnTab />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.tab();

      expect(onChange).toHaveBeenCalledExactlyOnceWith(ana);
    });

    it('typing opens the list and filters options, without highlighting one', async () => {
      await render(<UserCombobox items={users} />);
      await userEvent.type(input(), 'dr');

      await expect.element(listbox()).toBeVisible();
      await expect.poll(() => page.getByRole('option').elements().length).toBe(1);
      await expect.element(option('Dragan')).toBeVisible();
      expect(activeDescendant()).toBeNull();
    });
  });

  describe('pointer', () => {
    it('hover highlights and click selects an option', async () => {
      const onChange = vi.fn();
      await render(<UserCombobox items={users} onChange={onChange} />);
      await focusInput();
      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');

      await userEvent.hover(option('Cvijeta'));
      await expectHighlighted('Cvijeta');

      await userEvent.click(option('Cvijeta'));
      expect(onChange).toHaveBeenCalledExactlyOnceWith(cvijeta);
      await expect.element(input()).toHaveValue('Cvijeta');
      await expect.element(input()).toHaveFocus();
    });
  });

  describe('async search', () => {
    function controlledLoader() {
      const calls: { query: string; signal: AbortSignal; response: Deferred<readonly User[]> }[] = [];
      const loadOptions = vi.fn((query: string, { signal }: { signal: AbortSignal }) => {
        const response = deferred<readonly User[]>();
        calls.push({ query, signal, response });
        return response.promise;
      });
      return { calls, loadOptions };
    }

    const instantLoader = () =>
      vi.fn((query: string) =>
        Promise.resolve(users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))),
      );

    it('names the popup and status parts through prop getters', async () => {
      expectTypeOf<ComboboxCore<User>>().toHaveProperty('getPopupProps');
      expectTypeOf<ComboboxCore<User>>().toHaveProperty('getEmptyProps');
      expectTypeOf<ComboboxCore<User>>().toHaveProperty('getLoadingProps');
      expectTypeOf<ComboboxCore<User>>().toHaveProperty('getErrorProps');

      const { calls, loadOptions } = controlledLoader();
      await render(<UserCombobox loadOptions={loadOptions} debounceMs={0} />);
      await userEvent.type(input(), 'zz');
      await expect.poll(() => calls.length).toBeGreaterThan(0);
      const part = (text: string) => page.getByText(text).element().getAttribute('data-dk-part');
      await expect.element(page.getByText('Searching…')).toBeVisible();
      expect(part('Searching…')).toBe('combobox-loading');
      expect(page.getByText('Searching…').element().parentElement?.getAttribute('data-dk-part')).toBe('combobox-popup');

      calls.at(-1)?.response.resolve([]);
      await expect.element(page.getByText('No users found')).toBeVisible();
      expect(part('No users found')).toBe('combobox-empty');

      await userEvent.type(input(), 'z');
      await expect.poll(() => calls.length).toBeGreaterThan(1);
      calls.at(-1)?.response.reject(new Error('Network'));
      await expect.element(page.getByRole('alert')).toHaveAttribute('data-dk-part', 'combobox-error');
    });

    // The keys go in within one task, so the typing is fast however busy the browser is;
    // userEvent.type sends one key per round trip, which can take longer than the debounce.
    it('debounces fast typing into a single request', async () => {
      const loadOptions = instantLoader();
      await render(<UserCombobox loadOptions={loadOptions} debounceMs={100} />);
      const field = input().element() as HTMLInputElement;
      field.focus();
      for (const text of ['d', 'dr', 'dra']) {
        // The prototype's setter, so React sees the change as typing.
        Reflect.set(HTMLInputElement.prototype, 'value', text, field);
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }

      await expect.poll(() => loadOptions.mock.calls.length).toBe(1);
      expect(loadOptions.mock.calls[0]?.[0]).toBe('dra');

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(loadOptions).toHaveBeenCalledTimes(1);
    });

    it('aborts the previous request when the query changes', async () => {
      const { calls, loadOptions } = controlledLoader();
      await render(<UserCombobox loadOptions={loadOptions} debounceMs={0} />);

      await userEvent.type(input(), 'a');
      await expect.poll(() => calls.length).toBe(1);
      await userEvent.type(input(), 'n');
      await expect.poll(() => calls.length).toBe(2);

      expect(calls[0]?.signal.aborted).toBe(true);
      expect(calls[1]?.signal.aborted).toBe(false);
    });

    it('never lets a stale response overwrite newer results', async () => {
      const { calls, loadOptions } = controlledLoader();
      await render(<UserCombobox loadOptions={loadOptions} debounceMs={0} />);

      await userEvent.type(input(), 'a');
      await expect.poll(() => calls.length).toBe(1);
      await userEvent.type(input(), 'n');
      await expect.poll(() => calls.length).toBe(2);

      calls[1]?.response.resolve([ana]);
      await expect.element(option('Ana')).toBeVisible();

      calls[0]?.response.resolve([ana, bojan, dragan]);
      await new Promise((resolve) => setTimeout(resolve, 50));
      await expect.poll(() => page.getByRole('option').elements().length).toBe(1);
    });

    it('caches results per query', async () => {
      const loadOptions = instantLoader();
      await render(<UserCombobox loadOptions={loadOptions} debounceMs={0} />);

      await userEvent.type(input(), 'a');
      await expect.poll(() => loadOptions.mock.calls.length).toBe(1);
      await userEvent.type(input(), 'n');
      await expect.poll(() => loadOptions.mock.calls.length).toBe(2);

      await userEvent.keyboard('{Backspace}');
      await expect.element(option('Bojan')).toBeVisible();
      expect(loadOptions).toHaveBeenCalledTimes(2);
    });

    it('shows and announces the loading, result and empty states', async () => {
      const { calls, loadOptions } = controlledLoader();
      await render(<UserCombobox loadOptions={loadOptions} debounceMs={0} />);

      await userEvent.type(input(), 'a');
      await expect.element(page.getByText('Searching…')).toBeVisible();
      await expect.element(listbox()).toHaveAttribute('aria-busy', 'true');

      calls[0]?.response.resolve([ana, bojan]);
      await expect.element(page.getByText('Searching…')).not.toBeInTheDocument();
      await expect.element(status()).toHaveTextContent('2 results');

      // debounceMs is 0, so every keystroke is a request; answer the latest one.
      await userEvent.type(input(), 'zz');
      await expect.poll(() => calls.at(-1)?.query).toBe('azz');
      calls.at(-1)?.response.resolve([]);
      await expect.element(page.getByText('No users found')).toBeVisible();
      await expect.element(status()).toHaveTextContent('No results');
    });

    it('announces the result count from labels', async () => {
      expectTypeOf<keyof ComboboxLabels>().toEqualTypeOf<'resultCount'>();
      expectTypeOf<ComboboxProps<User>>().not.toHaveProperty('formatResultCount');
      await render(
        <UserCombobox items={users} labels={{ resultCount: (count) => `${count} rezultata` }} debounceMs={0} />,
      );
      await userEvent.type(input(), 'a');
      await expect.poll(() => status().element().textContent).toMatch(/^\d+ rezultata$/);
    });

    it('shows an error with a retry that loads the same query again', async () => {
      const { calls, loadOptions } = controlledLoader();
      await render(<UserCombobox loadOptions={loadOptions} debounceMs={0} />);

      await userEvent.type(input(), 'bo');
      await expect.poll(() => calls.at(-1)?.query).toBe('bo');
      const before = calls.length;
      calls.at(-1)?.response.reject(new Error('Network down'));

      const retry = page.getByRole('button', { name: 'Try again' });
      await expect.element(retry).toBeVisible();
      await userEvent.click(retry);

      await expect.poll(() => calls.length).toBe(before + 1);
      expect(calls.at(-1)?.query).toBe('bo');
      calls.at(-1)?.response.resolve([bojan]);
      await expect.element(option('Bojan')).toBeVisible();
    });
  });

  describe('state', () => {
    it('works uncontrolled from defaultValue', async () => {
      await render(<UserCombobox items={users} defaultValue={cvijeta} />);
      await expect.element(input()).toHaveValue('Cvijeta');

      await focusInput();
      await userEvent.keyboard('{ArrowDown}{Enter}');
      await expect.element(input()).toHaveValue('Ana');
    });

    it('works controlled: the value prop is the source of truth', async () => {
      const onChange = vi.fn();

      function Controlled() {
        const [value, setValue] = useState<User | null>(ana);
        return (
          <>
            <UserCombobox
              items={users}
              value={value}
              onChange={(next) => {
                onChange(next);
                setValue(next);
              }}
            />
            <button type="button" onClick={() => setValue(dragan)}>
              Pick Dragan
            </button>
          </>
        );
      }

      await render(<Controlled />);
      await expect.element(input()).toHaveValue('Ana');

      await focusInput();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      expect(onChange).toHaveBeenCalledExactlyOnceWith(bojan);
      await expect.element(input()).toHaveValue('Bojan');

      await userEvent.click(page.getByRole('button', { name: 'Pick Dragan' }));
      await expect.element(input()).toHaveValue('Dragan');
    });

    it('stays on the controlled value when the parent rejects a change', async () => {
      await render(<UserCombobox items={users} value={ana} onChange={() => {}} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

      await expect.element(input()).toHaveValue('Ana');
    });

    it('infers the item type for onChange', () => {
      expectTypeOf<NonNullable<ComboboxProps<User>['onChange']>>().parameter(0).toEqualTypeOf<User | null>();
    });
  });

  describe('virtualization', () => {
    const many = Array.from({ length: 10_000 }, (_, i): User => ({ id: i, name: `User ${i}` }));

    it('renders only the visible part of 10,000 options', async () => {
      await render(<UserCombobox items={many} listStyle={{ maxHeight: 300 }} />);
      await focusInput();
      await userEvent.keyboard('{ArrowDown}');

      await expect.element(listbox()).toBeVisible();
      expect(page.getByRole('option').elements().length).toBeLessThan(50);
      await expect.element(option('User 0')).toHaveAttribute('aria-setsize', '10000');
      await expect.element(option('User 0')).toHaveAttribute('aria-posinset', '1');
    });

    it('keeps the highlighted option rendered and scrolled into view', async () => {
      await render(<UserCombobox items={many} listStyle={{ maxHeight: 300 }} />);
      await focusInput();
      for (let i = 0; i < 40; i++) await userEvent.keyboard('{ArrowDown}');

      await expectHighlighted('User 39');
      const list = listbox().element().getBoundingClientRect();
      const highlighted = option('User 39').element().getBoundingClientRect();
      expect(highlighted.top).toBeGreaterThanOrEqual(list.top);
      expect(highlighted.bottom).toBeLessThanOrEqual(list.bottom);
    });
  });

  interface Entry {
    id: number;
    name: string;
    kind: string | null;
  }

  const entries: Entry[] = [
    { id: 1, name: 'Ana', kind: 'People' },
    { id: 2, name: 'Design', kind: 'Teams' },
    { id: 3, name: 'Bojan', kind: 'People' },
    { id: 4, name: 'Platform', kind: 'Teams' },
  ];

  type GroupedProps = Omit<ComboboxProps<Entry>, 'children' | 'itemToString' | 'itemToKey' | 'groupBy'> & {
    groupLabel?: ((group: ComboboxGroup<Entry>) => ReactNode) | undefined;
    listStyle?: CSSProperties | undefined;
  };

  function GroupedCombobox({ groupLabel, listStyle, ...props }: GroupedProps) {
    return (
      <Combobox itemToString={(e) => e?.name ?? ''} itemToKey={(e) => e.id} groupBy={(e) => e.kind} {...props}>
        <Combobox.Label>Owner</Combobox.Label>
        <Combobox.Input />
        <Combobox.Popup>
          <Combobox.List groupLabel={groupLabel} style={listStyle}>
            {(entry: Entry) => <Combobox.Option item={entry}>{entry.name}</Combobox.Option>}
          </Combobox.List>
          <Combobox.Empty>Nothing found</Combobox.Empty>
          <Combobox.Loading>Searching…</Combobox.Loading>
        </Combobox.Popup>
      </Combobox>
    );
  }

  const ownerInput = () => page.getByRole('combobox', { name: 'Owner' });
  const groupLabels = () =>
    [...document.querySelectorAll('[data-dk-part="combobox-group-label"]')].map((el) => el.textContent);
  const optionNames = () =>
    page
      .getByRole('option')
      .elements()
      .map((el) => el.textContent);

  /** Name of the group an option is in, following aria-labelledby the way a browser does. */
  function groupOf(name: string): string | null {
    const group = option(name).element().closest('[role="group"]');
    if (!group) return null;
    const ids = group.getAttribute('aria-labelledby')?.split(' ') ?? [];
    return ids.map((id) => document.getElementById(id)?.textContent ?? '<missing>').join(' ');
  }

  async function expectOwnerHighlighted(name: string) {
    await expect
      .poll(() => ownerInput().element().getAttribute('aria-activedescendant'))
      .toBe(option(name).element().id);
  }

  describe('groups', () => {
    it('groups items under headings, in the order the groups first appear', async () => {
      await render(<GroupedCombobox items={entries} />);
      await userEvent.click(ownerInput());
      await userEvent.keyboard('{ArrowDown}');

      expect(groupLabels()).toEqual(['People', 'Teams']);
      expect(optionNames()).toEqual(['Ana', 'Bojan', 'Design', 'Platform']);
      expect(groupOf('Bojan')).toBe('People');
      expect(groupOf('Design')).toBe('Teams');
      await expect.element(option('Design')).toHaveAttribute('aria-setsize', '2');
      await expect.element(option('Design')).toHaveAttribute('aria-posinset', '1');
      await expect.element(option('Platform')).toHaveAttribute('aria-posinset', '2');
    });

    it('groups options from loadOptions', async () => {
      const response = deferred<Entry[]>();
      await render(<GroupedCombobox loadOptions={() => response.promise} debounceMs={0} />);
      await userEvent.click(ownerInput());
      await userEvent.keyboard('{ArrowDown}');
      response.resolve(entries);

      await expect.element(option('Platform')).toBeInTheDocument();
      expect(groupLabels()).toEqual(['People', 'Teams']);
      expect(groupOf('Platform')).toBe('Teams');
    });

    it('keeps ungrouped options outside any group, where they first appear', async () => {
      const loose: Entry = { id: 5, name: 'Anyone', kind: null };
      await render(<GroupedCombobox items={[loose, ...entries]} />);
      await userEvent.click(ownerInput());
      await userEvent.keyboard('{ArrowDown}');

      expect(optionNames()).toEqual(['Anyone', 'Ana', 'Bojan', 'Design', 'Platform']);
      expect(groupOf('Anyone')).toBeNull();
      await expectOwnerHighlighted('Anyone');
    });

    it('filtering removes empty groups and counts options only', async () => {
      await render(<GroupedCombobox items={entries} />);
      await userEvent.type(ownerInput(), 'des');

      await expect.poll(() => optionNames()).toEqual(['Design']);
      expect(groupLabels()).toEqual(['Teams']);
      await expect.element(page.getByRole('status')).toHaveTextContent('1 result');
    });

    it('renders custom heading content through groupLabel and the GroupLabel part', async () => {
      const ref = createRef<HTMLDivElement>();
      await render(
        <GroupedCombobox
          items={entries}
          groupLabel={(group) => (
            <Combobox.GroupLabel
              ref={group.key === 'People' ? ref : undefined}
              className={(state) => `count-${state.count}`}
              data-key={group.key}
            >
              {`${group.key.toUpperCase()} (${group.items.length})`}
            </Combobox.GroupLabel>
          )}
        />,
      );
      await userEvent.click(ownerInput());
      await userEvent.keyboard('{ArrowDown}');

      expect(groupLabels()).toEqual(['PEOPLE (2)', 'TEAMS (2)']);
      expect(groupOf('Ana')).toBe('PEOPLE (2)');
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current?.getAttribute('data-dk-part')).toBe('combobox-group-label');
      expect(ref.current?.getAttribute('data-key')).toBe('People');
      expect(ref.current?.className).toBe('count-2');
    });

    it('renders the heading through the render prop', async () => {
      await render(
        <GroupedCombobox
          items={entries}
          groupLabel={(group) => (
            <Combobox.GroupLabel render={(props) => <div {...props} data-custom="" />}>{group.key}</Combobox.GroupLabel>
          )}
        />,
      );
      await userEvent.click(ownerInput());
      await userEvent.keyboard('{ArrowDown}');

      expect(document.querySelectorAll('[data-dk-part="combobox-group-label"][data-custom]')).toHaveLength(2);
      expect(groupOf('Design')).toBe('Teams');
    });

    describe('keyboard', () => {
      it('ArrowDown opens on the first option and skips headings', async () => {
        await render(<GroupedCombobox items={entries} />);
        await userEvent.click(ownerInput());
        await userEvent.keyboard('{ArrowDown}');
        await expectOwnerHighlighted('Ana');

        await userEvent.keyboard('{ArrowDown}{ArrowDown}');
        await expectOwnerHighlighted('Design');
        await userEvent.keyboard('{ArrowDown}{ArrowDown}');
        await expectOwnerHighlighted('Ana');
      });

      it('ArrowUp opens on the last option and wraps past the first heading', async () => {
        await render(<GroupedCombobox items={entries} />);
        await userEvent.click(ownerInput());
        await userEvent.keyboard('{ArrowUp}');
        await expectOwnerHighlighted('Platform');

        await userEvent.keyboard('{ArrowUp}{ArrowUp}');
        await expectOwnerHighlighted('Bojan');
        await userEvent.keyboard('{ArrowUp}{ArrowUp}');
        await expectOwnerHighlighted('Platform');
      });

      it('PageDown and PageUp move 10 options, skip headings and stop at the ends', async () => {
        const many = Array.from({ length: 30 }, (_, i): Entry => ({
          id: i,
          name: `Item ${i}`,
          kind: `Group ${Math.floor(i / 6)}`,
        }));
        await render(<GroupedCombobox items={many} />);
        await userEvent.click(ownerInput());
        await userEvent.keyboard('{ArrowDown}');

        await userEvent.keyboard('{PageDown}');
        await expectOwnerHighlighted('Item 10');
        await userEvent.keyboard('{PageDown}{PageDown}');
        await expectOwnerHighlighted('Item 29');
        await userEvent.keyboard('{PageUp}');
        await expectOwnerHighlighted('Item 19');
        await userEvent.keyboard('{PageUp}{PageUp}');
        await expectOwnerHighlighted('Item 0');
      });

      it('Home and End still move the text cursor', async () => {
        await render(<GroupedCombobox items={entries} />);
        await userEvent.type(ownerInput(), 'a');
        await userEvent.keyboard('{ArrowDown}');
        const highlighted = ownerInput().element().getAttribute('aria-activedescendant');

        await userEvent.keyboard('{Home}');
        expect((ownerInput().element() as HTMLInputElement).selectionStart).toBe(0);
        await userEvent.keyboard('{End}');
        expect(ownerInput().element().getAttribute('aria-activedescendant')).toBe(highlighted);
      });
    });

    it('a heading takes no highlight and no click', async () => {
      const onChange = vi.fn();
      await render(<GroupedCombobox items={entries} onChange={onChange} />);
      await userEvent.click(ownerInput());
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      await expectOwnerHighlighted('Bojan');

      const teams = page.getByText('Teams', { exact: true });
      await userEvent.hover(teams);
      await userEvent.click(teams);

      await expectOwnerHighlighted('Bojan');
      expect(onChange).not.toHaveBeenCalled();
      await expect.element(listbox()).toBeVisible();
    });

    describe('accessibility', () => {
      it('puts the options in named groups in the accessibility tree', async () => {
        await render(<GroupedCombobox items={entries} />);
        await userEvent.click(ownerInput());
        await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
        await expectOwnerHighlighted('Design');

        await expect.element(listbox()).toMatchAriaInlineSnapshot(`
          - listbox "Owner":
            - group "People":
              - option "Ana"
              - option "Bojan"
            - group "Teams":
              - option "Design"
              - option "Platform"
        `);
      });

      it.runIf(hasNativeAxTree)("exposes the highlighted option's group in Chromium's computed tree", async () => {
        await render(<GroupedCombobox items={entries} />);
        await userEvent.click(ownerInput());
        await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
        await expectOwnerHighlighted('Design');

        expect(await axOption('Design')).toEqual({
          role: 'option',
          name: 'Design',
          container: { role: 'group', name: 'Teams' },
        });
      });

      it('has no axe violations while open and filtered', async () => {
        const screen = await render(<GroupedCombobox items={entries} />);
        await userEvent.click(ownerInput());
        await userEvent.keyboard('{ArrowDown}');
        await expect.element(listbox()).toBeVisible();
        await expectNoA11yViolations(screen.container);

        await userEvent.type(ownerInput(), 'o');
        await expect.poll(() => optionNames()).toEqual(['Bojan', 'Platform']);
        await expectNoA11yViolations(screen.container);
      });
    });

    describe('virtualization', () => {
      const many = Array.from({ length: 10_000 }, (_, i): Entry => ({
        id: i,
        name: `Item ${i}`,
        kind: `Group ${Math.floor(i / 1000)}`,
      }));
      const renderedRows = () =>
        listbox().element().querySelectorAll('[role="option"], [data-dk-part="combobox-group-label"]').length;

      it('renders a window of 10,000 grouped options with per-group positions', async () => {
        await render(<GroupedCombobox items={many} listStyle={{ maxHeight: 300 }} />);
        await userEvent.click(ownerInput());
        await userEvent.keyboard('{ArrowDown}');

        await expect.element(listbox()).toBeVisible();
        expect(renderedRows()).toBeLessThan(60);
        expect(groupOf('Item 0')).toBe('Group 0');
        await expect.element(option('Item 0')).toHaveAttribute('aria-setsize', '1000');
        await expect.element(option('Item 0')).toHaveAttribute('aria-posinset', '1');
      });

      it("keeps the highlighted option's heading rendered far from it, and the option in view", async () => {
        await render(<GroupedCombobox items={many} listStyle={{ maxHeight: 300 }} />);
        await userEvent.click(ownerInput());
        await userEvent.keyboard('{ArrowUp}');
        await expectOwnerHighlighted('Item 9999');
        for (let i = 0; i < 3; i++) await userEvent.keyboard('{PageUp}');

        await expectOwnerHighlighted('Item 9969');
        expect(renderedRows()).toBeLessThan(60);
        expect(groupOf('Item 9969')).toBe('Group 9');
        await expect.element(option('Item 9969')).toHaveAttribute('aria-posinset', '970');
        const list = listbox().element().getBoundingClientRect();
        const highlighted = option('Item 9969').element().getBoundingClientRect();
        expect(highlighted.top).toBeGreaterThanOrEqual(list.top);
        expect(highlighted.bottom).toBeLessThanOrEqual(list.bottom);

        if (hasNativeAxTree)
          expect((await axOption('Item 9969'))?.container).toEqual({ role: 'group', name: 'Group 9' });
      });
    });

    it('hydrates server-rendered markup with groupBy without warnings', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const tree = <GroupedCombobox items={entries} defaultValue={entries[1]} />;

      const container = document.createElement('div');
      container.innerHTML = renderToString(tree);
      document.body.append(container);
      const root = hydrateRoot(container, tree, { onRecoverableError: (error) => console.error(error) });

      await expect.element(ownerInput()).toHaveValue('Design');
      await userEvent.click(ownerInput());
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(option('Design')).toBeInTheDocument();
      expect(hydrationErrors(errors)).toEqual([]);

      root.unmount();
      container.remove();
      errors.mockRestore();
    });

    it('infers the item type for groupBy and groupLabel', () => {
      expectTypeOf<NonNullable<ComboboxProps<Entry>['groupBy']>>().parameter(0).toEqualTypeOf<Entry>();
      expectTypeOf<NonNullable<ComboboxProps<Entry>['groupBy']>>().returns.toEqualTypeOf<string | null>();
      expectTypeOf<ComboboxGroup<Entry>['items']>().toEqualTypeOf<readonly Entry[]>();
    });
  });

  describe('SSR', () => {
    it('hydrates server-rendered markup without warnings', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const tree = <UserCombobox items={users} defaultValue={bojan} />;

      const container = document.createElement('div');
      container.innerHTML = renderToString(tree);
      document.body.append(container);
      const root = hydrateRoot(container, tree, { onRecoverableError: (error) => console.error(error) });

      await expect.element(input()).toHaveValue('Bojan');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(hydrationErrors(errors)).toEqual([]);

      root.unmount();
      container.remove();
      errors.mockRestore();
    });
  });
});
