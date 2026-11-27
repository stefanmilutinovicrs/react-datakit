import { createContext, useContext } from 'react';
import type { UseSparklineReturn } from './useSparkline';

export const SparklineContext = createContext<UseSparklineReturn | null>(null);

export function useSparklineContext(part: string): UseSparklineReturn {
  const context = useContext(SparklineContext);
  if (!context) throw new Error(`react-datakit: <Sparkline.${part}> must be rendered inside <Sparkline>.`);
  return context;
}
