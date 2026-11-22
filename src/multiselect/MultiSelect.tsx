import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Empty,
  ErrorPart,
  Input,
  Label,
  List,
  Loading,
  Option,
  Popup,
  RootPart,
  useCoreContext,
  useRowLayout,
  type ComboboxListProps,
  type ComboboxOptionProps,
  type ComboboxRootState,
} from '../combobox/parts';
import type { ComboboxCore, ComboboxRow } from '../combobox/useComboboxCore';
import { Part, useMergedRefs, type PartProps } from '../shared';
import { useMultiSelect, type UseMultiSelectOptions, type UseMultiSelectReturn } from './useMultiSelect';

const MultiSelectContext = createContext<UseMultiSelectReturn<unknown> | null>(null);
const ChipContext = createContext<{ item: unknown; index: number } | null>(null);

function useMultiSelectContext<TItem>(part: string): UseMultiSelectReturn<TItem> {
  const context = useContext(MultiSelectContext);
  if (!context) throw new Error(`react-datakit: <MultiSelect.${part}> must be rendered inside <MultiSelect>.`);
  return context as unknown as UseMultiSelectReturn<TItem>;
}

/* Root */

export type MultiSelectRootState = ComboboxRootState;

export type MultiSelectProps<TItem> = UseMultiSelectOptions<TItem> &
  Omit<PartProps<'div', MultiSelectRootState>, 'onChange' | 'defaultValue' | 'children' | 'id'> & {
    children: ReactNode;
  };

const MultiSelectRoot = forwardRef(function MultiSelect<TItem>(
  props: MultiSelectProps<TItem>,
  ref: Ref<HTMLDivElement>,
) {
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
    formatResultCount,
    max,
    selectAll,
    onCreate,
    children,
    ...partProps
  } = props;
  const multiSelect = useMultiSelect<TItem>({
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
    formatResultCount,
    max,
    selectAll,
    onCreate,
  });
  return (
    <MultiSelectContext.Provider value={multiSelect as unknown as UseMultiSelectReturn<unknown>}>
      <RootPart core={multiSelect as unknown as ComboboxCore<unknown>} partProps={partProps} forwardedRef={ref}>
        {children}
      </RootPart>
    </MultiSelectContext.Provider>
  );
});

/* Control: the field that holds the chips and the input */

export interface MultiSelectControlState {
  open: boolean;
  count: number;
}

export type MultiSelectControlProps = PartProps<'div', MultiSelectControlState>;

const Control = forwardRef<HTMLDivElement, MultiSelectControlProps>(function MultiSelectControl(props, ref) {
  const multiSelect = useMultiSelectContext('Control');
  const state = { open: multiSelect.isOpen, count: multiSelect.selectedItems.length };
  return <Part tag="div" state={state} ours={multiSelect.getControlProps()} theirs={props} forwardedRef={ref} />;
});

/* Chips */

export interface MultiSelectChipsState {
  count: number;
  overflowCount: number;
}

export type MultiSelectChipsProps<TItem> = Omit<PartProps<'div', MultiSelectChipsState>, 'children'> & {
  /** Renders one chip. Annotate the parameter with your item type: `(user: User) => …`. */
  children: (item: TItem, index: number) => ReactNode;
};

const Chips = forwardRef(function MultiSelectChips<TItem>(
  { children, ...props }: MultiSelectChipsProps<TItem>,
  ref: Ref<HTMLDivElement>,
) {
  const multiSelect = useMultiSelectContext<TItem>('Chips');
  const containerRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs<HTMLDivElement>(containerRef, ref);
  const { selectedItems, setOverflowIndex, itemToKey } = multiSelect;

  // Chips that stick out of the container on the right are marked as overflow. The theme keeps
  // chips on one line (nowrap, overflow hidden); without it chips wrap and nothing overflows.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const right = container.getBoundingClientRect().right;
      const chips = container.querySelectorAll('[data-dk-part="multiselect-chip"]');
      let index = -1;
      for (let i = 0; i < chips.length; i++) {
        const chip = chips[i];
        if (chip && chip.getBoundingClientRect().right > right + 0.5) {
          index = i;
          break;
        }
      }
      setOverflowIndex(index);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    for (const chip of container.querySelectorAll('[data-dk-part="multiselect-chip"]')) observer.observe(chip);
    return () => {
      observer.disconnect();
    };
  }, [selectedItems, setOverflowIndex]);

  const ours = {
    ...multiSelect.getChipsProps(),
    children: selectedItems.map((item, index) => (
      <ChipContext.Provider key={itemToKey(item)} value={{ item, index }}>
        {children(item, index)}
      </ChipContext.Provider>
    )),
  };
  const state = { count: selectedItems.length, overflowCount: multiSelect.overflowCount };
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={mergedRef} />;
});

