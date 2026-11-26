import { forwardRef, type ReactNode } from 'react';
import { Part, type PartProps } from '../shared';
import { useCoreContext } from '../shared/combobox/context';
import type { UseComboboxReturn } from './useCombobox';

export interface ComboboxControlState {
  open: boolean;
}

export type ComboboxControlProps = PartProps<'div', ComboboxControlState>;

/** Optional field around the input, for icons and buttons next to it. */
export const Control = forwardRef<HTMLDivElement, ComboboxControlProps>(function ComboboxControl(props, ref) {
  const core = useCoreContext('Control');
  return (
    <Part tag="div" state={{ open: core.isOpen }} ours={core.getControlProps()} theirs={props} forwardedRef={ref} />
  );
});

export interface ComboboxCountState {
  count: number;
}

export type ComboboxCountProps = Omit<PartProps<'div', ComboboxCountState>, 'children'> & {
  /** Text for the number of results, e.g. `(count) => \`${count} results\``. */
  children: (count: number) => ReactNode;
};

/** Shown while open when the current query has options. */
export const Count = forwardRef<HTMLDivElement, ComboboxCountProps>(function ComboboxCount(
  { children, ...props },
  ref,
) {
  const combobox = useCoreContext('Count') as UseComboboxReturn<unknown>;
  const count = combobox.items.length;
  if (combobox.status !== 'success' || count === 0) return null;
  const ours = { ...combobox.getCountProps(), children: children(count) };
  return <Part tag="div" state={{ count }} ours={ours} theirs={props} forwardedRef={ref} />;
});
