import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { Part, useIsomorphicLayoutEffect, useMergedRefs, type PartProps } from '../shared';
import { useCombobox, type ComboboxStatus, type UseComboboxOptions, type UseComboboxReturn } from './useCombobox';

const ComboboxContext = createContext<UseComboboxReturn<unknown> | null>(null);
const OptionIndexContext = createContext<number>(-1);

function useComboboxContext<TItem>(part: string): UseComboboxReturn<TItem> {
  const context = useContext(ComboboxContext);
  if (!context) throw new Error(`react-datakit: <Combobox.${part}> must be rendered inside <Combobox>.`);
  return context as unknown as UseComboboxReturn<TItem>;
}

// Visually hidden but announced. Inline because the live region must work without the theme.
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};

/* Root */

export interface ComboboxRootState {
  open: boolean;
  status: ComboboxStatus;
}

export type ComboboxProps<TItem> = UseComboboxOptions<TItem> &
  Omit<PartProps<'div', ComboboxRootState>, 'onChange' | 'defaultValue' | 'children' | 'id'> & {
    children: ReactNode;
  };

const ComboboxRoot = forwardRef(function Combobox<TItem>(props: ComboboxProps<TItem>, ref: Ref<HTMLDivElement>) {
  const {
    id,
    items,
    loadOptions,
    filter,
    itemToString,
    itemToKey,
    value,
    defaultValue,
    onChange,
    debounceMs,
    selectOnTab,
    formatResultCount,
    children,
    ...partProps
  } = props;
  const combobox = useCombobox<TItem>({
    id,
    items,
    loadOptions,
    filter,
    itemToString,
    itemToKey,
    value,
    defaultValue,
    onChange,
    debounceMs,
    selectOnTab,
    formatResultCount,
  });
  const { ref: rootRef, ...rootProps } = combobox.getRootProps();
  const mergedRef = useMergedRefs<HTMLDivElement>(rootRef, ref);
  const state: ComboboxRootState = { open: combobox.isOpen, status: combobox.status };

  return (
    <ComboboxContext.Provider value={combobox as unknown as UseComboboxReturn<unknown>}>
      <Part
        tag="div"
        state={state}
        ours={{
          ...rootProps,
          children: (
            <>
              {children}
              <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
                {combobox.statusMessage}
              </div>
            </>
          ),
        }}
        theirs={partProps}
        forwardedRef={mergedRef}
      />
    </ComboboxContext.Provider>
  );
});

/* Label */

export interface ComboboxLabelState {
  open: boolean;
}

export type ComboboxLabelProps = PartProps<'label', ComboboxLabelState>;

