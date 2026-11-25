import { forwardRef, type ReactNode, type Ref } from 'react';
import { useCoreContext } from '../shared/combobox/context';
import { List, useRowLayout, type ComboboxListProps } from '../shared/combobox/Popup';
import type { ComboboxRow } from '../shared/combobox/useComboboxCore';
import { Part, type PartProps } from '../shared';

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
export const SelectAll = forwardRef<HTMLDivElement, MultiSelectSelectAllProps>(
  function MultiSelectSelectAll(props, ref) {
    const { ours, state } = useActionRow('SelectAll', 'select-all');
    return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
  },
);

/** The "Create" row. Pass a function to `<MultiSelect.List create={(query) => …}>` to change its content. */
export const Create = forwardRef<HTMLDivElement, MultiSelectCreateProps>(function MultiSelectCreate(props, ref) {
  const { ours, state } = useActionRow('Create', 'create');
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});

export type MultiSelectListProps<TItem> = ComboboxListProps<TItem> & {
  /** Content of the "Select all" row, which `selectAll` on the root turns on; `null` renders the default content. */
  selectAll?: ReactNode;
  /** Content of the "Create" row for the typed text (enable the row with `onCreate` on the root). */
  create?: ((query: string) => ReactNode) | undefined;
};

export const MultiSelectList = forwardRef(function MultiSelectList<TItem>(
  { selectAll, create, ...props }: MultiSelectListProps<TItem>,
  ref: Ref<HTMLDivElement>,
) {
  const renderAction = (row: Exclude<ComboboxRow<TItem>, { type: 'option' }>) => {
    if (row.type === 'select-all') return selectAll ?? <SelectAll>Select all</SelectAll>;
    return create ? create(row.query) : <Create>{`Create “${row.query}”`}</Create>;
  };
  return <List {...props} renderAction={renderAction} ref={ref} />;
});
