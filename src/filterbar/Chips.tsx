import { forwardRef, useEffect, useMemo, useRef, type ReactNode, type Ref } from 'react';
import { DateRangePicker } from '../daterangepicker/DateRangePicker';
import { mergeProps, Part, type PartProps } from '../shared';
import {
  endOfDayInZone,
  fromDateKey,
  getLocalTimeZone,
  startOfDayInZone,
  toCalendarDate,
  toDateKey,
} from '../shared/date';
import { ChipContext, useChipContext, useFilterBarContext } from './context';
import { DateEditor } from './Editor';
import type { DateFilterField, FilterDateRange, FilterOperator } from './schema';
import type { FilterBarChip, FilterBarPopup } from './useFilterBar';

export interface FilterBarChipsState {
  count: number;
}

export type FilterBarChipsProps<TChip extends FilterBarChip = FilterBarChip> = Omit<
  PartProps<'div', FilterBarChipsState>,
  'children'
> & {
  /** Renders one chip. Default: a `Chip` with `Field`, `Operator`, `Value` and `Remove`. */
  children?: ((chip: TChip) => ReactNode) | undefined;
};

function DefaultChip() {
  return (
    <Chip>
      <Field />
      <Operator />
      <Value />
      <Remove />
    </Chip>
  );
}

export const Chips = forwardRef(function FilterBarChips(
  { children, ...props }: FilterBarChipsProps,
  ref: Ref<HTMLDivElement>,
) {
  const bar = useFilterBarContext('Chips');
  const ours = {
    ...bar.getChipsProps(),
    children: bar.chips.map((chip) => (
      <ChipContext.Provider key={`${chip.index}:${chip.field.key}`} value={chip}>
        {children ? children(chip) : <DefaultChip />}
      </ChipContext.Provider>
    )),
  };
  return <Part tag="div" state={{ count: bar.chips.length }} ours={ours} theirs={props} forwardedRef={ref} />;
});

export interface FilterBarChipState {
  index: number;
  draft: boolean;
  open: FilterBarPopup | null;
  readOnly: boolean;
}

export type FilterBarChipProps = PartProps<'div', FilterBarChipState>;

/** A `role="group"` named after the filter, e.g. "Status is Open". */
export const Chip = forwardRef<HTMLDivElement, FilterBarChipProps>(function FilterBarChip(props, ref) {
  const bar = useFilterBarContext('Chip');
  const chip = useChipContext('Chip');
  const state = { index: chip.index, draft: chip.draft, open: chip.open, readOnly: chip.readOnly };
  return <Part tag="div" state={state} ours={bar.getChipProps(chip)} theirs={props} forwardedRef={ref} />;
});

export type FilterBarFieldProps = PartProps<'span', { index: number }>;

/** The field label. Its text is part of the names of the operator and value buttons. */
export const Field = forwardRef<HTMLSpanElement, FilterBarFieldProps>(function FilterBarField(
  { children, ...props },
  ref,
) {
  const bar = useFilterBarContext('Field');
  const chip = useChipContext('Field');
  const ours = { ...bar.getFieldProps(chip), children: children ?? chip.field.label };
  return <Part tag="span" state={{ index: chip.index }} ours={ours} theirs={props} forwardedRef={ref} />;
});

export interface FilterBarOperatorState {
  open: boolean;
  readOnly: boolean;
}

export type FilterBarOperatorProps = Omit<PartProps<'button', FilterBarOperatorState>, 'children'> & {
  /** Visible operator text. Default: the operator's `label`. */
  children?: ((operator: FilterOperator, chip: FilterBarChip) => ReactNode) | undefined;
};

/** Menu button that changes the operator. */
export const Operator = forwardRef<HTMLButtonElement, FilterBarOperatorProps>(function FilterBarOperator(
  { children, ...props },
  ref,
) {
  const bar = useFilterBarContext('Operator');
  const chip = useChipContext('Operator');
  const ours = {
    ...bar.getOperatorProps(chip),
    children: children ? children(chip.operator, chip) : chip.operator.label,
  };
  const state = { open: chip.open === 'operator', readOnly: chip.readOnly };
  return <Part tag="button" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});

export interface FilterBarValueState {
  /** Visible value text; empty while there is no value. */
  text: string;
  placeholder: boolean;
  open: boolean;
  readOnly: boolean;
}

export type FilterBarValueProps = Omit<PartProps<'button', FilterBarValueState>, 'children'> & {
  /** Visible value. Default: the formatted value, or "Select…" while there is none. */
  children?: ((text: string, chip: FilterBarChip) => ReactNode) | undefined;
};

