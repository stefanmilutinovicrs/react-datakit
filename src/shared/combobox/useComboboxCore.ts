import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type LabelHTMLAttributes,
  type RefObject,
} from 'react';
import type { DataAttributes } from '../Part';
import { useDebounce } from '../useDebounce';
import { useId } from '../useId';
import { useLatestRef } from '../useLatestRef';
import { comboboxParts, multiselectParts } from '../partNames';
import { optionKeys } from '../splitProps';

export interface LoadOptionsContext {
  /** Aborted when a newer query starts, the list closes or the component unmounts. */
  signal: AbortSignal;
}

export interface ComboboxBaseOptions<TItem> {
  /** Base id for the generated element ids. Defaults to a `useId()` value. */
  id?: string | undefined;
  /** Static options, filtered locally by `filter`. Use either `items` or `loadOptions`. */
  items?: readonly TItem[] | undefined;
  /** Async options for the current query. Debounced, cancelled and cached per query. */
  loadOptions?: ((query: string, context: LoadOptionsContext) => Promise<readonly TItem[]>) | undefined;
  /** Local filter for `items`. Defaults to a case-insensitive "contains" on `itemToString`. */
  filter?: ((item: TItem, query: string) => boolean) | undefined;
  itemToString: (item: TItem | null) => string;
  /** Stable, unique key for an item. */
  itemToKey: (item: TItem) => string | number;
  /** Debounce for `loadOptions`, in milliseconds. Default 250. */
  debounceMs?: number | undefined;
  /** Screen reader texts; English by default. */
  labels?: Partial<ComboboxLabels> | undefined;
}

export interface ComboboxLabels {
  /** Announced in the live region after each search. */
  resultCount: (count: number) => string;
}

export const defaultComboboxLabels: ComboboxLabels = {
  resultCount: (count) => (count === 0 ? 'No results' : count === 1 ? '1 result' : `${count} results`),
};

export const comboboxBaseOptionKeys = optionKeys<ComboboxBaseOptions<unknown>>()([
  'id',
  'items',
  'loadOptions',
  'filter',
  'itemToString',
  'itemToKey',
  'debounceMs',
  'labels',
]);

/** A row of the listbox: an option, or one of the MultiSelect action rows. */
export type ComboboxRow<TItem> =
  { type: 'option'; item: TItem } | { type: 'select-all' } | { type: 'create'; query: string };

/** `idle` while closed, `loading` while `loadOptions` runs, then `success` or `error`. */
export type ComboboxStatus = 'idle' | 'loading' | 'success' | 'error';

/** What moved the highlight. Only keyboard moves scroll the list. */
export type HighlightOrigin = 'keyboard' | 'pointer';

/** Part name prefix for `data-dk-part`. */
export type ComboboxPartPrefix = 'combobox' | 'multiselect';

export interface ComboboxCoreBehavior<TItem> {
  part: ComboboxPartPrefix;
  multiple: boolean;
  isSelected: (item: TItem) => boolean;
  isDisabled: (item: TItem) => boolean;
  /** Input text while the user is not searching. */
  displayValue: string;
  selectAll: boolean;
  creatable: boolean;
  /** The create row is shown but can't be picked (e.g. `max` is reached). */
  createDisabled: boolean;
  /** Whether the select-all row reads as selected for the given options. */
  allSelected: (items: readonly TItem[]) => boolean;
  activate: (row: ComboboxRow<TItem>, items: readonly TItem[]) => void;
  selectOnTab: boolean;
  /** Escape on a closed popup. Returns true when it changed something. */
  clearOnEscape: (query: string | null) => boolean;
  onLeave: (query: string | null) => void;
  /** Runs before the core keyboard handling; return true to stop it. */
  onInputKeyDown?: ((event: KeyboardEvent<HTMLInputElement>, query: string | null) => boolean) | undefined;
}

export interface ComboboxCore<TItem> {
  part: ComboboxPartPrefix;
  ids: { root: string; label: string; input: string; list: string };
  rootRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  isOpen: boolean;
  inputValue: string;
  /** What the user typed since the last selection, or `null` when not searching. */
  query: string | null;
  items: readonly TItem[];
  /** Listbox rows: the options plus action rows (select all, create). */
  rows: readonly ComboboxRow<TItem>[];
  /** Index into `rows`, or -1. */
  highlightedIndex: number;
  highlightOrigin: HighlightOrigin;
  status: ComboboxStatus;
  error: unknown;
  /** Result count text for the live region; empty while closed, loading or failed. */
  statusMessage: string;

