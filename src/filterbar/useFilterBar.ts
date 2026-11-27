import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentType,
  type FocusEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import {
  announcementText,
  filterbarParts,
  isDev,
  optionKeys,
  trapTab,
  useControllableState,
  useId,
  useIsomorphicLayoutEffect,
  useOutsidePointerDown,
  type DataAttributes,
} from '../shared';
import { defaultComboboxLabels, type ComboboxLabels } from '../shared/combobox/useComboboxCore';
import { EnumEditor, TextEditor } from './Editor';
import {
  formatFilterValue,
  validateFilter,
  type AnyFilterField,
  type Filter,
  type FilterIssue,
  type FilterOperator,
  type UntypedFilter,
} from './schema';

export interface FilterBarLabels extends ComboboxLabels {
  /** Name of the toolbar. */
  toolbar: string;
  /** Name of the field picker when it has no visible label. */
  addFilter: string;
  /** Name of a chip, from its visible field, operator and value texts. */
  summary: (field: string, operator: string, value: string) => string;
  /** Name of a chip's remove button. */
  remove: (summary: string) => string;
  /** Announced when a filter is added. */
  added: (summary: string) => string;
  /** Announced when a filter's operator or value changes. */
  updated: (summary: string) => string;
  /** Announced when a filter is removed. */
  removed: (summary: string) => string;
  /** Announced when all filters are cleared. */
  cleared: string;
}

export const defaultFilterBarLabels: FilterBarLabels = {
  ...defaultComboboxLabels,
  toolbar: 'Filters',
  addFilter: 'Add filter',
  summary: (field, operator, value) => [field, operator, value].filter(Boolean).join(' '),
  remove: (summary) => `Remove filter ${summary}`,
  added: (summary) => `Filter added: ${summary}`,
  updated: (summary) => `Filter changed: ${summary}`,
  removed: (summary) => `Filter removed: ${summary}`,
  cleared: 'All filters cleared',
};

/**
 * Props of a value editor. `value` has the shape the operator takes: one value, a `[from, to]` pair or a list.
 *
 * @experimental
 */
export interface FilterEditorProps<TValue> {
  field: AnyFilterField;
  operator: FilterOperator;
  /** The value being edited; `undefined` for a new filter. */
  value: TValue | undefined;
  /** Set when the last commit was not valid. */
  issue: FilterIssue | null;
  locale: string | undefined;
  /** Keeps a value that is not committed yet; a click outside the editor commits it when it is valid. */
  onChange(value: TValue | undefined): void;
  /** Validates and applies the value, and closes the editor; returns the issue when it is not valid. */
  onCommit(value: TValue): FilterIssue | null;
  onCancel(): void;
}

/** A value editor for one field type. */
export type FilterEditor = ComponentType<FilterEditorProps<never>>;

/** Value editors by field `type`, used before the built-in ones. */
export type FilterEditors = Readonly<Partial<Record<string, FilterEditor>>>;

const builtInEditors: FilterEditors = { text: TextEditor, enum: EnumEditor };

export interface UseFilterBarOptions<TFields extends readonly AnyFilterField[]> {
  /** Base id for the parts. Generated when omitted. */
  id?: string | undefined;
  fields: TFields;
  /** Holds only complete, valid filters; a chip that is being added is not in it. */
  value?: readonly Filter<TFields>[] | undefined;
  defaultValue?: readonly Filter<TFields>[] | undefined;
  onChange?: ((value: readonly Filter<NoInfer<TFields>>[]) => void) | undefined;
  /** Value editors by field `type`; fields of a type without one are shown read-only. */
  editors?: FilterEditors | undefined;
  /** BCP 47 locale for values on the chips. Default: the runtime's locale. */
  locale?: string | undefined;
  /** Screen reader texts; English by default. */
  labels?: Partial<FilterBarLabels> | undefined;
}

export const filterBarOptionKeys = optionKeys<UseFilterBarOptions<readonly AnyFilterField[]>>()([
  'id',
  'fields',
  'value',
  'defaultValue',
  'onChange',
  'editors',
  'locale',
  'labels',
]);