/** Opens the value editor. Not rendered for an operator without a value. */
export const Value = forwardRef<HTMLButtonElement, FilterBarValueProps>(function FilterBarValue(
  { children, ...props },
  ref,
) {
  const bar = useFilterBarContext('Value');
  const chip = useChipContext('Value');
  if ((chip.operator.arity ?? 'single') === 'none') return null;
  const text = chip.valueText;
  const content = children ? children(text, chip) : text || 'Select…';
  const state = { text, placeholder: text === '', open: chip.open === 'value', readOnly: chip.readOnly };
  if (bar.editorFor(chip.field) === DateEditor)
    return <DateValue chip={chip} content={content} state={state} partProps={props} forwardedRef={ref} />;
  const ours = { ...bar.getValueProps(chip), children: content };
  return <Part tag="button" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});

/**
 * The value of a date chip: the trigger of a DateRangePicker, whose dialog is the editor. The picker reads and
 * writes instants in the field's time zone; the filter keeps calendar days.
 */
function DateValue({
  chip,
  content,
  state,
  partProps,
  forwardedRef,
}: {
  chip: FilterBarChip;
  content: ReactNode;
  state: FilterBarValueState;
  partProps: Omit<FilterBarValueProps, 'children'>;
  forwardedRef: Ref<HTMLButtonElement>;
}) {
  const bar = useFilterBarContext('Value');
  const field = chip.field as DateFilterField<string, readonly FilterOperator[]>;
  const timeZone = field.timeZone ?? getLocalTimeZone();
  const days = (chip.filter as { value?: FilterDateRange } | null)?.value;
  const value = useMemo(() => {
    const start = days && fromDateKey(days.start);
    const end = days && fromDateKey(days.end);
    return start && end ? { start: startOfDayInZone(start, timeZone), end: endOfDayInZone(end, timeZone) } : null;
  }, [days, timeZone]);
  // A pick closes the picker right after onChange; that close must not cancel the commit.
  const committed = useRef(false);
  // DateRangePicker moves focus into the calendar when it opens, but a new chip mounts already open.
  const popoverRef = useRef<HTMLDivElement>(null);
  const openOnMount = useRef(chip.open === 'value');
  useEffect(() => {
    if (openOnMount.current) popoverRef.current?.querySelector<HTMLElement>('[data-date][tabindex="0"]')?.focus();
  }, []);
  const { render, ...rest } = partProps;
  return (
    <DateRangePicker
      timeZone={timeZone}
      locale={bar.locale}
      value={value}
      open={chip.open === 'value'}
      onOpenChange={(open) => {
        if (open) bar.openEditor(chip.index);
        else if (!committed.current) bar.close();
        committed.current = false;
      }}
      onChange={(range) => {
        if (!range) return;
        committed.current = true;
        bar.getEditorComponentProps()?.onCommit({
          start: toDateKey(toCalendarDate(range.start, timeZone)),
          end: toDateKey(toCalendarDate(range.end, timeZone)),
        } as never);
      }}
    >
      <DateRangePicker.Trigger
        {...mergeProps(bar.getValueProps(chip), rest)}
        render={render ? (props) => render(props, state) : undefined}
        ref={forwardedRef}
      >
        {content}
      </DateRangePicker.Trigger>
      <DateRangePicker.Popover ref={popoverRef} aria-labelledby={bar.getEditorInputProps()['aria-labelledby']}>
        <DateRangePicker.Presets aria-label={bar.labels.presets} />
        <DateRangePicker.PrevMonth />
        <DateRangePicker.NextMonth />
        <DateRangePicker.Months />
      </DateRangePicker.Popover>
    </DateRangePicker>
  );
}

export type FilterBarRemoveProps = PartProps<'button', { index: number }>;

/** Removes the filter; its name comes from `labels.remove`. */
export const Remove = forwardRef<HTMLButtonElement, FilterBarRemoveProps>(function FilterBarRemove(props, ref) {
  const bar = useFilterBarContext('Remove');
  const chip = useChipContext('Remove');
  const ours = {
    ...bar.getRemoveProps(chip),
    children: (
      <svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    ),
  };
  return <Part tag="button" state={{ index: chip.index }} ours={ours} theirs={props} forwardedRef={ref} />;
});

export type FilterBarClearProps = PartProps<'button', { count: number }>;

/** Removes every filter. Rendered only while there are filters. */
export const Clear = forwardRef<HTMLButtonElement, FilterBarClearProps>(function FilterBarClear(
  { children, ...props },
  ref,
) {
  const bar = useFilterBarContext('Clear');
  const count = bar.filters.length;
  if (count === 0) return null;
  const ours = { ...bar.getClearProps(), children: children ?? 'Clear' };
  return <Part tag="button" state={{ count }} ours={ours} theirs={props} forwardedRef={ref} />;
});
