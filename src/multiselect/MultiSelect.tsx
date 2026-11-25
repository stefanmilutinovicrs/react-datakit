import { forwardRef, type ReactElement, type ReactNode, type Ref } from 'react';
import { Input, Label } from '../shared/combobox/Field';
import { Option, Popup, type ComboboxOptionProps } from '../shared/combobox/Popup';
import { RootPart, type ComboboxRootState } from '../shared/combobox/Root';
import { Empty, ErrorPart, Loading } from '../shared/combobox/Status';
import type { ComboboxCore } from '../shared/combobox/useComboboxCore';
import { splitProps, type PartProps, type WithRef } from '../shared';
import { Chip, ChipRemove, Chips, ChipsOverflow, Control, type MultiSelectChipsProps } from './Chips';
import { MultiSelectContext } from './context';
import { Create, MultiSelectList, SelectAll, type MultiSelectListProps } from './List';
import {
  multiSelectOptionKeys,
  useMultiSelect,
  type UseMultiSelectOptions,
  type UseMultiSelectReturn,
} from './useMultiSelect';

export type MultiSelectRootState = ComboboxRootState;

export type MultiSelectProps<TItem> = UseMultiSelectOptions<TItem> &
  Omit<PartProps<'div', MultiSelectRootState>, 'onChange' | 'defaultValue' | 'children' | 'id'> & {
    children: ReactNode;
  };

const MultiSelectRoot = forwardRef(function MultiSelect<TItem>(
  { children, ...props }: MultiSelectProps<TItem>,
  ref: Ref<HTMLDivElement>,
) {
  const [options, partProps] = splitProps(props, multiSelectOptionKeys);
  const multiSelect = useMultiSelect<TItem>(options);
  return (
    <MultiSelectContext.Provider value={multiSelect as unknown as UseMultiSelectReturn<unknown>}>
      <RootPart core={multiSelect as unknown as ComboboxCore<unknown>} partProps={partProps} forwardedRef={ref}>
        {children}
      </RootPart>
    </MultiSelectContext.Provider>
  );
});

/**
 * Pick several values from a long or remote list; selected values are shown as removable chips.
 *
 * @experimental
 */
export const MultiSelect = Object.assign(
  MultiSelectRoot as <TItem>(props: WithRef<MultiSelectProps<TItem>, HTMLDivElement>) => ReactElement,
  {
    Label,
    Control,
    Chips: Chips as <TItem>(props: WithRef<MultiSelectChipsProps<TItem>, HTMLDivElement>) => ReactElement,
    Chip,
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
