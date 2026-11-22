import { useId as useReactId } from 'react';

/**
 * A stable, SSR-safe id for ARIA relationships (`aria-controls`,
 * `aria-activedescendant`, `aria-labelledby`). A user-provided id always wins.
 */
export function useId(idFromProps?: string): string {
  const generated = `dk-${useReactId()}`;
  return idFromProps ?? generated;
}