export type FilterBarPopup = 'operator' | 'value';

/**
 * One chip: an applied filter, or a filter that waits for its value.
 *
 * @experimental
 */
export interface FilterBarChip<TFields extends readonly AnyFilterField[] = readonly AnyFilterField[]> {
  index: number;
  field: TFields[number];
  operator: FilterOperator;
  /** The applied filter; `null` while the chip is being added. */
  filter: Filter<TFields> | null;
  /** Being added, or waiting for a value after an operator change. */
  draft: boolean;
  open: FilterBarPopup | null;
  /** No editor exists for the field's type. */
  readOnly: boolean;
  /** Visible value text; empty while there is no value. */
  valueText: string;
  /** Accessible name of the chip, from `labels.summary`. */
  summary: string;
}

type Props = DataAttributes & Record<string, unknown>;

export interface UseFilterBarReturn<TFields extends readonly AnyFilterField[]> {
  fields: TFields;
  filters: readonly Filter<TFields>[];
  chips: readonly FilterBarChip<TFields>[];
  /** Fields the picker offers: the ones with an editor, or whose default operator takes no value. */
  availableFields: readonly TFields[number][];
  open: { index: number; kind: FilterBarPopup } | null;
  /** The chip whose menu or editor is open. */
  openChip: FilterBarChip<TFields> | null;
  labels: FilterBarLabels;
  locale: string | undefined;
  /** Live region text. */
  announcement: string;
  ids: { root: string; add: string; addInput: string; editor: string; menu: string };
  rootRef: RefObject<HTMLDivElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  editorRef: RefObject<HTMLDivElement | null>;

  editorFor: (field: AnyFilterField) => FilterEditor | undefined;
  addFilter: (fieldKey: string) => void;
  removeFilter: (index: number) => void;
  clear: () => void;
  openOperatorMenu: (index: number, focus?: 'checked' | 'last') => void;
  selectOperator: (index: number, opKey: string) => void;
  openEditor: (index: number) => void;
  /** Closes the menu or the editor; a draft chip is dropped. */
  close: (options?: { restoreFocus?: boolean }) => void;
  /** Tabindex of a toolbar item: 0 for the one that holds the Tab stop. */
  tabIndexFor: (id: string) => 0 | -1;
  /** Keys the picker input shares with the toolbar: Backspace and ArrowLeft. Returns true when handled. */
  onPickerKeyDown: (event: KeyboardEvent<HTMLInputElement>, query: string | null) => boolean;
  getEditorComponentProps: () => FilterEditorProps<never> | null;

  getRootProps: () => Props;
  getChipsProps: () => Props;
  getChipProps: (chip: FilterBarChip<TFields>) => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getFieldProps: (chip: FilterBarChip<TFields>) => HTMLAttributes<HTMLSpanElement> & DataAttributes;
  getOperatorProps: (chip: FilterBarChip<TFields>) => ButtonHTMLAttributes<HTMLButtonElement> & DataAttributes;
  getValueProps: (chip: FilterBarChip<TFields>) => ButtonHTMLAttributes<HTMLButtonElement> & DataAttributes;
  getRemoveProps: (chip: FilterBarChip<TFields>) => ButtonHTMLAttributes<HTMLButtonElement> & DataAttributes;
  getClearProps: () => ButtonHTMLAttributes<HTMLButtonElement> & DataAttributes;
  getOperatorMenuProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getOperatorOptionProps: (operator: FilterOperator) => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getEditorProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getEditorInputProps: () => InputHTMLAttributes<HTMLInputElement> & DataAttributes;
  getEditorErrorProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getEditorApplyProps: () => ButtonHTMLAttributes<HTMLButtonElement> & DataAttributes;
  getAddProps: () => Props;
}

interface Draft {
  index: number;
  fieldKey: string;
  op: string;
  /** A new chip, not yet in the value. */
  isNew: boolean;
  /** The segment focus returns to. */
  returnTo: FilterBarPopup;
}

const EMPTY: readonly never[] = [];
const arity = (operator: FilterOperator) => operator.arity ?? 'single';
const flag = (on: boolean) => (on ? '' : undefined);

