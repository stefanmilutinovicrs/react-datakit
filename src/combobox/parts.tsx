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
import { Part, useIsomorphicLayoutEffect, useMergedRefs, visuallyHidden, type PartProps } from '../shared';
import { rowKey, type ComboboxCore, type ComboboxRow, type ComboboxStatus } from './useComboboxCore';

// Shared by Combobox and MultiSelect through the core context; part names get the root's prefix.

export const CoreContext = createContext<ComboboxCore<unknown> | null>(null);

export function useCoreContext<TItem>(part: string): ComboboxCore<TItem> {
  const context = useContext(CoreContext);
  if (!context) throw new Error(`react-datakit: <${part}> must be rendered inside <Combobox> or <MultiSelect>.`);
  return context as unknown as ComboboxCore<TItem>;
}

const RowIndexContext = createContext<number>(-1);
const OptionHeightContext = createContext(36);

/** Index and computed position of the row a part is rendered in, inside the virtualized list. */
export function useRowLayout(part: string): { index: number; style: CSSProperties } {
  const index = useContext(RowIndexContext);
  const optionHeight = useContext(OptionHeightContext);
  if (index < 0) throw new Error(`react-datakit: <${part}> must be rendered by the List part.`);
  return {
    index,
    style: {
      position: 'absolute',
      top: index * optionHeight,
      left: 0,
      right: 0,
      height: optionHeight,
      boxSizing: 'border-box',
    },
  };
}

export interface ComboboxRootState {
  open: boolean;
  status: ComboboxStatus;
}

/** Renders a root element with the live region, and provides the core to the parts. */
export function RootPart({
  core,
  partProps,
  children,
  forwardedRef,
  extra,
}: {
  core: ComboboxCore<unknown>;
  partProps: PartProps<'div', ComboboxRootState>;
  children: ReactNode;
  forwardedRef: Ref<HTMLDivElement>;
  extra?: object | undefined;
}) {
  const mergedRef = useMergedRefs<HTMLDivElement>(core.rootRef, forwardedRef);
  const state: ComboboxRootState = { open: core.isOpen, status: core.status };
  return (
    <CoreContext.Provider value={core}>
      <Part
        tag="div"
        state={state}
        ours={{
          ...core.getRootProps(),
          ...extra,
          children: (
            <>
              {children}
              <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
                {core.statusMessage}
              </div>
            </>
          ),
        }}
        theirs={partProps}
        forwardedRef={mergedRef}
      />
    </CoreContext.Provider>
  );
}

export interface ComboboxLabelState {
  open: boolean;
}

export type ComboboxLabelProps = PartProps<'label', ComboboxLabelState>;

export const Label = forwardRef<HTMLLabelElement, ComboboxLabelProps>(function Label(props, ref) {
  const core = useCoreContext('Label');
  const { registerLabel } = core;
  useIsomorphicLayoutEffect(() => registerLabel(), [registerLabel]);
  return (
    <Part tag="label" state={{ open: core.isOpen }} ours={core.getLabelProps()} theirs={props} forwardedRef={ref} />
  );
});

export interface ComboboxInputState {
  open: boolean;
  status: ComboboxStatus;
}

export type ComboboxInputProps = Omit<PartProps<'input', ComboboxInputState>, 'value' | 'defaultValue' | 'children'>;

export const Input = forwardRef<HTMLInputElement, ComboboxInputProps>(function Input(props, ref) {
  const core = useCoreContext('Input');
  const mergedRef = useMergedRefs<HTMLInputElement>(core.inputRef, ref);
  const state: ComboboxInputState = { open: core.isOpen, status: core.status };
  return <Part tag="input" state={state} ours={core.getInputProps()} theirs={props} forwardedRef={mergedRef} />;
});

export interface ComboboxPopupState {
  status: ComboboxStatus;
}

export type ComboboxPopupProps = PartProps<'div', ComboboxPopupState>;

/** Floating container for the list and the empty, loading and error states. Rendered only while open. */
export const Popup = forwardRef<HTMLDivElement, ComboboxPopupProps>(function Popup(props, ref) {
  const core = useCoreContext('Popup');
  if (!core.isOpen) return null;
  const ours = {
    'data-dk-part': `${core.part}-popup`,
    'data-state': 'open',
    'data-loading': core.status === 'loading' ? '' : undefined,
    // Clicks inside the popup (options, retry button) keep focus in the input.
    onMouseDown: (event: { preventDefault: () => void }) => {
      event.preventDefault();
    },
  };
  return <Part tag="div" state={{ status: core.status }} ours={ours} theirs={props} forwardedRef={ref} />;
});

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

type ListBaseProps<TItem> = ComboboxListProps<TItem> & {
  /** Renders the action rows (select all, create). */
  renderAction?: ((row: Exclude<ComboboxRow<TItem>, { type: 'option' }>) => ReactNode) | undefined;
};

