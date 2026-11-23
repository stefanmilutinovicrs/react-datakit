import { createContext, useContext } from 'react';
import type { UseMultiSelectReturn } from './useMultiSelect';

export const MultiSelectContext = createContext<UseMultiSelectReturn<unknown> | null>(null);
export const ChipContext = createContext<{ item: unknown; index: number } | null>(null);

export function useMultiSelectContext<TItem>(part: string): UseMultiSelectReturn<TItem> {
  const context = useContext(MultiSelectContext);
  if (!context) throw new Error(`react-datakit: <MultiSelect.${part}> must be rendered inside <MultiSelect>.`);
  return context as unknown as UseMultiSelectReturn<TItem>;
}

export function useChipContext(part: string): { item: unknown; index: number } {
  const context = useContext(ChipContext);
  if (!context) throw new Error(`react-datakit: <MultiSelect.${part}> must be rendered by <MultiSelect.Chips>.`);
  return context;
}
