import { forwardRef, type ReactElement, type ReactNode, type Ref } from 'react';
import { splitProps, type PartProps, type WithRef } from '../shared';
import { Input, Label } from '../shared/combobox/Field';
import { List, Option, Popup, type ComboboxListProps, type ComboboxOptionProps } from '../shared/combobox/Popup';
import { RootPart, type ComboboxRootState } from '../shared/combobox/Root';
import { Empty, ErrorPart, Loading } from '../shared/combobox/Status';
import type { ComboboxCore } from '../shared/combobox/useComboboxCore';
import { Control, Count } from './Control';
import { comboboxOptionKeys, useCombobox, type UseComboboxOptions } from './useCombobox';

export type ComboboxProps<TItem> = UseComboboxOptions<TItem> &
  Omit<PartProps<'div', ComboboxRootState>, 'onChange' | 'defaultValue' | 'children' | 'id'> & {
    children: ReactNode;
  };

const ComboboxRoot = forwardRef(function Combobox<TItem>(
  { children, ...props }: ComboboxProps<TItem>,
  ref: Ref<HTMLDivElement>,
) {
  const [options, partProps] = splitProps(props, comboboxOptionKeys);
  const combobox = useCombobox<TItem>(options);
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
    Control,
    Input,
    Popup,
    List: List as <TItem>(props: WithRef<ComboboxListProps<TItem>, HTMLDivElement>) => ReactElement | null,
    Option: Option as <TItem>(props: WithRef<ComboboxOptionProps<TItem>, HTMLDivElement>) => ReactElement,
    Empty,
    Loading,
    Error: ErrorPart,
    Count,
  },
);
