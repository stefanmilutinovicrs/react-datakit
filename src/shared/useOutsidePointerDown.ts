import { useEffect, type RefObject } from 'react';
import { useLatestRef } from './useLatestRef';

/** Calls `onOutside` on a pointerdown outside `ref` while `active`. */
export function useOutsidePointerDown(
  active: boolean,
  ref: RefObject<HTMLElement | null>,
  onOutside: (event: PointerEvent) => void,
): void {
  const callback = useLatestRef(onOutside);
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: PointerEvent) => {
      const element = ref.current;
      if (element && event.target instanceof Node && !element.contains(event.target)) callback.current(event);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [active, ref, callback]);
}
