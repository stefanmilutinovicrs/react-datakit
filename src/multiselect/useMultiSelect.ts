import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
import {
  comboboxBaseOptionKeys,
  useComboboxCore,
  type ComboboxBaseOptions,
  type ComboboxCore,
} from '../shared/combobox/useComboboxCore';
import {
  multiselectParts,
  optionKeys,
  useControllableState,
  useIsomorphicLayoutEffect,
  type DataAttributes,
} from '../shared';

export interface UseMultiSelectOptions<TItem> extends ComboboxBaseOptions<TItem> {
  value?: readonly TItem[] | undefined;
  defaultValue?: readonly TItem[] | undefined;
  onChange?: ((value: readonly TItem[]) => void) | undefined;
  /** Most values that can be selected. Unselected options are disabled once it is reached. */
  max?: number | undefined;
  /** Adds a "Select all" row that selects (or deselects) every option matching the query. */
  selectAll?: boolean | undefined;
  /** Adds a "Create" row when no option matches the typed text exactly; return the new item or a promise of it. */
  onCreate?: ((query: string) => TItem | Promise<TItem>) | undefined;
  /** Texts for screen readers; English by default. */
  labels?: Partial<MultiSelectLabels> | undefined;
}

export interface MultiSelectLabels {
  /** Name of the list of chips. */
  selected: string;
  /** Name of a chip's remove button. */
  remove: (item: string) => string;
  /** Announced when a chip is removed. */
  removed: (item: string) => string;
}

const defaultLabels: MultiSelectLabels = {
  selected: 'Selected',
  remove: (item) => `Remove ${item}`,
  removed: (item) => `${item} removed`,
};

export const multiSelectOptionKeys = optionKeys<UseMultiSelectOptions<unknown>>()([
  ...comboboxBaseOptionKeys,
  'value',
  'defaultValue',
  'onChange',
  'max',
  'selectAll',
  'onCreate',
  'labels',
]);

export interface UseMultiSelectReturn<TItem> extends ComboboxCore<TItem> {
  selectedItems: readonly TItem[];
  isAtMax: boolean;
  toggleItem: (item: TItem) => void;
  removeItem: (item: TItem) => void;
  clear: () => void;
  /** Index of the first chip that does not fit, or -1 when all fit. Set by the Chips part. */
  overflowIndex: number;
  setOverflowIndex: (index: number) => void;
  overflowCount: number;
  /** Focus is somewhere in the component, so every chip is shown and chips wrap. */
  expanded: boolean;
  focusChip: (index: number) => void;
  focusInput: () => void;

  getControlProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getChipsProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getChipsOverflowProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getChipProps: (item: TItem, index: number) => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getChipRemoveProps: (item: TItem, index: number) => ButtonHTMLAttributes<HTMLButtonElement> & DataAttributes;
}

const EMPTY: readonly never[] = [];
const NO_BREAK_SPACE = String.fromCharCode(160);

type FocusTarget = { type: 'chip'; index: number } | { type: 'input' };

/**
 * Headless multi-select on the combobox core, where picking an option toggles it and keeps the list open.
 *
 * @experimental
 */
