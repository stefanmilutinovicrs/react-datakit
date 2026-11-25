import { createContext, useContext } from 'react';
import type { ComboboxCore } from './useComboboxCore';

export const CoreContext = createContext<ComboboxCore<unknown> | null>(null);

export function useCoreContext<TItem>(part: string): ComboboxCore<TItem> {
  const context = useContext(CoreContext);
  if (!context) throw new Error(`react-datakit: <${part}> must be rendered inside <Combobox> or <MultiSelect>.`);
  return context as unknown as ComboboxCore<TItem>;
}
