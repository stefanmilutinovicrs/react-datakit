import { useEffect, useState } from 'react';

/** Returns `value` once it has stopped changing for `delayMs`; a delay of 0 or less returns it as is. */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const enabled = delayMs > 0;

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      // Updater form, so a function value is stored rather than called.
      setDebounced(() => value);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs, enabled]);

  return enabled ? debounced : value;
}