export function useMultiSelect<TItem>(options: UseMultiSelectOptions<TItem>): UseMultiSelectReturn<TItem> {
  const { itemToKey, itemToString, max, onCreate } = options;
  const [selectedItems, setSelectedItems] = useControllableState<readonly TItem[]>({
    value: options.value,
    defaultValue: options.defaultValue ?? EMPTY,
    onChange: options.onChange,
  });
  const labels = { ...defaultLabels, ...options.labels };
  const [overflowIndex, setOverflowIndex] = useState(-1);
  const [expanded, setExpanded] = useState(false);
  const [announcement, setAnnouncement] = useState<{ text: string; count: number; during: string } | null>(null);
  const pointerInside = useRef(false);
  const pendingFocus = useRef<FocusTarget | null>(null);

  const selectedKeys = useMemo(() => new Set(selectedItems.map(itemToKey)), [selectedItems, itemToKey]);
  const isAtMax = max !== undefined && selectedItems.length >= max;
  const isSelected = useCallback((item: TItem) => selectedKeys.has(itemToKey(item)), [selectedKeys, itemToKey]);
  const isDisabled = useCallback((item: TItem) => isAtMax && !isSelected(item), [isAtMax, isSelected]);

  const add = (toAdd: readonly TItem[]) => {
    setSelectedItems((prev) => {
      const keys = new Set(prev.map(itemToKey));
      const next = [...prev];
      for (const item of toAdd) {
        if (max !== undefined && next.length >= max) break;
        if (!keys.has(itemToKey(item))) {
          keys.add(itemToKey(item));
          next.push(item);
        }
      }
      return next.length === prev.length ? prev : next;
    });
  };

  const remove = (toRemove: readonly TItem[]) => {
    const keys = new Set(toRemove.map(itemToKey));
    setSelectedItems((prev) => prev.filter((item) => !keys.has(itemToKey(item))));
  };

  const toggleItem = (item: TItem) => {
    if (isSelected(item)) remove([item]);
    else add([item]);
  };

  const allSelected = (items: readonly TItem[]) => items.length > 0 && items.every(isSelected);

  const visibleCount = !expanded && overflowIndex >= 0 ? overflowIndex : selectedItems.length;

  const core = useComboboxCore<TItem>(options, {
    part: 'multiselect',
    multiple: true,
    isSelected,
    isDisabled,
    displayValue: '',
    selectAll: options.selectAll ?? false,
    creatable: onCreate !== undefined,
    createDisabled: isAtMax,
    allSelected,
    activate: (row, items) => {
      if (row.type === 'option') toggleItem(row.item);
      else if (row.type === 'select-all') {
        if (allSelected(items)) remove(items);
        else add(items);
      } else if (onCreate) {
        const created = onCreate(row.query);
        if (created instanceof Promise)
          void created.then((item) => {
            add([item]);
          });
        else add([created]);
      }
    },
    selectOnTab: false,
    clearOnEscape: (query) => query !== null,
    onLeave: () => {},
    onInputKeyDown: (event, query) => {
      const input = event.currentTarget;
      const caretAtStart = input.selectionStart === 0 && input.selectionEnd === 0;
      if (event.key === 'Backspace' && !query && selectedItems.length > 0) {
        event.preventDefault();
        const last = selectedItems[selectedItems.length - 1];
        if (last !== undefined) {
          remove([last]);
          announceRemoved(last);
        }
        return true;
      }
      if (event.key === 'ArrowLeft' && caretAtStart && visibleCount > 0) {
        event.preventDefault();
        focusChip(visibleCount - 1);
        return true;
      }
      return false;
    },
  });

  const { ids, inputRef, close, rootRef, statusMessage } = core;

  const announceRemoved = (item: TItem) => {
    setAnnouncement((prev) => ({
      text: labels.removed(itemToString(item)),
      count: (prev?.count ?? 0) + 1,
      during: statusMessage,
    }));
  };

  // A click on a part that takes no focus (or prevents it) moves focus to the body without leaving
  // the component; only a press outside collapses the chips then.
  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root || (event.target instanceof Node && root.contains(event.target))) return;
      if (!root.contains(document.activeElement)) setExpanded(false);
    };
    const onPointerUp = () => {
      pointerInside.current = false;
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [expanded, rootRef]);
  const chipId = useCallback((index: number) => `${ids.root}-chip-${index}`, [ids.root]);

  const focusChip = (index: number) => {
    document.getElementById(chipId(index))?.focus();
  };
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  // Focus that has to wait for the next render (after a chip is removed).
  useIsomorphicLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target.type === 'input') inputRef.current?.focus();
    else document.getElementById(chipId(target.index))?.focus();
  });

  const removeChip = (index: number) => {
    const item = selectedItems[index];
    if (item === undefined) return;
    remove([item]);
    announceRemoved(item);
    const remaining = selectedItems.length - 1;
    if (index > 0) pendingFocus.current = { type: 'chip', index: index - 1 };
    else if (remaining > 0) pendingFocus.current = { type: 'chip', index: 0 };
    else pendingFocus.current = { type: 'input' };
  };

  const onChipKeyDown = (index: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (index > 0) focusChip(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (index + 1 < visibleCount) focusChip(index + 1);
        else focusInput();
        break;
      case 'Home':
        event.preventDefault();
        focusChip(0);
        break;
      case 'End':
      case 'Escape':
        event.preventDefault();
        focusInput();
        break;
      case 'Backspace':
      case 'Delete':
        event.preventDefault();
        removeChip(index);
        break;
    }
  };

  const overflowCount = !expanded && overflowIndex >= 0 ? Math.max(0, selectedItems.length - overflowIndex) : 0;
  const rootProps = core.getRootProps();

  return {
    ...core,
    // A repeated text must change the region's content to be announced again, so every other
    // announcement ends with a no-break space.
    // The result count takes the live region back once the results change.
    statusMessage:
      announcement?.during === statusMessage
        ? announcement.text + (announcement.count % 2 === 0 ? NO_BREAK_SPACE : '')
        : statusMessage,
    getRootProps: () => ({
      ...rootProps,
      onFocus: () => {
        setExpanded(true);
      },
      onBlur: (event: FocusEvent<HTMLDivElement>) => {
        rootProps.onBlur?.(event);
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        if (next === null && pointerInside.current) return;
        setExpanded(false);
      },
      onPointerDown: () => {
        pointerInside.current = true;
      },
    }),
    selectedItems,
    isAtMax,
    toggleItem,
    removeItem: (item) => {
      remove([item]);
    },
    clear: () => {
      setSelectedItems(EMPTY);
    },
    overflowIndex,
    setOverflowIndex,
    overflowCount,
    expanded,
    focusChip,
    focusInput,

    getControlProps: () => ({
      'data-dk-part': multiselectParts.control,
      'data-state': core.isOpen ? 'open' : 'closed',
      'data-expanded': expanded ? '' : undefined,
      // A click on the empty area of the field focuses the input.
      onMouseDown: (event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        focusInput();
      },
    }),
    getChipsProps: () => ({
      role: selectedItems.length > 0 ? 'list' : undefined,
      'aria-label': selectedItems.length > 0 ? labels.selected : undefined,
      'data-dk-part': multiselectParts.chips,
      'data-expanded': expanded ? '' : undefined,
    }),
    // The chips themselves stay in the accessibility tree, so the count would be read twice.
    getChipsOverflowProps: () => ({ 'aria-hidden': true, 'data-dk-part': multiselectParts.chipsOverflow }),
    getChipProps: (item, index) => {
      const overflowing = !expanded && overflowIndex >= 0 && index >= overflowIndex;
      return {
        id: chipId(index),
        role: 'listitem',
        tabIndex: -1,
        onKeyDown: onChipKeyDown(index),
        onFocus: close,
        'data-dk-part': multiselectParts.chip,
        'data-overflow': overflowing ? '' : undefined,
        'data-key': String(itemToKey(item)),
      };
    },
    getChipRemoveProps: (item, index) => ({
      type: 'button',
      tabIndex: -1,
      'aria-label': labels.remove(itemToString(item)),
      onClick: () => {
        removeChip(index);
        pendingFocus.current = { type: 'input' };
      },
      'data-dk-part': multiselectParts.chipRemove,
    }),
  };
}
