import type { CSSProperties } from 'react';

/** Visually hidden but announced. Inline because live regions must work without the theme. */
export const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};
