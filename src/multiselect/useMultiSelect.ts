import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { useComboboxCore, type ComboboxBaseOptions, type ComboboxCore } from '../shared/combobox/useComboboxCore';
import { useControllableState, useIsomorphicLayoutEffect, type DataAttributes } from '../shared';

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
}

export interface UseMultiSelectReturn<TItem> extends ComboboxCore<TItem> {
  selectedItems: readonly TItem[];
  isAtMax: boolean;
  toggleItem: (item: TItem) => void;
  removeItem: (item: TItem) => void;
  clear: () => void;
  /** Index of the first chip that does not fit, or -1 when all fit. Set by the Chips part. */
  overflowIndex: number;
  setOverflowIndex: (index: number) => void;
  /** Number of chips hidden behind the overflow indicator. */
  overflowCount: number;
  focusChip: (index: number) => void;
  focusInput: () => void;

  getControlProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getChipsProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getChipProps: (item: TItem, index: number) => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getChipRemoveProps: (item: TItem, index: number) => ButtonHTMLAttributes<HTMLButtonElement> & DataAttributes;
}

const EMPTY: readonly never[] = [];

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
  const [overflowIndex, setOverflowIndex] = useState(-1);
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

  // Chips that fit; the hidden ones are skipped by keyboard navigation.
  const visibleCount = overflowIndex >= 0 ? overflowIndex : selectedItems.length;

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
        if (last !== undefined) remove([last]);
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

  const { ids, inputRef, close } = core;
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

  const overflowCount = overflowIndex >= 0 ? Math.max(0, selectedItems.length - overflowIndex) : 0;

  return {
    ...core,
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
    focusChip,
    focusInput,

    getControlProps: () => ({
      'data-dk-part': 'multiselect-control',
      'data-state': core.isOpen ? 'open' : 'closed',
      // A click on the empty area of the field focuses the input.
      onMouseDown: (event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        focusInput();
      },
    }),
    getChipsProps: () => ({
      role: selectedItems.length > 0 ? 'list' : undefined,
      'aria-label': selectedItems.length > 0 ? 'Selected' : undefined,
      'data-dk-part': 'multiselect-chips',
    }),
    getChipProps: (item, index) => {
      const overflowing = overflowIndex >= 0 && index >= overflowIndex;
      return {
        id: chipId(index),
        role: 'listitem',
        tabIndex: -1,
        onKeyDown: onChipKeyDown(index),
        onFocus: close,
        'data-dk-part': 'multiselect-chip',
        'data-overflow': overflowing ? '' : undefined,
        'data-key': String(itemToKey(item)),
      };
    },
    getChipRemoveProps: (item, index) => ({
      type: 'button',
      tabIndex: -1,
      'aria-label': `Remove ${itemToString(item)}`,
      onClick: () => {
        removeChip(index);
        pendingFocus.current = { type: 'input' };
      },
      'data-dk-part': 'multiselect-chip-remove',
    }),
  };
}
