import { forwardRef, Fragment, type ReactNode } from 'react';
import { Part, useMergedRefs, type PartProps } from '../shared';
import { useFilterBarContext } from './context';
import type { FilterOperator } from './schema';

export interface FilterBarOperatorMenuState {
  index: number;
}

export type FilterBarOperatorMenuProps = Omit<PartProps<'div', FilterBarOperatorMenuState>, 'children'> & {
  /** Renders one operator. Default: an `OperatorOption` with the operator's label. */
  children?: ((operator: FilterOperator) => ReactNode) | undefined;
};

/** The operators of the open chip (`role="menu"`). Rendered once, only while open. */
export const OperatorMenu = forwardRef<HTMLDivElement, FilterBarOperatorMenuProps>(function FilterBarOperatorMenu(
  { children, ...props },
  ref,
) {
  const bar = useFilterBarContext('OperatorMenu');
  const mergedRef = useMergedRefs<HTMLDivElement>(bar.menuRef, ref);
  const chip = bar.openChip;
  if (bar.open?.kind !== 'operator' || !chip) return null;
  const ours = {
    ...bar.getOperatorMenuProps(),
    children: chip.field.operators.map((operator) => (
      <Fragment key={operator.key}>{children ? children(operator) : <OperatorOption operator={operator} />}</Fragment>
    )),
  };
  return <Part tag="div" state={{ index: chip.index }} ours={ours} theirs={props} forwardedRef={mergedRef} />;
});

export interface FilterBarOperatorOptionState {
  checked: boolean;
}

export type FilterBarOperatorOptionProps = PartProps<'div', FilterBarOperatorOptionState> & {
  operator: FilterOperator;
};

/** One operator (`role="menuitemradio"`). Default content: the operator's label. */
export const OperatorOption = forwardRef<HTMLDivElement, FilterBarOperatorOptionProps>(function FilterBarOperatorOption(
  { operator, children, ...props },
  ref,
) {
  const bar = useFilterBarContext('OperatorOption');
  const ours = { ...bar.getOperatorOptionProps(operator), children: children ?? operator.label };
  const state = { checked: bar.openChip?.operator.key === operator.key };
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});
