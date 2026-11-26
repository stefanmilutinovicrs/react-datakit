import { forwardRef, useEffect, useRef, type ReactNode, type Ref } from 'react';
import { multiselectParts, Part, useMergedRefs, type PartProps } from '../shared';
import { ChipContext, useChipContext, useMultiSelectContext } from './context';

export interface MultiSelectControlState {
  open: boolean;
  count: number;
  expanded: boolean;
}

export type MultiSelectControlProps = PartProps<'div', MultiSelectControlState>;

export const Control = forwardRef<HTMLDivElement, MultiSelectControlProps>(function MultiSelectControl(props, ref) {
  const multiSelect = useMultiSelectContext('Control');
  const state = { open: multiSelect.isOpen, count: multiSelect.selectedItems.length, expanded: multiSelect.expanded };
  return <Part tag="div" state={state} ours={multiSelect.getControlProps()} theirs={props} forwardedRef={ref} />;
});

export interface MultiSelectChipsState {
  count: number;
  overflowCount: number;
  expanded: boolean;
}

export type MultiSelectChipsProps<TItem> = Omit<PartProps<'div', MultiSelectChipsState>, 'children'> & {
  /** Renders one chip. Annotate the parameter with your item type: `(user: User) => …`. */
  children: (item: TItem, index: number) => ReactNode;
};

const chipSelector = `[data-dk-part="${multiselectParts.chip}"]`;
const visibleWidthProperty = '--dk-chips-visible-width';

export const Chips = forwardRef(function MultiSelectChips<TItem>(
  { children, ...props }: MultiSelectChipsProps<TItem>,
  ref: Ref<HTMLDivElement>,
) {
  const multiSelect = useMultiSelectContext<TItem>('Chips');
  const containerRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs<HTMLDivElement>(containerRef, ref);
  const { selectedItems, setOverflowIndex, itemToKey, expanded } = multiSelect;

  // Chips past the right edge are marked as overflow, and the width up to the last chip that fits
  // goes to --dk-chips-visible-width so the theme can cut there. Without the theme chips wrap and
  // nothing overflows. The width is removed while measuring, so the measurement never sees its own
  // cut and can't oscillate; the Control is observed too, because a cut Chips doesn't grow with it.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (expanded || typeof ResizeObserver === 'undefined') {
      container.style.removeProperty(visibleWidthProperty);
      setOverflowIndex(-1);
      return;
    }
    let frame = 0;
    const measure = () => {
      frame = 0;
      container.style.removeProperty(visibleWidthProperty);
      const { left, right } = container.getBoundingClientRect();
      const chips = [...container.querySelectorAll(chipSelector)];
      const index = chips.findIndex((chip) => chip.getBoundingClientRect().right > right + 0.5);
      if (index >= 0) {
        const lastFitting = chips[index - 1];
        const width = lastFitting ? lastFitting.getBoundingClientRect().right - left : 0;
        container.style.setProperty(visibleWidthProperty, `${width}px`);
      }
      setOverflowIndex(index);
    };
    // Measuring inside the observer callback would resize what it observes and trigger
    // "ResizeObserver loop" errors, so the measurement waits for the next frame.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    if (container.parentElement) observer.observe(container.parentElement);
    for (const chip of container.querySelectorAll(chipSelector)) observer.observe(chip);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [selectedItems, setOverflowIndex, expanded]);

  const ours = {
    ...multiSelect.getChipsProps(),
    children: selectedItems.map((item, index) => (
      <ChipContext.Provider key={itemToKey(item)} value={{ item, index }}>
        {children(item, index)}
      </ChipContext.Provider>
    )),
  };
  const state = { count: selectedItems.length, overflowCount: multiSelect.overflowCount, expanded };
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
  const state = {
    index,
    overflow: !multiSelect.expanded && multiSelect.overflowIndex >= 0 && index >= multiSelect.overflowIndex,
  };
  return (
    <Part tag="div" state={state} ours={multiSelect.getChipProps(item, index)} theirs={props} forwardedRef={ref} />
  );
});

export type MultiSelectChipRemoveProps = PartProps<'button', { index: number }>;

/** Removes its chip; its name comes from `labels.remove`. */
export const ChipRemove = forwardRef<HTMLButtonElement, MultiSelectChipRemoveProps>(
  function MultiSelectChipRemove(props, ref) {
    const multiSelect = useMultiSelectContext('ChipRemove');
    const { item, index } = useChipContext('ChipRemove');
    const ours = {
      ...multiSelect.getChipRemoveProps(item, index),
      children: (
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      ),
    };
    return <Part tag="button" state={{ index }} ours={ours} theirs={props} forwardedRef={ref} />;
  },
);

export type MultiSelectChipsOverflowProps = Omit<PartProps<'div', { count: number }>, 'children'> & {
  /** Text for the hidden chips, e.g. `(count) => \`+${count} more\``. */
  children: (count: number) => ReactNode;
};

/** Shown when chips don't fit on one line and focus is outside the component. */
export const ChipsOverflow = forwardRef<HTMLDivElement, MultiSelectChipsOverflowProps>(
  function MultiSelectChipsOverflow({ children, ...props }, ref) {
    const multiSelect = useMultiSelectContext('ChipsOverflow');
    const count = multiSelect.overflowCount;
    if (count === 0) return null;
    const ours = { ...multiSelect.getChipsOverflowProps(), children: children(count) };
    return <Part tag="div" state={{ count }} ours={ours} theirs={props} forwardedRef={ref} />;
  },
);
