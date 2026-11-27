import { forwardRef, type ReactElement, type ReactNode, type Ref } from 'react';
import { Part, splitProps, useMergedRefs, visuallyHidden, type PartProps, type WithRef } from '../shared';
import { Add } from './Add';
import { Chip, Chips, Clear, Field, Operator, Remove, Value, type FilterBarChipsProps } from './Chips';
import { FilterBarContext } from './context';
import { Editor, EditorApply, EditorError, EditorInput } from './Editor';
import { OperatorMenu, OperatorOption } from './OperatorMenu';
import type { AnyFilterField } from './schema';
import {
  filterBarOptionKeys,
  useFilterBar,
  type FilterBarChip,
  type FilterBarPopup,
  type UseFilterBarOptions,
} from './useFilterBar';

export interface FilterBarRootState {
  empty: boolean;
  count: number;
  open: FilterBarPopup | null;
}

export type FilterBarProps<TFields extends readonly AnyFilterField[]> = UseFilterBarOptions<TFields> &
  Omit<PartProps<'div', FilterBarRootState>, 'onChange' | 'defaultValue' | 'children' | 'id'> & {
    /** Default: `Chips`, `OperatorMenu`, `Editor`, `Clear` and `Add`. */
    children?: ReactNode;
  };

function DefaultParts() {
  return (
    <>
      <Chips />
      <OperatorMenu />
      <Editor />
      <Clear />
      <Add />
    </>
  );
}

const Root = forwardRef(function FilterBar(
  { children, ...props }: FilterBarProps<readonly AnyFilterField[]>,
  ref: Ref<HTMLDivElement>,
) {
  const [options, partProps] = splitProps(props, filterBarOptionKeys);
  const bar = useFilterBar(options);
  const mergedRef = useMergedRefs<HTMLDivElement>(bar.rootRef, ref);
  const state: FilterBarRootState = {
    empty: bar.filters.length === 0,
    count: bar.filters.length,
    open: bar.open?.kind ?? null,
  };
  const ours = {
    ...bar.getRootProps(),
    children: (
      <>
        {children ?? <DefaultParts />}
        <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
          {bar.announcement}
        </div>
      </>
    ),
  };
  return (
    <FilterBarContext.Provider value={bar}>
      <Part tag="div" state={state} ours={ours} theirs={partProps} forwardedRef={mergedRef} />
    </FilterBarContext.Provider>
  );
});

/**
 * Filters as chips of field, operator and value, like the filter bars of issue trackers; the value is a
 * serialisable array that `react-datakit/filterbar/schema` writes to and reads from the URL.
 *
 * @experimental
 */
export const FilterBar = Object.assign(
  Root as <const TFields extends readonly AnyFilterField[]>(
    props: WithRef<FilterBarProps<TFields>, HTMLDivElement>,
  ) => ReactElement,
  {
    Chips: Chips as <TFields extends readonly AnyFilterField[]>(
      props: WithRef<FilterBarChipsProps<FilterBarChip<TFields>>, HTMLDivElement>,
    ) => ReactElement,
    Chip,
    Field,
    Operator,
    Value,
    Remove,
    Clear,
    OperatorMenu,
    OperatorOption,
    Editor,
    EditorInput,
    EditorError,
    EditorApply,
    Add,
  },
);
