import { createElement, forwardRef, useEffect, useRef, type ReactNode } from 'react';
import { Control } from '../combobox/Control';
import { mergeProps, Part, useMergedRefs, type PartProps } from '../shared';
import { Input } from '../shared/combobox/Field';
import { List, Option, Popup } from '../shared/combobox/Popup';
import { RootPart } from '../shared/combobox/Root';
import { Empty } from '../shared/combobox/Status';
import { useComboboxCore, type ComboboxCore } from '../shared/combobox/useComboboxCore';
import { useFilterBarContext } from './context';
import type { EnumFilterField, FilterIssue, FilterOperator } from './schema';
import type { FilterEditorProps } from './useFilterBar';

export interface FilterBarEditorState {
  type: string;
  invalid: boolean;
}

export type FilterBarEditorProps = Omit<PartProps<'div', FilterBarEditorState>, 'children'>;

/** The modal dialog with the value editor of the open chip's type. Rendered once, only while open. */
export const Editor = forwardRef<HTMLDivElement, FilterBarEditorProps>(function FilterBarEditor(props, ref) {
  const bar = useFilterBarContext('Editor');
  const mergedRef = useMergedRefs<HTMLDivElement>(bar.editorRef, ref);
  const chip = bar.openChip;
  const editorProps = bar.getEditorComponentProps();
  const Component = chip ? bar.editorFor(chip.field) : undefined;
  if (!chip || !editorProps || !Component) return null;
  const ours = { ...bar.getEditorProps(), children: createElement(Component, editorProps) };
  const state = { type: chip.field.type, invalid: editorProps.issue !== null };
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={mergedRef} />;
});

export type FilterBarEditorInputProps = Omit<PartProps<'input', { invalid: boolean }>, 'children'>;

/** Text input of an editor, named after the chip and described by the error while the value is invalid. */
export const EditorInput = forwardRef<HTMLInputElement, FilterBarEditorInputProps>(
  function FilterBarEditorInput(props, ref) {
    const bar = useFilterBarContext('EditorInput');
    const ours = bar.getEditorInputProps();
    return (
      <Part
        tag="input"
        state={{ invalid: ours['aria-invalid'] === true }}
        ours={ours}
        theirs={props}
        forwardedRef={ref}
      />
    );
  },
);

export type FilterBarEditorErrorProps = Omit<PartProps<'div', { issue: FilterIssue }>, 'children'> & {
  /** Visible error text. Default: the issue's English `message`; use `issue.code` for your own text. */
  children?: ((issue: FilterIssue) => ReactNode) | undefined;
};

/** Why the value can't be applied. Rendered only while it is invalid. */
export const EditorError = forwardRef<HTMLDivElement, FilterBarEditorErrorProps>(function FilterBarEditorError(
  { children, ...props },
  ref,
) {
  const bar = useFilterBarContext('EditorError');
  const issue = bar.getEditorComponentProps()?.issue;
  if (!issue) return null;
  const ours = { ...bar.getEditorErrorProps(), children: children ? children(issue) : issue.message };
  return <Part tag="div" state={{ issue }} ours={ours} theirs={props} forwardedRef={ref} />;
});

export type FilterBarEditorApplyProps = PartProps<'button', object>;

/** Applies the value, for pointer users; Enter does the same in the input. */
export const EditorApply = forwardRef<HTMLButtonElement, FilterBarEditorApplyProps>(function FilterBarEditorApply(
  { children, ...props },
  ref,
) {
  const bar = useFilterBarContext('EditorApply');
  const ours = { ...bar.getEditorApplyProps(), children: children ?? 'Apply' };
  return <Part tag="button" state={{}} ours={ours} theirs={props} forwardedRef={ref} />;
});

/**
 * Built-in editor of `text` fields: an input, the error and an Apply button.
 *
 * @experimental
 */
export function TextEditor(props: FilterEditorProps<string>) {
  const value = props.value ?? '';
  return (
    <>
      <EditorInput
        value={value}
        onChange={(event) => {
          props.onChange(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          props.onCommit(value);
        }}
      />
      <EditorError />
      <EditorApply
        onClick={() => {
          props.onCommit(value);
        }}
      />
    </>
  );
}

type AnyEnumField = EnumFilterField<string, 'enum' | 'multiEnum', unknown, readonly FilterOperator[]>;
const never = () => false;

/**
 * Built-in editor of `enum` fields: a search input over the options, which stay shown; picking one applies it.
 *
 * @experimental
 */
export function EnumEditor(props: FilterEditorProps<string>) {
  const bar = useFilterBarContext('EnumEditor');
  const field = props.field as AnyEnumField;
  const { itemToKey } = field;
  const isSelected = (item: unknown) => String(itemToKey(item)) === props.value;
  const core = useComboboxCore<unknown>(
    {
      id: `${bar.ids.editor}-options`,
      items: field.items,
      itemToKey,
      itemToString: field.itemToString,
      groupBy: field.groupBy,
      labels: { resultCount: bar.labels.resultCount },
    },
    {
      part: 'combobox',
      multiple: false,
      isSelected,
      isDisabled: never,
      displayValue: '',
      selectAll: false,
      creatable: false,
      createDisabled: false,
      allSelected: never,
      activate: (row) => {
        if (row.type === 'option') props.onCommit(String(itemToKey(row.item)));
      },
      selectOnTab: false,
      clearOnEscape: (query) => query !== null,
      onLeave: () => {},
      // The options are the editor, so they never close: Escape closes the dialog in one press and
      // Tab stays in the dialog.
      onInputKeyDown: (event) => {
        if (event.key === 'Escape' || event.key === 'Tab') return true;
        if (event.key === 'ArrowUp' && event.altKey) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
  );

  const { open, highlight, rows } = core;
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    open('none');
    const selected = rows.findIndex((row) => row.type === 'option' && isSelected(row.item));
    if (selected >= 0) highlight(selected);
  });

  const labelledBy = bar.getEditorInputProps()['aria-labelledby'];
  const named: ComboboxCore<unknown> = {
    ...core,
    getInputProps: () => mergeProps(core.getInputProps(), { 'aria-labelledby': labelledBy }),
    getListProps: () => mergeProps(core.getListProps(), { 'aria-labelledby': labelledBy }),
  };
  return (
    <RootPart core={named} partProps={{}} forwardedRef={null}>
      <Control>
        <Input />
      </Control>
      <Popup>
        <List>{(item: unknown) => <Option item={item}>{field.itemToString(item)}</Option>}</List>
        <Empty>No options</Empty>
      </Popup>
    </RootPart>
  );
}