const toolbarItemSelector = [filterbarParts.operator, filterbarParts.value, filterbarParts.remove, filterbarParts.clear]
  .map((part) => `[data-dk-part="${part}"]`)
  .concat(`[data-dk-part="${filterbarParts.add}"] input`)
  .join(',');

/**
 * Headless filter bar (WAI-ARIA APG toolbar): filters as chips of field, operator and value, with a menu button
 * for the operator and a modal dialog for the value.
 *
 * @experimental
 */
export function useFilterBar<const TFields extends readonly AnyFilterField[]>(
  options: UseFilterBarOptions<TFields>,
): UseFilterBarReturn<TFields> {
  const { fields, locale } = options;
  const labels = { ...defaultFilterBarLabels, ...options.labels };
  const [filters, setFilters] = useControllableState<readonly Filter<TFields>[]>({
    value: options.value,
    defaultValue: options.defaultValue ?? EMPTY,
    onChange: options.onChange,
  });

  const base = useId(options.id);
  const ids = useMemo(
    () => ({
      root: base,
      add: `${base}-add`,
      addInput: `${base}-add-input`,
      editor: `${base}-editor`,
      menu: `${base}-menu`,
    }),
    [base],
  );
  const chipIds = (index: number) => {
    const chip = `${base}-chip-${index}`;
    return {
      chip,
      field: `${chip}-field`,
      operator: `${chip}-operator`,
      value: `${chip}-value`,
      remove: `${chip}-remove`,
    };
  };
  const clearId = `${base}-clear`;
  const errorId = `${ids.editor}-error`;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef<readonly string[] | 'editor' | null>(null);
  const reportedTypes = useRef(new Set<string>());

  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState<{ index: number; kind: FilterBarPopup } | null>(null);
  const [editorValue, setEditorValue] = useState<unknown>(undefined);
  const [issue, setIssue] = useState<FilterIssue | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<{ text: string; count: number } | null>(null);

  const editorFor = useCallback(
    (field: AnyFilterField) => options.editors?.[field.type] ?? builtInEditors[field.type],
    [options.editors],
  );
  const fieldByKey = (key: string) => fields.find((field) => field.key === key);
  const defaultOperator = (field: AnyFilterField) =>
    field.operators.find((operator) => operator.key === field.defaultOperator) ?? field.operators[0];

  const summaryOf = (field: AnyFilterField, operator: FilterOperator, valueText: string) =>
    labels.summary(field.label, operator.label, valueText);
  const describe = (filter: UntypedFilter) => {
    const field = fieldByKey(filter.field);
    const operator = field?.operators.find((candidate) => candidate.key === filter.op);
    return field && operator ? summaryOf(field, operator, formatFilterValue(filter, fields, { locale })) : '';
  };

  const chips: FilterBarChip<TFields>[] = [];
  const toChip = (index: number, field: AnyFilterField, operator: FilterOperator, filter: UntypedFilter | null) => {
    const valueText = filter ? formatFilterValue(filter, fields, { locale }) : '';
    chips.push({
      index,
      field,
      operator,
      filter: filter as Filter<TFields> | null,
      draft: filter === null,
      open: open?.index === index ? open.kind : null,
      readOnly: editorFor(field) === undefined,
      valueText,
      summary: summaryOf(field, operator, valueText),
    });
  };
  (filters as readonly UntypedFilter[]).forEach((filter, index) => {
    const field = fieldByKey(filter.field);
    const operator = field?.operators.find((candidate) => candidate.key === filter.op);
    if (!field || !operator) return;
    const draftOperator =
      draft && !draft.isNew && draft.index === index ? field.operators.find((o) => o.key === draft.op) : undefined;
    if (draftOperator) toChip(index, field, draftOperator, null);
    else toChip(index, field, operator, filter);
  });
  if (draft?.isNew) {
    const field = fieldByKey(draft.fieldKey);
    const operator = field?.operators.find((candidate) => candidate.key === draft.op);
    if (field && operator) toChip(draft.index, field, operator, null);
  }
  const chipAt = (index: number) => chips.find((chip) => chip.index === index);
  const openChip = open ? (chipAt(open.index) ?? null) : null;

  const availableFields = fields.filter((field) => {
    const operator = defaultOperator(field);
    return editorFor(field) !== undefined || (operator !== undefined && arity(operator) === 'none');
  });

  useEffect(() => {
    if (!isDev()) return;
    for (const chip of chips) {
      const type = chip.field.type;
      if (chip.readOnly && !reportedTypes.current.has(type)) {
        reportedTypes.current.add(type);
        console.error(
          `react-datakit: no FilterBar editor for fields of type "${type}"; their chips are read-only. Pass one in \`editors\`.`,
        );
      }
    }
  });

  const announce = (text: string) => {
    setAnnouncement((prev) => ({ text, count: (prev?.count ?? 0) + 1 }));
  };
  const focusLater = (target: readonly string[] | 'editor') => {
    pendingFocus.current = target;
  };
  const chipFocusTargets = (index: number) => {
    const chip = chipIds(index);
    return [chip.operator, chip.value, chip.remove];
  };

  useIsomorphicLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === 'editor') {
      editorRef.current?.querySelector<HTMLElement>('input, select, textarea, button, [tabindex="0"]')?.focus();
      return;
    }
    for (const id of target) {
      const element = document.getElementById(id);
      if (element) {
        element.focus();
        return;
      }
    }
  });

  // The Tab stop must be on an item that is rendered; after a removal, or when the app leaves
  // out a part, it moves to the first item.
  useEffect(() => {
    const items = toolbarItems(rootRef.current);
    if (items.length > 0 && !items.some((item) => item.tabIndex === 0) && items[0]?.id) setActive(items[0].id);
  }, [filters, draft, active]);

  const firstChip = chips[0];
  const defaultActive = firstChip ? chipIds(firstChip.index).operator : ids.addInput;
  const tabIndexFor = (id: string): 0 | -1 => ((active ?? defaultActive) === id ? 0 : -1);

  const closeAll = () => {
    setDraft(null);
    setOpen(null);
    setIssue(null);
    setEditorValue(undefined);
  };

  const apply = (index: number, filter: UntypedFilter, isNew: boolean) => {
    const next = isNew
      ? [...(filters as readonly UntypedFilter[]), filter]
      : (filters as readonly UntypedFilter[]).map((current, i) => (i === index ? filter : current));
    setFilters(next as unknown as readonly Filter<TFields>[]);
    announce((isNew ? labels.added : labels.updated)(describe(filter)));
  };

  const addFilter = (fieldKey: string) => {
    const field = fieldByKey(fieldKey);
    const operator = field && defaultOperator(field);
    if (!field || !operator) return;
    if (arity(operator) === 'none') {
      apply(filters.length, { field: field.key, op: operator.key }, true);
      return;
    }
    setDraft({ index: filters.length, fieldKey: field.key, op: operator.key, isNew: true, returnTo: 'value' });
    setOpen({ index: filters.length, kind: 'value' });
    setEditorValue(undefined);
    setIssue(null);
    focusLater('editor');
  };

  const removeFilter = (index: number) => {
    const removed = (filters as readonly UntypedFilter[])[index];
    if (!removed) return;
    const next = filters.filter((_, i) => i !== index);
    setFilters(next);
    closeAll();
    announce(labels.removed(describe(removed)));
    // The next chip takes the removed one's index; otherwise the previous chip, then the picker.
    focusLater(
      index < next.length
        ? [...chipFocusTargets(index), ids.addInput]
        : next.length > 0
          ? [...chipFocusTargets(next.length - 1), ids.addInput]
          : [ids.addInput],
    );
  };

  const clear = () => {
    setFilters(EMPTY);
    closeAll();
    announce(labels.cleared);
    focusLater([ids.addInput]);
  };

  const returnFocus = (current: Draft | null, index: number, kind: FilterBarPopup) => {
    if (current?.isNew) focusLater([ids.addInput]);
    else {
      const chip = chipIds(index);
      const segment = current?.returnTo ?? kind;
      focusLater([segment === 'operator' ? chip.operator : chip.value, ...chipFocusTargets(index)]);
    }
  };

  const close = ({ restoreFocus = true }: { restoreFocus?: boolean } = {}) => {
    if (!open) return;
    if (restoreFocus) returnFocus(draft, open.index, open.kind);
    closeAll();
  };

  const openOperatorMenu = (index: number, focus: 'checked' | 'last' = 'checked') => {
    const chip = chipAt(index);
    if (!chip || chip.readOnly) return;
    setOpen({ index, kind: 'operator' });
    const operators = chip.field.operators;
    const target = focus === 'last' ? operators[operators.length - 1] : chip.operator;
    focusLater(target ? [`${ids.menu}-${target.key}`] : []);
  };

  const selectOperator = (index: number, opKey: string) => {
    const chip = chipAt(index);
    const operator = chip?.field.operators.find((candidate) => candidate.key === opKey);
    if (!chip || !operator) return;
    const current = chip.filter as UntypedFilter | null;
    const chipId = chipIds(index);
    setOpen(null);
    if (current && current.op === operator.key) {
      focusLater([chipId.operator]);
      return;
    }
    const field = chip.field;
    const committed = field.operators.find((candidate) => candidate.key === current?.op);
    if (arity(operator) === 'none') {
      apply(index, { field: field.key, op: operator.key }, false);
      focusLater([chipId.operator]);
      return;
    }
    if (current && committed && arity(committed) === arity(operator)) {
      const next = { field: field.key, op: operator.key, value: current.value };
      if (!validateFilter(next, fields)) {
        apply(index, next, false);
        focusLater([chipId.operator]);
        return;
      }
    }
    // The committed filter stays as it is until a value for the new operator is committed.
    setDraft({ index, fieldKey: field.key, op: operator.key, isNew: false, returnTo: 'operator' });
    setOpen({ index, kind: 'value' });
    setEditorValue(undefined);
    setIssue(null);
    focusLater('editor');
  };

  const openEditor = (index: number) => {
    const chip = chipAt(index);
    if (!chip || chip.readOnly || open?.kind === 'value') return;
    setOpen({ index, kind: 'value' });
    setEditorValue((chip.filter as UntypedFilter | null)?.value);
    setIssue(null);
    focusLater('editor');
  };

  const commit = (value: unknown, restoreFocus: boolean): FilterIssue | null => {
    const chip = openChip;
    if (!chip || !open) return null;
    const filter = { field: chip.field.key, op: chip.operator.key, value };
    const problem = validateFilter(filter, fields);
    if (problem) {
      setIssue(problem);
      return problem;
    }
    const isNew = draft?.isNew === true && draft.index === chip.index;
    apply(chip.index, filter, isNew);
    if (restoreFocus) returnFocus(draft, chip.index, 'value');
    closeAll();
    return null;
  };

  useOutsidePointerDown(open?.kind === 'operator', menuRef, (event) => {
    // The operator button toggles the menu itself.
    if (event.target instanceof Node && openChip && isInside(event.target, chipIds(openChip.index).operator)) return;
    close({ restoreFocus: false });
  });
  // A click outside applies a valid value, so a pointer user doesn't lose what they typed.
  useOutsidePointerDown(open?.kind === 'value', editorRef, (event) => {
    if (event.target instanceof Node && openChip && isInside(event.target, chipIds(openChip.index).value)) return;
    if (editorValue === undefined || commit(editorValue, false)) close({ restoreFocus: false });
  });

  const moveFocus = (from: HTMLElement, key: string) => {
    const items = toolbarItems(rootRef.current);
    const index = items.indexOf(from);
    const target =
      key === 'Home'
        ? items[0]
        : key === 'End'
          ? items[items.length - 1]
          : key === 'ArrowLeft'
            ? items[index - 1]
            : items[index + 1];
    target?.focus();
  };

  const onItemKeyDown = (index: number | null) => (event: KeyboardEvent<HTMLElement>) => {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Home':
      case 'End':
        event.preventDefault();
        moveFocus(event.currentTarget, event.key);
        break;
      case 'Delete':
      case 'Backspace':
        if (index !== null) {
          event.preventDefault();
          removeFilter(index);
        }
        break;
    }
  };

  const onPickerKeyDown = (event: KeyboardEvent<HTMLInputElement>, query: string | null) => {
    const input = event.currentTarget;
    if (event.key === 'Backspace' && !query && filters.length > 0) {
      event.preventDefault();
      const last = filters.length - 1;
      const removed = (filters as readonly UntypedFilter[])[last];
      setFilters(filters.slice(0, last));
      if (removed) announce(labels.removed(describe(removed)));
      return true;
    }
    if (event.key === 'ArrowLeft' && input.selectionStart === 0 && input.selectionEnd === 0) {
      event.preventDefault();
      moveFocus(input, 'ArrowLeft');
      return true;
    }
    return false;
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    const index = items.findIndex((item) => item === document.activeElement);
    const count = items.length;
    const focusItem = (i: number) => items[(i + count) % count]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusItem(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusItem(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusItem(count - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        items[index]?.click();
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      // Focus goes back to the button first, so the browser's Tab moves on from there and leaves the toolbar.
      case 'Tab':
        if (open) document.getElementById(chipIds(open.index).operator)?.focus();
        close({ restoreFocus: false });
        break;
    }
  };

  const editorLabelledBy = openChip
    ? `${chipIds(openChip.index).field} ${chipIds(openChip.index).operator}`
    : undefined;

  const getEditorComponentProps = (): FilterEditorProps<never> | null => {
    if (!openChip || open?.kind !== 'value') return null;
    return {
      field: openChip.field,
      operator: openChip.operator,
      value: editorValue as never,
      issue,
      locale,
      onChange: (value: unknown) => {
        setEditorValue(value);
        setIssue(null);
      },
      onCommit: (value: unknown) => commit(value, true),
      onCancel: () => {
        close();
      },
    };
  };

  const state = open ? 'open' : 'closed';

  return {
    fields,
    filters,
    chips,
    availableFields,
    open,
    openChip,
    labels,
    locale,
    announcement: announcement ? announcementText(announcement.text, announcement.count) : '',
    ids,
    rootRef,
    menuRef,
    editorRef,
    editorFor,
    addFilter,
    removeFilter,
    clear,
    openOperatorMenu,
    selectOperator,
    openEditor,
    close,
    tabIndexFor,
    onPickerKeyDown,
    getEditorComponentProps,

    getRootProps: () => ({
      id: ids.root,
      role: 'toolbar',
      'aria-label': labels.toolbar,
      onFocus: (event: FocusEvent<HTMLDivElement>) => {
        const target = event.target;
        if (target.id && target.matches(toolbarItemSelector)) setActive(target.id);
      },
      'data-dk-part': filterbarParts.root,
      'data-empty': flag(filters.length === 0),
      'data-open': open?.kind,
    }),
    getChipsProps: () => ({ 'data-dk-part': filterbarParts.chips }),
    getChipProps: (chip) => ({
      id: chipIds(chip.index).chip,
      role: 'group',
      'aria-label': chip.summary,
      'data-dk-part': filterbarParts.chip,
      'data-field': chip.field.key,
      'data-op': chip.operator.key,
      'data-type': chip.field.type,
      'data-draft': flag(chip.draft),
      'data-open': chip.open ?? undefined,
      'data-readonly': flag(chip.readOnly),
    }),
    getFieldProps: (chip) => ({ id: chipIds(chip.index).field, 'data-dk-part': filterbarParts.field }),
    getOperatorProps: (chip) => {
      const id = chipIds(chip.index);
      const isOpen = chip.open === 'operator';
      return {
        id: id.operator,
        type: 'button',
        tabIndex: tabIndexFor(id.operator),
        'aria-haspopup': chip.readOnly ? undefined : 'menu',
        'aria-expanded': chip.readOnly ? undefined : isOpen,
        'aria-controls': isOpen ? ids.menu : undefined,
        'aria-disabled': chip.readOnly ? true : undefined,
        'aria-labelledby': `${id.field} ${id.operator}`,
        onClick: () => {
          if (isOpen) close();
          else openOperatorMenu(chip.index);
        },
        onKeyDown: (event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openOperatorMenu(chip.index, event.key === 'ArrowUp' ? 'last' : 'checked');
          } else onItemKeyDown(chip.index)(event);
        },
        'data-dk-part': filterbarParts.operator,
        'data-state': isOpen ? 'open' : 'closed',
        'data-readonly': flag(chip.readOnly),
      };
    },
    getValueProps: (chip) => {
      const id = chipIds(chip.index);
      const isOpen = chip.open === 'value';
      return {
        id: id.value,
        type: 'button',
        tabIndex: tabIndexFor(id.value),
        'aria-haspopup': chip.readOnly ? undefined : 'dialog',
        'aria-expanded': chip.readOnly ? undefined : isOpen,
        'aria-controls': isOpen ? ids.editor : undefined,
        'aria-disabled': chip.readOnly ? true : undefined,
        'aria-labelledby': `${id.field} ${id.operator} ${id.value}`,
        onClick: () => {
          openEditor(chip.index);
        },
        onKeyDown: onItemKeyDown(chip.index),
        'data-dk-part': filterbarParts.value,
        'data-state': isOpen ? 'open' : 'closed',
        'data-placeholder': flag(chip.valueText === ''),
        'data-readonly': flag(chip.readOnly),
      };
    },
    getRemoveProps: (chip) => {
      const id = chipIds(chip.index).remove;
      return {
        id,
        type: 'button',
        tabIndex: tabIndexFor(id),
        'aria-label': labels.remove(chip.summary),
        onClick: () => {
          removeFilter(chip.index);
        },
        onKeyDown: onItemKeyDown(chip.index),
        'data-dk-part': filterbarParts.remove,
      };
    },
    getClearProps: () => ({
      id: clearId,
      type: 'button',
      tabIndex: tabIndexFor(clearId),
      onClick: clear,
      onKeyDown: onItemKeyDown(null),
      'data-dk-part': filterbarParts.clear,
    }),
    getOperatorMenuProps: () => ({
      id: ids.menu,
      role: 'menu',
      'aria-labelledby': openChip ? chipIds(openChip.index).operator : undefined,
      onKeyDown: onMenuKeyDown,
      'data-dk-part': filterbarParts.operatorMenu,
      'data-state': state,
    }),
    getOperatorOptionProps: (operator) => {
      const checked = openChip?.operator.key === operator.key;
      return {
        id: `${ids.menu}-${operator.key}`,
        role: 'menuitemradio',
        tabIndex: -1,
        'aria-checked': checked,
        onClick: () => {
          if (openChip) selectOperator(openChip.index, operator.key);
        },
        'data-dk-part': filterbarParts.operatorOption,
        'data-checked': flag(checked),
      };
    },
    getEditorProps: () => ({
      id: ids.editor,
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': editorLabelledBy,
      onKeyDown: (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close();
          return;
        }
        trapTab(event, editorRef.current);
      },
      'data-dk-part': filterbarParts.editor,
      'data-type': openChip?.field.type,
      'data-invalid': flag(issue !== null),
    }),
    getEditorInputProps: () => ({
      id: `${ids.editor}-input`,
      type: 'text',
      autoComplete: 'off',
      'aria-labelledby': editorLabelledBy,
      'aria-invalid': issue ? true : undefined,
      'aria-describedby': issue ? errorId : undefined,
      'data-dk-part': filterbarParts.editorInput,
      'data-invalid': flag(issue !== null),
    }),
    getEditorErrorProps: () => ({ id: errorId, role: 'alert', 'data-dk-part': filterbarParts.editorError }),
    getEditorApplyProps: () => ({ type: 'button', 'data-dk-part': filterbarParts.editorApply }),
    getAddProps: () => ({ 'data-dk-part': filterbarParts.add }),
  };
}

function toolbarItems(root: HTMLElement | null): HTMLElement[] {
  return root ? [...root.querySelectorAll<HTMLElement>(toolbarItemSelector)] : [];
}

function isInside(target: Node, id: string): boolean {
  return document.getElementById(id)?.contains(target) ?? false;
}