export interface MultiSelectChipState {
  index: number;
  overflow: boolean;
}

export type MultiSelectChipProps<TItem> = PartProps<'div', MultiSelectChipState> & {
  item: TItem;
};

function useChipContext(part: string) {
  const context = useContext(ChipContext);
  if (!context) throw new Error(`react-datakit: <MultiSelect.${part}> must be rendered by <MultiSelect.Chips>.`);
  return context;
}

const Chip = forwardRef(function MultiSelectChip<TItem>(
  { item, ...props }: MultiSelectChipProps<TItem>,
  ref: Ref<HTMLDivElement>,
) {
  const multiSelect = useMultiSelectContext<TItem>('Chip');
  const { index } = useChipContext('Chip');
  const state = { index, overflow: multiSelect.overflowIndex >= 0 && index >= multiSelect.overflowIndex };
  return (
    <Part tag="div" state={state} ours={multiSelect.getChipProps(item, index)} theirs={props} forwardedRef={ref} />
  );
});

export type MultiSelectChipRemoveProps = PartProps<'button', { index: number }>;

/** Removes its chip. Labeled "Remove {item}" by default; pass `aria-label` to translate it. */
const ChipRemove = forwardRef<HTMLButtonElement, MultiSelectChipRemoveProps>(
  function MultiSelectChipRemove(props, ref) {
    const multiSelect = useMultiSelectContext('ChipRemove');
    const { item, index } = useChipContext('ChipRemove');
    const ours = {
      ...multiSelect.getChipRemoveProps(item, index),
      children: <span aria-hidden="true">×</span>,
    };
    return <Part tag="button" state={{ index }} ours={ours} theirs={props} forwardedRef={ref} />;
  },
);

export type MultiSelectChipsOverflowProps = Omit<PartProps<'div', { count: number }>, 'children'> & {
  /** Text for the hidden chips, e.g. `(count) => \`+${count} more\``. */
  children: (count: number) => ReactNode;
};

/** Shown when chips don't fit on one line. */
const ChipsOverflow = forwardRef<HTMLDivElement, MultiSelectChipsOverflowProps>(function MultiSelectChipsOverflow(
  { children, ...props },
  ref,
) {
  const multiSelect = useMultiSelectContext('ChipsOverflow');
  const count = multiSelect.overflowCount;
  if (count === 0) return null;
  const ours = { 'data-dk-part': 'multiselect-chips-overflow', children: children(count) };
  return <Part tag="div" state={{ count }} ours={ours} theirs={props} forwardedRef={ref} />;
});

/* List with the action rows */

export interface MultiSelectActionState {
  highlighted: boolean;
  selected: boolean;
  disabled: boolean;
}

export type MultiSelectSelectAllProps = PartProps<'div', MultiSelectActionState>;
export type MultiSelectCreateProps = PartProps<'div', MultiSelectActionState>;

function useActionRow(part: string, type: 'select-all' | 'create') {
  const core = useCoreContext(`MultiSelect.${part}`);
  const { index, style } = useRowLayout(`MultiSelect.${part}`);
  const row = core.rows[index];
  if (row?.type !== type) throw new Error(`react-datakit: <MultiSelect.${part}> is rendered by <MultiSelect.List>.`);
  const props = core.getRowProps(row, index);
  const state: MultiSelectActionState = {
    highlighted: index === core.highlightedIndex,
    selected: props['aria-selected'] === true,
    disabled: props['aria-disabled'] === true,
  };
  return { ours: { ...props, style }, state };
}

