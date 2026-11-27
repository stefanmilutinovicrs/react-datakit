import { createContext, useContext } from 'react';
import type { AnyFilterField } from './schema';
import type { FilterBarChip, UseFilterBarReturn } from './useFilterBar';

type AnyFields = readonly AnyFilterField[];

export const FilterBarContext = createContext<UseFilterBarReturn<AnyFields> | null>(null);
export const ChipContext = createContext<FilterBarChip | null>(null);

export function useFilterBarContext(part: string): UseFilterBarReturn<AnyFields> {
  const context = useContext(FilterBarContext);
  if (!context) throw new Error(`react-datakit: <FilterBar.${part}> must be rendered inside <FilterBar>.`);
  return context;
}

export function useChipContext(part: string): FilterBarChip {
  const chip = useContext(ChipContext);
  if (!chip) throw new Error(`react-datakit: <FilterBar.${part}> must be rendered inside <FilterBar.Chip>.`);
  return chip;
}
