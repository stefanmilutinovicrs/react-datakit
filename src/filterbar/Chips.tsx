import { forwardRef, type ReactNode, type Ref } from 'react';
import { Part, type PartProps } from '../shared';
import { ChipContext, useChipContext, useFilterBarContext } from './context';
import type { FilterOperator } from './schema';
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
  const ours = {
    ...bar.getValueProps(chip),
    children: children ? children(text, chip) : text || 'Select…',
  };
  const state = { text, placeholder: text === '', open: chip.open === 'value', readOnly: chip.readOnly };
  return <Part tag="button" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});

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
