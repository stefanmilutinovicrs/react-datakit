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
import {
  rowKey,
  type ComboboxCore,
  type ComboboxGroup,
  type ComboboxRow,
  type ComboboxStatus,
} from './useComboboxCore';

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
  return (
    <Part tag="div" state={{ status: core.status }} ours={core.getPopupProps()} theirs={props} forwardedRef={ref} />
  );
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
  /** Renders the heading of a group (see `groupBy` on the root). Defaults to a `GroupLabel` with the group key. */
  groupLabel?: ((group: ComboboxGroup<TItem>) => ReactNode) | undefined;
};

/** A MultiSelect action row: select all or create. */
export type ComboboxActionRow<TItem> = Extract<ComboboxRow<TItem>, { type: 'select-all' | 'create' }>;

type ListBaseProps<TItem> = ComboboxListProps<TItem> & {
  /** Renders the action rows (select all, create). */
  renderAction?: ((row: ComboboxActionRow<TItem>) => ReactNode) | undefined;
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
  groupLabel,
  optionHeight = 36,
  overscan = 5,
  ...partProps
}: ListBaseProps<TItem> & { core: ComboboxCore<TItem>; forwardedRef: Ref<HTMLDivElement> }) {
  const listRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs<HTMLDivElement>(listRef, forwardedRef);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(optionHeight * 10);
  const { rows, rowGroups, highlightedIndex, highlightOrigin } = core;
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
  const pinned: number[] = [];
  for (let i = start; i < end; i++) pinned.push(i);
  // The highlighted row is always rendered, so aria-activedescendant never points to a missing
  // element, and so is the heading of every rendered group, which names it through aria-labelledby.
  pinned.push(highlightedIndex);
  for (const i of [...pinned]) pinned.push(rowGroups[i] ?? -1);
  const indices = [...new Set(pinned)].filter((i) => i >= 0).sort((a, b) => a - b);

  const renderRow = (index: number) => {
    const row = rows[index] as ComboboxRow<TItem>;
    return (
      <RowIndexContext.Provider key={rowKey(row, core.itemToKey)} value={index}>
        {row.type === 'option'
          ? children(row.item, index)
          : row.type === 'group-label'
            ? (groupLabel?.(row.group) ?? <GroupLabel>{row.group.key}</GroupLabel>)
            : renderAction?.(row)}
      </RowIndexContext.Provider>
    );
  };
  // Rows of a group are wrapped in its role="group" element. The wrapper is not positioned, so the
  // rows stay absolutely positioned in the spacer below.
  const content: ReactNode[] = [];
  let groupRows: ReactNode[] = [];
  indices.forEach((index, k) => {
    const heading = rowGroups[index] ?? -1;
    if (heading < 0) content.push(renderRow(index));
    else {
      groupRows.push(renderRow(index));
      if (rowGroups[indices[k + 1] ?? -1] !== heading) {
        content.push(
          <div key={heading} {...core.getGroupProps(heading)}>
            {groupRows}
          </div>,
        );
        groupRows = [];
      }
    }
  });

  const ours = {
    ...core.getListProps(),
    // Structural: the list is the scroll container of the virtualized options.
    style: { overflowY: 'auto' } satisfies CSSProperties,
    onScroll: (event: { currentTarget: HTMLDivElement }) => {
      setScrollTop(event.currentTarget.scrollTop);
    },
    children: (
      <div role="presentation" style={{ position: 'relative', height: count * optionHeight }}>
        <OptionHeightContext.Provider value={optionHeight}>{content}</OptionHeightContext.Provider>
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

export interface ComboboxGroupLabelState {
  key: string;
  /** Number of options in the group. */
  count: number;
}

export type ComboboxGroupLabelProps = PartProps<'div', ComboboxGroupLabelState>;

/** Heading of a group of options. Pass it to `<List groupLabel={(group) => …}>` to change its content. */
export const GroupLabel = forwardRef<HTMLDivElement, ComboboxGroupLabelProps>(function GroupLabel(props, ref) {
  const core = useCoreContext('GroupLabel');
  const { index, style } = useRowLayout('GroupLabel');
  const row = core.rows[index];
  if (row?.type !== 'group-label')
    throw new Error('react-datakit: <GroupLabel> is rendered by the groupLabel prop of List.');
  const state: ComboboxGroupLabelState = { key: row.group.key, count: row.group.items.length };
  const ours = { ...core.getGroupLabelProps(index), style };
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});
