import { createContext, useContext } from 'react';
import type { CalendarMonth, UseDateRangePickerReturn } from './useDateRangePicker';

export const PickerContext = createContext<UseDateRangePickerReturn | null>(null);
export const MonthContext = createContext<CalendarMonth | null>(null);

export function usePicker(part: string): UseDateRangePickerReturn {
  const context = useContext(PickerContext);
  if (!context) throw new Error(`react-datakit: <DateRangePicker.${part}> must be rendered inside <DateRangePicker>.`);
  return context;
}

export function useMonth(part: string): CalendarMonth {
  const month = useContext(MonthContext);
  if (!month)
    throw new Error(`react-datakit: <DateRangePicker.${part}> must be rendered inside <DateRangePicker.Month>.`);
  return month;
}
