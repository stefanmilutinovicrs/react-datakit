import { createElement, forwardRef, useRef, useState, type ReactNode } from 'react';
import { Control } from '../combobox/Control';
import { mergeProps, Part, useIsomorphicLayoutEffect, useMergedRefs, type PartProps } from '../shared';
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
  // A date chip opens the DateRangePicker of its value segment instead.
  if (!chip || !editorProps || !Component || Component === DateEditor) return null;
  const ours = { ...bar.getEditorProps(), children: createElement(Component, editorProps) };
  const state = { type: chip.field.type, invalid: editorProps.issue !== null };
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={mergedRef} />;
});

export type FilterBarEditorInputProps = Omit<PartProps<'input', { invalid: boolean }>, 'children'> & {
  /** 1 for the second input of a range. Default 0. */
  index?: 0 | 1 | undefined;
};

/** Text input of an editor, named after the chip and described by the error while the value is invalid. */
export const EditorInput = forwardRef<HTMLInputElement, FilterBarEditorInputProps>(function FilterBarEditorInput(
  { index, ...props },
  ref,
) {
  const bar = useFilterBarContext('EditorInput');
  const ours = bar.getEditorInputProps(index);
  return (
    <Part
      tag="input"
      state={{ invalid: ours['aria-invalid'] === true }}
      ours={ours}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

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

/**
 * Built-in editor of `number` fields: one input, or two for a range. A comma or a dot is the decimal separator.
 *
 * @experimental
 */
export function NumberEditor(props: FilterEditorProps<number | readonly [number, number]>) {
  const range = (props.operator.arity ?? 'single') === 'range';
  const initial: readonly (number | undefined)[] =
    props.value === undefined ? [] : typeof props.value === 'number' ? [props.value] : props.value;
  const [texts, setTexts] = useState(() => [0, 1].map((i) => (initial[i] === undefined ? '' : String(initial[i]))));
  // Text that isn't a number becomes NaN, which validation reports as "Enter a number".
  const parse = (text: string) => {
    const value = props.field.parseValue(text.trim().replace(',', '.'));
    return typeof value === 'number' ? value : Number.NaN;
  };
  const valueOf = (next: readonly string[]): number | readonly [number, number] =>
    range ? [parse(next[0] ?? ''), parse(next[1] ?? '')] : parse(next[0] ?? '');
  const commit = () => props.onCommit(valueOf(texts));
  const input = (index: 0 | 1) => (
    <EditorInput
      index={index}
      inputMode="decimal"
      value={texts[index] ?? ''}
      onChange={(event) => {
        const next = texts.map((text, i) => (i === index ? event.currentTarget.value : text));
        setTexts(next);
        const value = valueOf(next);
        const parsed = typeof value === 'number' ? [value] : value;
        props.onChange(parsed.every(Number.isFinite) ? value : undefined);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        commit();
      }}
    />
  );
  return (
    <>
      {input(0)}
      {range ? (
        <>
          <span aria-hidden="true">–</span>
          {input(1)}
        </>
      ) : null}
      <EditorError />
      <EditorApply onClick={commit} />
    </>
  );
}

/**
 * Built-in editor of `date` fields. It renders nothing: the chip's value segment is the trigger of a
 * DateRangePicker, which is the editor.
 *
 * @experimental
 */
export function DateEditor(): null {
  return null;
}

type AnyEnumField = EnumFilterField<string, 'enum' | 'multiEnum', unknown, readonly FilterOperator[]>;
const never = () => false;

interface OptionsBehavior {
  multiple: boolean;
  isSelected: (key: string) => boolean;
  /** Picks or toggles an option by its key. */
  choose: (key: string) => void;
  /** Enter while no option is highlighted. */
  onEnterWithoutOption?: (() => void) | undefined;
  /** Highlight the first selected option when the editor opens. */
  highlightSelected: boolean;
}

/** The shown options of an enum editor, on the combobox core, named after the editor. */
function useEditorOptions(props: FilterEditorProps<never>, behavior: OptionsBehavior): ComboboxCore<unknown> {
  const bar = useFilterBarContext('Editor');
  const field = props.field as AnyEnumField;
  const { itemToKey } = field;
  const keyOf = (item: unknown) => String(itemToKey(item));
  const isSelected = (item: unknown) => behavior.isSelected(keyOf(item));
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
      part: behavior.multiple ? 'multiselect' : 'combobox',
      multiple: behavior.multiple,
      isSelected,
      isDisabled: never,
      displayValue: '',
      selectAll: false,
      creatable: false,
      createDisabled: false,
      allSelected: never,
      activate: (row) => {
        if (row.type === 'option') behavior.choose(keyOf(row.item));
      },
      selectOnTab: false,
      clearOnEscape: (query) => query !== null,
      onLeave: () => {},
      // The options are the editor, so they are open from the first render and never close: Escape
      // closes the dialog in one press and Tab stays in the dialog.
      initiallyOpen: true,
      onInputKeyDown: (event) => {
        if (event.key === 'Escape' || event.key === 'Tab') return true;
        if (event.key === 'ArrowUp' && event.altKey) {
          event.preventDefault();
          return true;
        }
        if (event.key === 'Enter' && behavior.onEnterWithoutOption && core.highlightedIndex < 0) {
          event.preventDefault();
          behavior.onEnterWithoutOption();
          return true;
        }
        return false;
      },
    },
  );

  // Before the first paint, so the dialog never shows the options without the current value.
  const { highlight, rows } = core;
  const highlighted = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (highlighted.current) return;
    highlighted.current = true;
    const selected = rows.findIndex((row) => row.type === 'option' && isSelected(row.item));
    if (behavior.highlightSelected && selected >= 0) highlight(selected);
  });

  const labelledBy = bar.getEditorInputProps()['aria-labelledby'];
  return {
    ...core,
    getInputProps: () => mergeProps(core.getInputProps(), { 'aria-labelledby': labelledBy }),
    getListProps: () => mergeProps(core.getListProps(), { 'aria-labelledby': labelledBy }),
  };
}

