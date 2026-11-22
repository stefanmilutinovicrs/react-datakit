import { useCallback, type Ref, type RefCallback } from 'react';

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

/** Combines two refs (callback or object) into one callback ref. */
export function useMergedRefs<T>(a: Ref<T> | undefined, b: Ref<T> | undefined): RefCallback<T> {
  return useCallback(
    (value: T | null) => {
      assignRef(a, value);
      assignRef(b, value);
    },
    [a, b],
  );
}
