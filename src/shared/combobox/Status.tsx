import { forwardRef, type ReactNode } from 'react';
import { Part, type PartProps } from '../Part';
import { useCoreContext } from './context';

export interface ComboboxStatusPartState {
  query: string | null;
}

export type ComboboxEmptyProps = PartProps<'div', ComboboxStatusPartState>;
export type ComboboxLoadingProps = PartProps<'div', ComboboxStatusPartState>;

/** Shown while open when the current query has no options. */
export const Empty = forwardRef<HTMLDivElement, ComboboxEmptyProps>(function Empty(props, ref) {
  const core = useCoreContext('Empty');
  if (core.status !== 'success' || core.rows.length > 0) return null;
  return (
    <Part
      tag="div"
      state={{ query: core.query }}
      ours={{ 'data-dk-part': `${core.part}-empty` }}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

/** Shown while `loadOptions` runs for the current query. */
export const Loading = forwardRef<HTMLDivElement, ComboboxLoadingProps>(function Loading(props, ref) {
  const core = useCoreContext('Loading');
  if (core.status !== 'loading') return null;
  return (
    <Part
      tag="div"
      state={{ query: core.query }}
      ours={{ 'data-dk-part': `${core.part}-loading`, 'data-loading': '' }}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

export interface ComboboxErrorState {
  error: unknown;
  retry: () => void;
}

export type ComboboxErrorProps = Omit<PartProps<'div', ComboboxErrorState>, 'children'> & {
  children: ReactNode | ((state: ComboboxErrorState) => ReactNode);
};

/** Shown when `loadOptions` rejects for the current query. Announced with `role="alert"`. */
export const ErrorPart = forwardRef<HTMLDivElement, ComboboxErrorProps>(function Error({ children, ...props }, ref) {
  const core = useCoreContext('Error');
  if (core.status !== 'error') return null;
  const state: ComboboxErrorState = { error: core.error, retry: core.retry };
  const ours = {
    role: 'alert',
    'data-dk-part': `${core.part}-error`,
    children: typeof children === 'function' ? children(state) : children,
  };
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});
