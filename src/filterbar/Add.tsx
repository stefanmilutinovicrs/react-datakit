import { forwardRef, type ReactNode } from 'react';
import { Control } from '../combobox/Control';
import { mergeProps, Part, type PartProps } from '../shared';
import { Input } from '../shared/combobox/Field';
import { List, Option, Popup } from '../shared/combobox/Popup';
import { RootPart } from '../shared/combobox/Root';
import { Empty } from '../shared/combobox/Status';
import { useComboboxCore, type ComboboxCore } from '../shared/combobox/useComboboxCore';
import { useFilterBarContext } from './context';
import type { AnyFilterField } from './schema';

export interface FilterBarAddState {
  open: boolean;
}

export type FilterBarAddProps = PartProps<'div', FilterBarAddState>;

const never = () => false;

/**
 * The field picker, a combobox grouped by the fields' `group`. Its children are `Combobox` parts; by default an
 * input, the list and an empty state.
 */
export const Add = forwardRef<HTMLDivElement, FilterBarAddProps>(function FilterBarAdd({ children, ...props }, ref) {
  const bar = useFilterBarContext('Add');
  const core = useComboboxCore<AnyFilterField>(
    {
      id: bar.ids.add,
      items: bar.availableFields,
      itemToKey: (field) => field.key,
      itemToString: (field) => field?.label ?? '',
      groupBy: (field) => field.group ?? null,
      labels: { resultCount: bar.labels.resultCount },
    },
    {
      part: 'combobox',
      multiple: false,
      isSelected: never,
      isDisabled: never,
      displayValue: '',
      selectAll: false,
      creatable: false,
      createDisabled: false,
      allSelected: never,
      activate: (row) => {
        if (row.type === 'option') bar.addFilter(row.item.key);
      },
      selectOnTab: false,
      clearOnEscape: (query) => query !== null,
      onLeave: () => {},
      onInputKeyDown: bar.onPickerKeyDown,
    },
  );

  // Without a Combobox.Label the list has no name, so both take `labels.addFilter`.
  const labelled = core.getListProps()['aria-labelledby'] !== undefined;
  const name = labelled ? {} : { 'aria-label': bar.labels.addFilter };
  const picker: ComboboxCore<AnyFilterField> = {
    ...core,
    getInputProps: () =>
      mergeProps(core.getInputProps(), {
        ...name,
        tabIndex: bar.tabIndexFor(core.ids.input),
        // Opening on focus would pop the list open after every added filter, when focus comes back here.
        onClick: () => {
          if (!core.isOpen) core.open();
        },
      }),
    getListProps: () => mergeProps(core.getListProps(), name),
  };

  const ours = {
    ...bar.getAddProps(),
    children: (
      <RootPart core={picker as unknown as ComboboxCore<unknown>} partProps={{}} forwardedRef={null}>
        {children ?? <DefaultPicker />}
      </RootPart>
    ),
  };
  return <Part tag="div" state={{ open: core.isOpen }} ours={ours} theirs={props} forwardedRef={ref} />;
});

function DefaultPicker(): ReactNode {
  return (
    <>
      <Control>
        <Input placeholder="Add filter…" />
      </Control>
      <Popup>
        <List>{(field: AnyFilterField) => <Option item={field}>{field.label}</Option>}</List>
        <Empty>No matching fields</Empty>
      </Popup>
    </>
  );
}
