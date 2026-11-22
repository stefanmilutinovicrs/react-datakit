import { useCallback, useRef, useState } from 'react';
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

/**
 * One state primitive for every component, so each value works both ways:
 * controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 *
 * - `undefined` means "uncontrolled"; use `null` for an empty controlled value.
 * - The setter is stable and accepts an updater function, like `useState`.
 * - `onChange` fires only when the value actually changes (`Object.is`).
 */
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

function isDev(): boolean {
  // Bundlers replace `process.env.NODE_ENV` statically, so it must be written
  // exactly like this. The try/catch covers environments with no bundler.
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}