  open: (highlight?: 'first' | 'last' | 'none') => void;
  close: () => void;
  highlight: (index: number, origin?: HighlightOrigin) => void;
  activate: (row: ComboboxRow<TItem>) => void;
  /** Loads the current query again after an error. */
  retry: () => void;
  setQuery: (query: string | null) => void;
  isSelected: (item: TItem) => boolean;
  isDisabled: (item: TItem) => boolean;
  itemToKey: (item: TItem) => string | number;
  itemToString: (item: TItem | null) => string;
  /** Called by a label part so the listbox can reference it. Returns the cleanup. */
  registerLabel: () => () => void;

  getRootProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getLabelProps: () => LabelHTMLAttributes<HTMLLabelElement> & DataAttributes;
  getControlProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getInputProps: () => InputHTMLAttributes<HTMLInputElement> & DataAttributes;
  getListProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getPopupProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getEmptyProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getLoadingProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getErrorProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getRowProps: (row: ComboboxRow<TItem>, index: number) => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getOptionProps: (item: TItem, index: number) => HTMLAttributes<HTMLDivElement> & DataAttributes;
}

type AsyncResult<TItem> = { status: 'success'; items: readonly TItem[] } | { status: 'error'; error: unknown };

const EMPTY: readonly never[] = [];
const MAX_CACHED_QUERIES = 100;

function withEntry<K, V>(map: ReadonlyMap<K, V>, key: K, value: V): Map<K, V> {
  const next = new Map(map);
  next.delete(key);
  next.set(key, value);
  while (next.size > MAX_CACHED_QUERIES) next.delete(next.keys().next().value as K);
  return next;
}

export function rowKey<TItem>(row: ComboboxRow<TItem>, itemToKey: (item: TItem) => string | number): string {
  return row.type === 'option' ? `option:${itemToKey(row.item)}` : row.type;
}

