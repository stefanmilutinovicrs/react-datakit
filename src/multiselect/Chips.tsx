import { forwardRef, useEffect, useRef, type ReactNode, type Ref } from 'react';
import { Part, useMergedRefs, type PartProps } from '../shared';
import { ChipContext, useChipContext, useMultiSelectContext } from './context';

export interface MultiSelectControlState {
  open: boolean;
  count: number;
}

export type MultiSelectControlProps = PartProps<'div', MultiSelectControlState>;

export const Control = forwardRef<HTMLDivElement, MultiSelectControlProps>(function MultiSelectControl(props, ref) {
  const multiSelect = useMultiSelectContext('Control');
  const state = { open: multiSelect.isOpen, count: multiSelect.selectedItems.length };
  return <Part tag="div" state={state} ours={multiSelect.getControlProps()} theirs={props} forwardedRef={ref} />;
});

export interface MultiSelectChipsState {
  count: number;
  overflowCount: number;
}

export type MultiSelectChipsProps<TItem> = Omit<PartProps<'div', MultiSelectChipsState>, 'children'> & {
  /** Renders one chip. Annotate the parameter with your item type: `(user: User) => …`. */
  children: (item: TItem, index: number) => ReactNode;
};

export const Chips = forwardRef(function MultiSelectChips<TItem>(
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

export type MultiSelectChipProps = PartProps<'div', MultiSelectChipState>;

export const Chip = forwardRef<HTMLDivElement, MultiSelectChipProps>(function MultiSelectChip(props, ref) {
  const multiSelect = useMultiSelectContext('Chip');
  const { item, index } = useChipContext('Chip');
  const state = { index, overflow: multiSelect.overflowIndex >= 0 && index >= multiSelect.overflowIndex };
  return (
    <Part tag="div" state={state} ours={multiSelect.getChipProps(item, index)} theirs={props} forwardedRef={ref} />
  );
});

export type MultiSelectChipRemoveProps = PartProps<'button', { index: number }>;

/** Removes its chip. Labeled "Remove {item}" by default; pass `aria-label` to translate it. */
export const ChipRemove = forwardRef<HTMLButtonElement, MultiSelectChipRemoveProps>(
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
export const ChipsOverflow = forwardRef<HTMLDivElement, MultiSelectChipsOverflowProps>(
  function MultiSelectChipsOverflow({ children, ...props }, ref) {
    const multiSelect = useMultiSelectContext('ChipsOverflow');
    const count = multiSelect.overflowCount;
    if (count === 0) return null;
    const ours = { 'data-dk-part': 'multiselect-chips-overflow', children: children(count) };
    return <Part tag="div" state={{ count }} ours={ours} theirs={props} forwardedRef={ref} />;
  },
);
