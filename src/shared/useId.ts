import { useId as useReactId } from 'react';

/** A stable, SSR-safe id for ARIA relationships, unless the user passes one. */
export function useId(idFromProps?: string): string {
  const generated = `dk-${useReactId()}`;
  return idFromProps ?? generated;
}