export function useComboboxCore<TItem>(
  options: ComboboxBaseOptions<TItem>,
  behavior: ComboboxCoreBehavior<TItem>,
): ComboboxCore<TItem> {
  const { items: staticSource, loadOptions, filter, itemToString, itemToKey } = options;
  const { part, multiple, isSelected, isDisabled } = behavior;
  const names = part === 'combobox' ? comboboxParts : multiselectParts;
  const debounceMs = options.debounceMs ?? 250;
  const resultCount = options.labels?.resultCount ?? defaultComboboxLabels.resultCount;

  const baseId = useId(options.id);
  const ids = useMemo(
    () => ({ root: baseId, label: `${baseId}-label`, input: `${baseId}-input`, list: `${baseId}-list` }),
    [baseId],
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState<string | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [highlightState, setHighlightState] = useState<{ index: number; origin: HighlightOrigin }>({
    index: -1,
    origin: 'keyboard',
  });
  const [labelCount, setLabelCount] = useState(0);

  const isAsync = loadOptions !== undefined;
  const staticItems = useMemo(() => {
    if (isAsync) return EMPTY;
    const all = staticSource ?? EMPTY;
    if (!query) return all;
    const needle = query.toLowerCase();
    const matches = filter ?? ((item: TItem) => itemToString(item).toLowerCase().includes(needle));
    return all.filter((item) => matches(item, query));
  }, [isAsync, staticSource, query, filter, itemToString]);

  // Async options: one request per (debounced) query, aborted when superseded, cached per query.
  const requestQuery = isAsync && isOpen ? (query ?? '') : null;
  const debouncedQuery = useDebounce(requestQuery, debounceMs);
  const [results, setResults] = useState<ReadonlyMap<string, AsyncResult<TItem>>>(() => new Map());
  const loadOptionsRef = useLatestRef(loadOptions);

  useEffect(() => {
    const load = loadOptionsRef.current;
    if (!load || debouncedQuery === null || results.has(debouncedQuery)) return;
    const controller = new AbortController();
    const forQuery = debouncedQuery;
    load(forQuery, { signal: controller.signal }).then(
      (loaded) => {
        if (!controller.signal.aborted)
          setResults((prev) => withEntry(prev, forQuery, { status: 'success', items: loaded }));
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setResults((prev) => withEntry(prev, forQuery, { status: 'error', error }));
      },
    );
    return () => {
      controller.abort();
    };
  }, [debouncedQuery, results, loadOptionsRef]);

  const current = requestQuery === null ? undefined : results.get(requestQuery);
  let status: ComboboxStatus;
  if (!isOpen) status = 'idle';
  else if (!isAsync) status = 'success';
  else status = current === undefined ? 'loading' : current.status;

  const items: readonly TItem[] = isAsync ? (current?.status === 'success' ? current.items : EMPTY) : staticItems;
  const error = current?.status === 'error' ? current.error : undefined;

  const trimmedQuery = query?.trim() ?? '';
  const showSelectAll = behavior.selectAll && status === 'success' && items.length > 0;
  const showCreate =
    behavior.creatable &&
    status === 'success' &&
    trimmedQuery !== '' &&
    !items.some((item) => itemToString(item).toLowerCase() === trimmedQuery.toLowerCase());
  const rows = useMemo<readonly ComboboxRow<TItem>[]>(() => {
    const optionRows = items.map((item): ComboboxRow<TItem> => ({ type: 'option', item }));
    if (!showSelectAll && !showCreate) return optionRows;
    return [
      ...(showSelectAll ? [{ type: 'select-all' } as const] : []),
      ...optionRows,
      ...(showCreate ? [{ type: 'create', query: trimmedQuery } as const] : []),
    ];
  }, [items, showSelectAll, showCreate, trimmedQuery]);

  const highlightedIndex = isOpen && highlightState.index < rows.length ? highlightState.index : -1;
  const statusMessage = status === 'success' ? resultCount(items.length) : '';

  const highlight = useCallback((index: number, origin: HighlightOrigin = 'keyboard') => {
    setHighlightState({ index, origin });
  }, []);

  const open = useCallback(
    (initial: 'first' | 'last' | 'none' = 'none') => {
      setOpen(true);
      const index = initial === 'first' ? 0 : initial === 'last' ? rows.length - 1 : -1;
      setHighlightState({ index: rows.length > 0 ? index : -1, origin: 'keyboard' });
    },
    [rows.length],
  );

  const close = useCallback(() => {
    setOpen(false);
    setHighlightState({ index: -1, origin: 'keyboard' });
  }, []);

  const isRowDisabled = (row: ComboboxRow<TItem>) =>
    row.type === 'option' ? isDisabled(row.item) : row.type === 'create' && behavior.createDisabled;

  const activate = (row: ComboboxRow<TItem>) => {
    if (isRowDisabled(row)) return;
    behavior.activate(row, items);
    if (!multiple) {
      setQuery(null);
      close();
    } else if (query !== null) {
      // The query is cleared after a pick; the full list comes back without a highlight.
      setQuery(null);
      setHighlightState({ index: -1, origin: 'keyboard' });
    }
  };

  const retry = useCallback(() => {
    if (requestQuery === null) return;
    setResults((prev) => {
      const next = new Map(prev);
      next.delete(requestQuery);
      return next;
    });
  }, [requestQuery]);

  const registerLabel = useCallback(() => {
    setLabelCount((count) => count + 1);
    return () => {
      setLabelCount((count) => count - 1);
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (behavior.onInputKeyDown?.(event, query)) return;
    const count = rows.length;
    const highlightedRow = highlightedIndex >= 0 ? rows[highlightedIndex] : undefined;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (event.altKey) {
          if (!isOpen) open('none');
        } else if (!isOpen) {
          open('first');
        } else if (count > 0) {
          highlight(highlightedIndex + 1 >= count ? 0 : highlightedIndex + 1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (event.altKey) {
          close();
        } else if (!isOpen) {
          open('last');
        } else if (count > 0) {
          highlight(highlightedIndex <= 0 ? count - 1 : highlightedIndex - 1);
        }
        break;
      case 'Enter':
        if (isOpen && highlightedRow !== undefined) {
          event.preventDefault();
          activate(highlightedRow);
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          close();
        } else if (behavior.clearOnEscape(query)) {
          event.preventDefault();
          setQuery(null);
        }
        break;
      case 'Tab':
        if (isOpen && behavior.selectOnTab && highlightedRow !== undefined) activate(highlightedRow);
        if (isOpen) close();
        break;
    }
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setOpen(true);
    setHighlightState({ index: -1, origin: 'keyboard' });
  };

  const onRootBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && rootRef.current?.contains(next)) return;
    behavior.onLeave(query);
    setQuery(null);
    close();
  };

  const dataState = isOpen ? 'open' : 'closed';
  const rowId = (index: number) => `${ids.list}-option-${index}`;

  const getRowProps = (row: ComboboxRow<TItem>, index: number): HTMLAttributes<HTMLDivElement> & DataAttributes => {
    const highlighted = index === highlightedIndex;
    const selected =
      row.type === 'option' ? isSelected(row.item) : row.type === 'select-all' ? behavior.allSelected(items) : false;
    const disabled = isRowDisabled(row);
    const rowPart =
      row.type === 'option'
        ? names.option
        : row.type === 'select-all'
          ? multiselectParts.selectAll
          : multiselectParts.create;
    return {
      id: rowId(index),
      role: 'option',
      'aria-selected': selected,
      'aria-disabled': disabled ? true : undefined,
      'aria-setsize': rows.length,
      'aria-posinset': index + 1,
      onMouseMove: () => {
        if (!highlighted) highlight(index, 'pointer');
      },
      onClick: () => {
        activate(row);
      },
      'data-dk-part': rowPart,
      'data-highlighted': highlighted ? '' : undefined,
      'data-selected': selected ? '' : undefined,
      'data-disabled': disabled ? '' : undefined,
    };
  };

  return {
    part,
    ids,
    rootRef,
    inputRef,
    isOpen,
    inputValue: query ?? behavior.displayValue,
    query,
    items,
    rows,
    highlightedIndex,
    highlightOrigin: highlightState.origin,
    status,
    error,
    statusMessage,
    open,
    close,
    highlight,
    activate,
    retry,
    setQuery,
    isSelected,
    isDisabled,
    itemToKey,
    itemToString,
    registerLabel,

    getRootProps: () => ({
      'data-dk-part': names.root,
      'data-state': dataState,
      onBlur: onRootBlur,
    }),
    getLabelProps: () => ({
      id: ids.label,
      htmlFor: ids.input,
      'data-dk-part': names.label,
    }),
    getControlProps: () => ({
      'data-dk-part': names.control,
      'data-state': dataState,
      // A click on the empty area of the field focuses the input.
      onMouseDown: (event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        inputRef.current?.focus();
      },
    }),
    getInputProps: () => ({
      id: ids.input,
      type: 'text',
      role: 'combobox',
      autoComplete: 'off',
      'aria-autocomplete': 'list',
      'aria-expanded': isOpen,
      'aria-controls': isOpen ? ids.list : undefined,
      'aria-activedescendant': highlightedIndex >= 0 ? rowId(highlightedIndex) : undefined,
      value: query ?? behavior.displayValue,
      onChange: onInputChange,
      onKeyDown,
      'data-dk-part': names.input,
      'data-state': dataState,
    }),
    getListProps: () => ({
      id: ids.list,
      role: 'listbox',
      tabIndex: -1,
      'aria-labelledby': labelCount > 0 ? ids.label : undefined,
      'aria-multiselectable': multiple ? true : undefined,
      'aria-busy': status === 'loading' ? true : undefined,
      // Keeps focus in the input when the user clicks an option or the scrollbar.
      onMouseDown: (event) => {
        event.preventDefault();
      },
      'data-dk-part': names.list,
      'data-state': dataState,
      'data-loading': status === 'loading' ? '' : undefined,
    }),
    getPopupProps: () => ({
      // Clicks inside the popup (options, retry button) keep focus in the input.
      onMouseDown: (event) => {
        event.preventDefault();
      },
      'data-dk-part': names.popup,
      'data-state': dataState,
      'data-loading': status === 'loading' ? '' : undefined,
    }),
    getEmptyProps: () => ({ 'data-dk-part': names.empty }),
    getLoadingProps: () => ({ 'data-dk-part': names.loading, 'data-loading': '' }),
    getErrorProps: () => ({ role: 'alert', 'data-dk-part': names.error }),
    getRowProps,
    getOptionProps: (item, index) => getRowProps({ type: 'option', item }, index),
  };
}
