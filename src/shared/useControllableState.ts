import { useCallback, useRef, useState } from 'react';
import { isDev } from './isDev';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

export interface UseControllableStateParams<T> {
  /** Controlled value. When defined, the component does not keep its own state. */
  value?: T | undefined;
  /** Initial value for uncontrolled usage. Ignored when `value` is defined. */
  defaultValue: T;
  /** Called whenever the value changes, in both controlled and uncontrolled mode. */
  onChange?: ((value: T) => void) | undefined;
}

export type SetControllableState<T> = (next: T | ((prev: T) => T)) => void;

export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateParams<T>): [T, SetControllableState<T>] {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const currentRef = useRef(currentValue);
  const isControlledRef = useRef(isControlled);
  const onChangeRef = useRef(onChange);

  useIsomorphicLayoutEffect(() => {
    if (isDev() && isControlledRef.current !== isControlled) {
      console.warn(
        `react-datakit: a component switched from ${isControlledRef.current ? 'controlled' : 'uncontrolled'} ` +
          `to ${isControlled ? 'controlled' : 'uncontrolled'}. Pick one for the lifetime of the component; ` +
          'use null instead of undefined for an empty controlled value.',
      );
    }
    isControlledRef.current = isControlled;
    currentRef.current = currentValue;
    onChangeRef.current = onChange;
  });

  const setValue = useCallback<SetControllableState<T>>((next) => {
    const prev = currentRef.current;
    const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
    if (Object.is(resolved, prev)) return;

    // Update the ref right away so several updates in one event compose correctly.
    currentRef.current = resolved;
    if (!isControlledRef.current) setInternalValue(resolved);
    onChangeRef.current?.(resolved);
  }, []);

  return [currentValue, setValue];
}