function Options({
  core,
  field,
  children,
}: {
  core: ComboboxCore<unknown>;
  field: AnyEnumField;
  children?: ReactNode;
}) {
  return (
    <RootPart core={core} partProps={{}} forwardedRef={null}>
      <Control>
        <Input />
      </Control>
      <Popup>
        <List>{(item: unknown) => <Option item={item}>{field.itemToString(item)}</Option>}</List>
        <Empty>No options</Empty>
      </Popup>
      {children}
    </RootPart>
  );
}

/**
 * Built-in editor of `enum` fields: a search input over the options, which stay shown; picking one applies it.
 *
 * @experimental
 */
export function EnumEditor(props: FilterEditorProps<string>) {
  const core = useEditorOptions(props as FilterEditorProps<never>, {
    multiple: false,
    isSelected: (key) => key === props.value,
    choose: (key) => props.onCommit(key),
    highlightSelected: true,
  });
  return <Options core={core} field={props.field as AnyEnumField} />;
}

/**
 * Built-in editor of `multiEnum` fields: options with checkboxes that stay shown. Apply, Enter while no option is
 * highlighted, or a click outside applies them; Escape cancels.
 *
 * @experimental
 */
export function MultiEnumEditor(props: FilterEditorProps<readonly string[]>) {
  const keys = props.value ?? [];
  const commit = () => props.onCommit(keys);
  const core = useEditorOptions(props as FilterEditorProps<never>, {
    multiple: true,
    isSelected: (key) => keys.includes(key),
    choose: (key) => {
      props.onChange(keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]);
    },
    onEnterWithoutOption: commit,
    highlightSelected: false,
  });
  // Apply sits inside the combobox root, so focus moving to it doesn't close the options.
  return (
    <Options core={core} field={props.field as AnyEnumField}>
      <EditorError />
      <EditorApply onClick={commit} />
    </Options>
  );
}
