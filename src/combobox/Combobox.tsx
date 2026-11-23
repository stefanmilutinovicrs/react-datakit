import { forwardRef, type ReactElement, type ReactNode, type Ref } from 'react';
import type { PartProps, WithRef } from '../shared';
import { Input, Label } from '../shared/combobox/Field';
import { List, Option, Popup, type ComboboxListProps, type ComboboxOptionProps } from '../shared/combobox/Popup';
import { RootPart, type ComboboxRootState } from '../shared/combobox/Root';
import { Empty, ErrorPart, Loading } from '../shared/combobox/Status';
import type { ComboboxCore } from '../shared/combobox/useComboboxCore';
import { useCombobox, type UseComboboxOptions } from './useCombobox';

export type ComboboxProps<TItem> = UseComboboxOptions<TItem> &
  Omit<PartProps<'div', ComboboxRootState>, 'onChange' | 'defaultValue' | 'children' | 'id'> & {
    children: ReactNode;
  };

const ComboboxRoot = forwardRef(function Combobox<TItem>(props: ComboboxProps<TItem>, ref: Ref<HTMLDivElement>) {
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
    selectOnTab,
    formatResultCount,
    children,
    ...partProps
  } = props;
  const combobox = useCombobox<TItem>({
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
    selectOnTab,
    formatResultCount,
  });
  return (
    <RootPart core={combobox as unknown as ComboboxCore<unknown>} partProps={partProps} forwardedRef={ref}>
      {children}
    </RootPart>
  );
});

/**
 * Searchable select for large or remote option lists.
 *
 * @experimental
 */
export const Combobox = Object.assign(
  ComboboxRoot as <TItem>(props: WithRef<ComboboxProps<TItem>, HTMLDivElement>) => ReactElement,
  {
    Label,
    Input,
    Popup,
    List: List as <TItem>(props: WithRef<ComboboxListProps<TItem>, HTMLDivElement>) => ReactElement | null,
    Option: Option as <TItem>(props: WithRef<ComboboxOptionProps<TItem>, HTMLDivElement>) => ReactElement,
    Empty,
    Loading,
    Error: ErrorPart,
  },
);