/** The "Select all" row. Pass it to `<MultiSelect.List selectAll={…}>` to change its content. */
const SelectAll = forwardRef<HTMLDivElement, MultiSelectSelectAllProps>(function MultiSelectSelectAll(props, ref) {
  const { ours, state } = useActionRow('SelectAll', 'select-all');
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});

/** The "Create" row. Pass a function to `<MultiSelect.List create={(query) => …}>` to change its content. */
const Create = forwardRef<HTMLDivElement, MultiSelectCreateProps>(function MultiSelectCreate(props, ref) {
  const { ours, state } = useActionRow('Create', 'create');
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});

export type MultiSelectListProps<TItem> = ComboboxListProps<TItem> & {
  /** Content of the "Select all" row (enable the row with `selectAll` on the root). */
  selectAll?: ReactNode;
  /** Content of the "Create" row for the typed text (enable the row with `onCreate` on the root). */
  create?: ((query: string) => ReactNode) | undefined;
};

const MultiSelectList = forwardRef(function MultiSelectList<TItem>(
  { selectAll, create, ...props }: MultiSelectListProps<TItem>,
  ref: Ref<HTMLDivElement>,
) {
  const renderAction = (row: Exclude<ComboboxRow<TItem>, { type: 'option' }>) => {
    if (row.type === 'select-all') return selectAll ?? <SelectAll>Select all</SelectAll>;
    return create ? create(row.query) : <Create>{`Create “${row.query}”`}</Create>;
  };
  return <List {...props} renderAction={renderAction} ref={ref} />;
});

/* Public compound component */

type WithRef<P, E> = P & { ref?: Ref<E> | undefined };

/**
 * Pick several values from a long or remote list; selected values are shown as removable chips.
 *
 * @experimental
 * @example
 * <MultiSelect items={labels} itemToString={(l) => l?.name ?? ''} itemToKey={(l) => l.id} selectAll>
 *   <MultiSelect.Label>Labels</MultiSelect.Label>
 *   <MultiSelect.Control>
 *     <MultiSelect.Chips>
 *       {(label: Label) => (
 *         <MultiSelect.Chip item={label}>
 *           {label.name}
 *           <MultiSelect.ChipRemove />
 *         </MultiSelect.Chip>
 *       )}
 *     </MultiSelect.Chips>
 *     <MultiSelect.ChipsOverflow>{(count) => `+${count} more`}</MultiSelect.ChipsOverflow>
 *     <MultiSelect.Input />
 *   </MultiSelect.Control>
 *   <MultiSelect.Popup>
 *     <MultiSelect.List>{(label: Label) => <MultiSelect.Option item={label}>{label.name}</MultiSelect.Option>}</MultiSelect.List>
 *     <MultiSelect.Empty>No labels found</MultiSelect.Empty>
 *   </MultiSelect.Popup>
 * </MultiSelect>
 */
export const MultiSelect = Object.assign(
  MultiSelectRoot as <TItem>(props: WithRef<MultiSelectProps<TItem>, HTMLDivElement>) => ReactElement,
  {
    Label,
    Control,
    Chips: Chips as <TItem>(props: WithRef<MultiSelectChipsProps<TItem>, HTMLDivElement>) => ReactElement,
    Chip: Chip as <TItem>(props: WithRef<MultiSelectChipProps<TItem>, HTMLDivElement>) => ReactElement,
    ChipRemove,
    ChipsOverflow,
    Input,
    Popup,
    List: MultiSelectList as <TItem>(
      props: WithRef<MultiSelectListProps<TItem>, HTMLDivElement>,
    ) => ReactElement | null,
    Option: Option as <TItem>(props: WithRef<ComboboxOptionProps<TItem>, HTMLDivElement>) => ReactElement,
    SelectAll,
    Create,
    Empty,
    Loading,
    Error: ErrorPart,
  },
);
