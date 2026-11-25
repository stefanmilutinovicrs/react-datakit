import { forwardRef } from 'react';
import { Part, type PartProps } from '../Part';
import { useIsomorphicLayoutEffect } from '../useIsomorphicLayoutEffect';
import { useMergedRefs } from '../useMergedRefs';
import { useCoreContext } from './context';
import type { ComboboxStatus } from './useComboboxCore';

export interface ComboboxLabelState {
  open: boolean;
}

export type ComboboxLabelProps = PartProps<'label', ComboboxLabelState>;

export const Label = forwardRef<HTMLLabelElement, ComboboxLabelProps>(function Label(props, ref) {
  const core = useCoreContext('Label');
  const { registerLabel } = core;
  useIsomorphicLayoutEffect(() => registerLabel(), [registerLabel]);
  return (
    <Part tag="label" state={{ open: core.isOpen }} ours={core.getLabelProps()} theirs={props} forwardedRef={ref} />
  );
});

export interface ComboboxInputState {
  open: boolean;
  status: ComboboxStatus;
}

export type ComboboxInputProps = Omit<PartProps<'input', ComboboxInputState>, 'value' | 'defaultValue' | 'children'>;

export const Input = forwardRef<HTMLInputElement, ComboboxInputProps>(function Input(props, ref) {
  const core = useCoreContext('Input');
  const mergedRef = useMergedRefs<HTMLInputElement>(core.inputRef, ref);
  const state: ComboboxInputState = { open: core.isOpen, status: core.status };
  return <Part tag="input" state={state} ours={core.getInputProps()} theirs={props} forwardedRef={mergedRef} />;
});
