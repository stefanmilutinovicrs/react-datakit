import { forwardRef, type ReactNode } from 'react';
import { Part, useIsomorphicLayoutEffect, useMergedRefs, type PartProps } from '../shared';
import { usePicker } from './context';
import type { DateRange } from './useDateRangePicker';

export interface DateRangePickerLabelState {
  open: boolean;
}

export type DateRangePickerLabelProps = PartProps<'label', DateRangePickerLabelState>;

export const Label = forwardRef<HTMLLabelElement, DateRangePickerLabelProps>(function Label(props, ref) {
  const picker = usePicker('Label');
  const { registerLabel } = picker;
  useIsomorphicLayoutEffect(() => registerLabel(), [registerLabel]);
  return (
    <Part tag="label" state={{ open: picker.isOpen }} ours={picker.getLabelProps()} theirs={props} forwardedRef={ref} />
  );
});

export interface DateRangePickerTriggerState {
  open: boolean;
  value: DateRange | null;
  /** The value formatted for the locale, e.g. "Mar 10 – 14, 2026". */
  formattedValue: string | null;
}

export type DateRangePickerTriggerProps = Omit<PartProps<'button', DateRangePickerTriggerState>, 'children'> & {
  /** Content of the button. Default: a `Value` with `placeholder`. */
  children?: ReactNode | ((state: DateRangePickerTriggerState) => ReactNode);
  /** Passed to the default `Value`; ignored when there are `children`. */
  placeholder?: ReactNode;
};

export const Trigger = forwardRef<HTMLButtonElement, DateRangePickerTriggerProps>(function Trigger(
  { children, placeholder, ...props },
  ref,
) {
  const picker = usePicker('Trigger');
  const mergedRef = useMergedRefs<HTMLButtonElement>(picker.triggerRef, ref);
  const state: DateRangePickerTriggerState = {
    open: picker.isOpen,
    value: picker.value,
    formattedValue: picker.formattedValue,
  };
  const content = typeof children === 'function' ? children(state) : (children ?? <Value placeholder={placeholder} />);
  return (
    <Part
      tag="button"
      state={state}
      ours={{ ...picker.getTriggerProps(), children: content }}
      theirs={props}
      forwardedRef={mergedRef}
    />
  );
});

export interface DateRangePickerValueState {
  value: DateRange | null;
  /** The value formatted for the locale, e.g. "Mar 10 – 14, 2026". */
  formattedValue: string | null;
}

export type DateRangePickerValueProps = Omit<PartProps<'span', DateRangePickerValueState>, 'children'> & {
  /** Default: the formatted value, or `placeholder`. */
  children?: ReactNode | ((state: DateRangePickerValueState) => ReactNode);
  /** Shown when there is no value and no `children`. */
  placeholder?: ReactNode;
};

/**
 * The picked range inside `Trigger`; while mounted, the trigger's name is the label plus this text, so other content beside it must be decorative (`aria-hidden`).
 *
 * @experimental
 */
export const Value = forwardRef<HTMLSpanElement, DateRangePickerValueProps>(function Value(
  { children, placeholder, ...props },
  ref,
) {
  const picker = usePicker('Value');
  const { registerValue } = picker;
  useIsomorphicLayoutEffect(() => registerValue(), [registerValue]);
  const state: DateRangePickerValueState = { value: picker.value, formattedValue: picker.formattedValue };
  const content = typeof children === 'function' ? children(state) : (children ?? picker.formattedValue ?? placeholder);
  return (
    <Part
      tag="span"
      state={state}
      ours={{ ...picker.getTriggerValueProps(), children: content }}
      theirs={props}
      forwardedRef={ref}
    />
  );
});