const Label = forwardRef<HTMLLabelElement, ComboboxLabelProps>(function ComboboxLabel(props, ref) {
  const combobox = useComboboxContext('Label');
  const { registerLabel } = combobox;
  useIsomorphicLayoutEffect(() => registerLabel(), [registerLabel]);
  return (
    <Part
      tag="label"
      state={{ open: combobox.isOpen }}
      ours={combobox.getLabelProps()}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

/* Input */

export interface ComboboxInputState {
  open: boolean;
  status: ComboboxStatus;
}

export type ComboboxInputProps = Omit<PartProps<'input', ComboboxInputState>, 'value' | 'defaultValue' | 'children'>;

const Input = forwardRef<HTMLInputElement, ComboboxInputProps>(function ComboboxInput(props, ref) {
  const combobox = useComboboxContext('Input');
  const state: ComboboxInputState = { open: combobox.isOpen, status: combobox.status };
  return <Part tag="input" state={state} ours={combobox.getInputProps()} theirs={props} forwardedRef={ref} />;
});

/* Popup */

export interface ComboboxPopupState {
  status: ComboboxStatus;
}

export type ComboboxPopupProps = PartProps<'div', ComboboxPopupState>;

/** Floating container for the list and the empty, loading and error states. Rendered only while open. */
const Popup = forwardRef<HTMLDivElement, ComboboxPopupProps>(function ComboboxPopup(props, ref) {
  const combobox = useComboboxContext('Popup');
  if (!combobox.isOpen) return null;
  const ours = {
    'data-dk-part': 'combobox-popup',
    'data-state': 'open',
    'data-loading': combobox.status === 'loading' ? '' : undefined,
    // Clicks inside the popup (options, retry button) keep focus in the input.
    onMouseDown: (event: { preventDefault: () => void }) => {
      event.preventDefault();
    },
  };
  return <Part tag="div" state={{ status: combobox.status }} ours={ours} theirs={props} forwardedRef={ref} />;
});

/* List (virtualized) */

export interface ComboboxListState {
  open: boolean;
  status: ComboboxStatus;
  count: number;
}

export type ComboboxListProps<TItem> = Omit<PartProps<'div', ComboboxListState>, 'children'> & {
  /** Renders one option. Annotate the parameter with your item type: `(user: User) => …`. */
  children: (item: TItem, index: number) => ReactNode;
  /** Height of one option in px. Options are virtualized, so every option has this height. Default 36. */
  optionHeight?: number | undefined;
  /** Options rendered above and below the visible area. Default 5. */
  overscan?: number | undefined;
};

const List = forwardRef(function ComboboxList<TItem>(props: ComboboxListProps<TItem>, ref: Ref<HTMLDivElement>) {
  const combobox = useComboboxContext<TItem>('List');
  if (!combobox.isOpen) return null;
  return <VirtualList {...props} combobox={combobox} forwardedRef={ref} />;
});

const OptionHeightContext = createContext(36);

function VirtualList<TItem>({
  combobox,
  forwardedRef,
  children,
  optionHeight = 36,
  overscan = 5,
  ...partProps
}: ComboboxListProps<TItem> & { combobox: UseComboboxReturn<TItem>; forwardedRef: Ref<HTMLDivElement> }) {
  const listRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs<HTMLDivElement>(listRef, forwardedRef);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(optionHeight * 10);
  const { items, highlightedIndex, highlightOrigin } = combobox;
  const count = items.length;

  useEffect(() => {
    const element = listRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      setViewportHeight(element.clientHeight);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Keyboard moves keep the highlighted option in view; pointer moves never scroll.
  useIsomorphicLayoutEffect(() => {
    const element = listRef.current;
    if (!element || highlightedIndex < 0 || highlightOrigin !== 'keyboard') return;
    const top = highlightedIndex * optionHeight;
    const bottom = top + optionHeight;
    if (top < element.scrollTop) element.scrollTop = top;
    else if (bottom > element.scrollTop + element.clientHeight) element.scrollTop = bottom - element.clientHeight;
  }, [highlightedIndex, highlightOrigin, optionHeight]);

  const start = Math.max(0, Math.floor(scrollTop / optionHeight) - overscan);
  const end = Math.min(count, Math.ceil((scrollTop + viewportHeight) / optionHeight) + overscan);
  const indices: number[] = [];
  // The highlighted option is always rendered, so aria-activedescendant never points to a missing element.
  if (highlightedIndex >= 0 && highlightedIndex < start) indices.push(highlightedIndex);
  for (let i = start; i < end; i++) indices.push(i);
  if (highlightedIndex >= end) indices.push(highlightedIndex);

  const ours = {
    ...combobox.getListProps(),
    // Structural: the list is the scroll container of the virtualized options.
    style: { overflowY: 'auto' } satisfies CSSProperties,
    onScroll: (event: { currentTarget: HTMLDivElement }) => {
      setScrollTop(event.currentTarget.scrollTop);
    },
    children: (
      <div role="presentation" style={{ position: 'relative', height: count * optionHeight }}>
        <OptionHeightContext.Provider value={optionHeight}>
          {indices.map((index) => {
            const item = items[index] as TItem;
            return (
              <OptionIndexContext.Provider key={combobox.itemToKey(item)} value={index}>
                {children(item, index)}
              </OptionIndexContext.Provider>
            );
          })}
        </OptionHeightContext.Provider>
      </div>
    ),
  };
  const state: ComboboxListState = { open: true, status: combobox.status, count };
  return <Part tag="div" state={state} ours={ours} theirs={partProps} forwardedRef={mergedRef} />;
}

/* Option */

export interface ComboboxOptionState {
  highlighted: boolean;
  selected: boolean;
  index: number;
}

export type ComboboxOptionProps<TItem> = PartProps<'div', ComboboxOptionState> & {
  item: TItem;
};

const Option = forwardRef(function ComboboxOption<TItem>(
  { item, ...props }: ComboboxOptionProps<TItem>,
  ref: Ref<HTMLDivElement>,
) {
  const combobox = useComboboxContext<TItem>('Option');
  const index = useContext(OptionIndexContext);
  const optionHeight = useContext(OptionHeightContext);
  if (index < 0) throw new Error('react-datakit: <Combobox.Option> must be rendered by <Combobox.List>.');

  const state: ComboboxOptionState = {
    highlighted: index === combobox.highlightedIndex,
    selected: combobox.isSelected(item),
    index,
  };
  const ours = {
    ...combobox.getOptionProps(item, index),
    // Computed position inside the virtualized list.
    style: {
      position: 'absolute',
      top: index * optionHeight,
      left: 0,
      right: 0,
      height: optionHeight,
      boxSizing: 'border-box',
    } satisfies CSSProperties,
  };
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});

/* Empty, Loading, Error */

export interface ComboboxStatusPartState {
  query: string | null;
}

export type ComboboxEmptyProps = PartProps<'div', ComboboxStatusPartState>;
export type ComboboxLoadingProps = PartProps<'div', ComboboxStatusPartState>;

/** Shown while open when the current query has no options. */
const Empty = forwardRef<HTMLDivElement, ComboboxEmptyProps>(function ComboboxEmpty(props, ref) {
  const combobox = useComboboxContext('Empty');
  if (combobox.status !== 'success' || combobox.items.length > 0) return null;
  return (
    <Part
      tag="div"
      state={{ query: combobox.query }}
      ours={{ 'data-dk-part': 'combobox-empty' }}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

/** Shown while `loadOptions` runs for the current query. */
const Loading = forwardRef<HTMLDivElement, ComboboxLoadingProps>(function ComboboxLoading(props, ref) {
  const combobox = useComboboxContext('Loading');
  if (combobox.status !== 'loading') return null;
  return (
    <Part
      tag="div"
      state={{ query: combobox.query }}
      ours={{ 'data-dk-part': 'combobox-loading', 'data-loading': '' }}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

export interface ComboboxErrorState {
  error: unknown;
  retry: () => void;
}

export type ComboboxErrorProps = Omit<PartProps<'div', ComboboxErrorState>, 'children'> & {
  children: ReactNode | ((state: ComboboxErrorState) => ReactNode);
};

/** Shown when `loadOptions` rejects for the current query. Announced with `role="alert"`. */
const ErrorPart = forwardRef<HTMLDivElement, ComboboxErrorProps>(function ComboboxError({ children, ...props }, ref) {
  const combobox = useComboboxContext('Error');
  if (combobox.status !== 'error') return null;
  const state: ComboboxErrorState = { error: combobox.error, retry: combobox.retry };
  const ours = {
    role: 'alert',
    'data-dk-part': 'combobox-error',
    children: typeof children === 'function' ? children(state) : children,
  };
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});

/* Public compound component */

type WithRef<P, E> = P & { ref?: Ref<E> | undefined };

/**
 * Searchable select for large or remote option lists.
 *
 * @experimental
 * @example
 * <Combobox items={users} itemToString={(u) => u?.name ?? ''} itemToKey={(u) => u.id}>
 *   <Combobox.Label>Assignee</Combobox.Label>
 *   <Combobox.Input />
 *   <Combobox.Popup>
 *     <Combobox.List>{(user: User) => <Combobox.Option item={user}>{user.name}</Combobox.Option>}</Combobox.List>
 *     <Combobox.Empty>No users found</Combobox.Empty>
 *   </Combobox.Popup>
 * </Combobox>
 */
export const Combobox = Object.assign(
  ComboboxRoot as <TItem>(props: WithRef<ComboboxProps<TItem>, HTMLDivElement>) => ReactElement,
  {
    Label,
    Input,
    Popup,
    List: List as <TItem>(props: WithRef<ComboboxListProps<TItem>, HTMLDivElement>) => ReactElement | null,
    Option: Option as <TItem>(props: WithRef<ComboboxOptionProps<TItem>, HTMLDivElement>) => ReactElement,
    Empty,
    Loading,
    Error: ErrorPart,
  },
);
