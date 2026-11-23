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
import { Part, type PartProps } from '../Part';
import { useIsomorphicLayoutEffect } from '../useIsomorphicLayoutEffect';
import { useMergedRefs } from '../useMergedRefs';
import { useCoreContext } from './context';
import { rowKey, type ComboboxCore, type ComboboxRow, type ComboboxStatus } from './useComboboxCore';

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
