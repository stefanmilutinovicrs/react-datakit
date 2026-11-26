import { useCallback, type HTMLAttributes } from 'react';
import { comboboxParts, optionKeys, useControllableState, type DataAttributes } from '../shared';
import {
  comboboxBaseOptionKeys,
  useComboboxCore,
  type ComboboxBaseOptions,
  type ComboboxCore,
} from '../shared/combobox/useComboboxCore';

export interface UseComboboxOptions<TItem> extends ComboboxBaseOptions<TItem> {
  value?: TItem | null | undefined;
  defaultValue?: TItem | null | undefined;
  onChange?: ((value: NoInfer<TItem> | null) => void) | undefined;
  /** Tab selects the highlighted option before focus moves on. Default false. */
  selectOnTab?: boolean | undefined;
}

export const comboboxOptionKeys = optionKeys<UseComboboxOptions<unknown>>()([
  ...comboboxBaseOptionKeys,
  'value',
  'defaultValue',
  'onChange',
  'selectOnTab',
]);

export interface UseComboboxReturn<TItem> extends ComboboxCore<TItem> {
  selectedItem: TItem | null;
  selectItem: (item: TItem) => void;
  /** Clears the value and the typed text. */
  clear: () => void;

  getCountProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
}

const never = () => false;

/**
 * Headless combobox (WAI-ARIA APG, listbox popup) that keeps DOM focus in the input and exposes the highlighted option with `aria-activedescendant`.
 *
 * @experimental
 */
export function useCombobox<TItem>(options: UseComboboxOptions<TItem>): UseComboboxReturn<TItem> {
  const { itemToKey, itemToString } = options;
  const [selectedItem, setSelectedItem] = useControllableState<TItem | null>({
    value: options.value,
    defaultValue: options.defaultValue ?? null,
    onChange: options.onChange,
  });

  const isSelected = useCallback(
    (item: TItem) => selectedItem !== null && itemToKey(selectedItem) === itemToKey(item),
    [selectedItem, itemToKey],
  );

  const core = useComboboxCore<TItem>(options, {
    part: 'combobox',
    multiple: false,
    isSelected,
    isDisabled: never,
    displayValue: itemToString(selectedItem),
    selectAll: false,
    creatable: false,
    createDisabled: false,
    allSelected: never,
    activate: (row) => {
      if (row.type === 'option') setSelectedItem(row.item);
    },
    selectOnTab: options.selectOnTab ?? false,
    clearOnEscape: (query) => {
      if (query === null && selectedItem === null) return false;
      setSelectedItem(null);
      return true;
    },
    // Leaving with an emptied input clears the value; any other unfinished typing is discarded.
    onLeave: (query) => {
      if (query === '') setSelectedItem(null);
    },
  });

  const { setQuery, close } = core;
  return {
    ...core,
    selectedItem,
    selectItem: (item) => {
      setSelectedItem(item);
      setQuery(null);
      close();
    },
    clear: () => {
      setSelectedItem(null);
      setQuery(null);
    },
    // The live region already announces the count.
    getCountProps: () => ({ 'aria-hidden': true, 'data-dk-part': comboboxParts.count }),
  };
}