const ListBase = forwardRef(function List<TItem>(props: ListBaseProps<TItem>, ref: Ref<HTMLDivElement>) {
  const core = useCoreContext<TItem>('List');
  if (!core.isOpen) return null;
  return <VirtualList {...props} core={core} forwardedRef={ref} />;
});

export const List = ListBase as <TItem>(
  props: ListBaseProps<TItem> & { ref?: Ref<HTMLDivElement> | undefined },
) => ReactElement | null;

function VirtualList<TItem>({
  core,
  forwardedRef,
  children,
  renderAction,
  optionHeight = 36,
  overscan = 5,
  ...partProps
}: ListBaseProps<TItem> & { core: ComboboxCore<TItem>; forwardedRef: Ref<HTMLDivElement> }) {
  const listRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs<HTMLDivElement>(listRef, forwardedRef);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(optionHeight * 10);
  const { rows, highlightedIndex, highlightOrigin } = core;
  const count = rows.length;

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
  // The highlighted row is always rendered, so aria-activedescendant never points to a missing element.
  if (highlightedIndex >= 0 && highlightedIndex < start) indices.push(highlightedIndex);
  for (let i = start; i < end; i++) indices.push(i);
  if (highlightedIndex >= end) indices.push(highlightedIndex);

  const ours = {
    ...core.getListProps(),
    // Structural: the list is the scroll container of the virtualized options.
    style: { overflowY: 'auto' } satisfies CSSProperties,
    onScroll: (event: { currentTarget: HTMLDivElement }) => {
      setScrollTop(event.currentTarget.scrollTop);
    },
    children: (
      <div role="presentation" style={{ position: 'relative', height: count * optionHeight }}>
        <OptionHeightContext.Provider value={optionHeight}>
          {indices.map((index) => {
            const row = rows[index] as ComboboxRow<TItem>;
            return (
              <RowIndexContext.Provider key={rowKey(row, core.itemToKey)} value={index}>
                {row.type === 'option' ? children(row.item, index) : renderAction?.(row)}
              </RowIndexContext.Provider>
            );
          })}
        </OptionHeightContext.Provider>
      </div>
    ),
  };
  const state: ComboboxListState = { open: true, status: core.status, count };
  return <Part tag="div" state={state} ours={ours} theirs={partProps} forwardedRef={mergedRef} />;
}

export interface ComboboxOptionState {
  highlighted: boolean;
  selected: boolean;
  disabled: boolean;
  index: number;
}

export type ComboboxOptionProps<TItem> = PartProps<'div', ComboboxOptionState> & {
  item: TItem;
};

export const Option = forwardRef(function Option<TItem>(
  { item, ...props }: ComboboxOptionProps<TItem>,
  ref: Ref<HTMLDivElement>,
) {
  const core = useCoreContext<TItem>('Option');
  const { index, style } = useRowLayout('Option');
  const state: ComboboxOptionState = {
    highlighted: index === core.highlightedIndex,
    selected: core.isSelected(item),
    disabled: core.isDisabled(item),
    index,
  };
  const ours = { ...core.getOptionProps(item, index), style };
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});

export interface ComboboxStatusPartState {
  query: string | null;
}

export type ComboboxEmptyProps = PartProps<'div', ComboboxStatusPartState>;
export type ComboboxLoadingProps = PartProps<'div', ComboboxStatusPartState>;

/** Shown while open when the current query has no options. */
export const Empty = forwardRef<HTMLDivElement, ComboboxEmptyProps>(function Empty(props, ref) {
  const core = useCoreContext('Empty');
  if (core.status !== 'success' || core.rows.length > 0) return null;
  return (
    <Part
      tag="div"
      state={{ query: core.query }}
      ours={{ 'data-dk-part': `${core.part}-empty` }}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

/** Shown while `loadOptions` runs for the current query. */
export const Loading = forwardRef<HTMLDivElement, ComboboxLoadingProps>(function Loading(props, ref) {
  const core = useCoreContext('Loading');
  if (core.status !== 'loading') return null;
  return (
    <Part
      tag="div"
      state={{ query: core.query }}
      ours={{ 'data-dk-part': `${core.part}-loading`, 'data-loading': '' }}
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
export const ErrorPart = forwardRef<HTMLDivElement, ComboboxErrorProps>(function Error({ children, ...props }, ref) {
  const core = useCoreContext('Error');
  if (core.status !== 'error') return null;
  const state: ComboboxErrorState = { error: core.error, retry: core.retry };
  const ours = {
    role: 'alert',
    'data-dk-part': `${core.part}-error`,
    children: typeof children === 'function' ? children(state) : children,
  };
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});
