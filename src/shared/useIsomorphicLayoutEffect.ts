import { useEffect, useLayoutEffect } from 'react';

// useLayoutEffect warns during server rendering (Next.js App Router), so the server gets useEffect.
export const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;
