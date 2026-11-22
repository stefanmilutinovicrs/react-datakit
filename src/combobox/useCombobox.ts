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
import { useControllableState, useDebounce, useId, useLatestRef, type DataAttributes } from '../shared';

export interface LoadOptionsContext {
  /** Aborted when a newer query starts, the list closes or the combobox unmounts. */
  signal: AbortSignal;
}

export interface UseComboboxOptions<TItem> {
  /** Base id for the generated element ids. Defaults to a `useId()` value. */
  id?: string | undefined;
  /** Static options, filtered locally by `filter`. Use either `items` or `loadOptions`. */
  items?: readonly TItem[] | undefined;
  /** Async options for the current query. Debounced, cancelled and cached per query. */
  loadOptions?: ((query: string, context: LoadOptionsContext) => Promise<readonly TItem[]>) | undefined;
  /** Local filter for `items`. Defaults to a case-insensitive "contains" on `itemToString`. */
  filter?: ((item: TItem, query: string) => boolean) | undefined;

  /** Text shown in the input for an item; `null` means nothing is selected. */
  itemToString: (item: TItem | null) => string;
  /** Stable, unique key for an item. */
  itemToKey: (item: TItem) => string | number;

  value?: TItem | null | undefined;
  defaultValue?: TItem | null | undefined;
  onChange?: ((value: TItem | null) => void) | undefined;

  /** Debounce for `loadOptions`, in milliseconds. Default 250. */
  debounceMs?: number | undefined;
  /** Tab selects the highlighted option before focus moves on. Default false. */
  selectOnTab?: boolean | undefined;
  /** Text for the screen reader announcement of the result count. Default "No results" / "1 result" / "N results". */
  formatResultCount?: ((count: number) => string) | undefined;
}

/** `idle` while closed, `loading` while `loadOptions` runs, then `success` or `error`. */
export type ComboboxStatus = 'idle' | 'loading' | 'success' | 'error';

/** What moved the highlight. Only keyboard moves scroll the list. */
export type HighlightOrigin = 'keyboard' | 'pointer';

export interface UseComboboxReturn<TItem> {
  ids: { root: string; label: string; input: string; list: string };
  isOpen: boolean;
  /** Text in the input: what the user typed, or `itemToString(selectedItem)`. */
  inputValue: string;
  /** What the user typed since the last selection, or `null` when not searching. */
  query: string | null;
  selectedItem: TItem | null;
  /** Options for the current query. */
  items: readonly TItem[];
  /** Index into `items`, or -1. */
  highlightedIndex: number;
  highlightOrigin: HighlightOrigin;
  status: ComboboxStatus;
  error: unknown;
  /** Result count text for the live region; empty while closed, loading or failed. */
  statusMessage: string;

  open: (highlight?: 'first' | 'last' | 'none') => void;
  close: () => void;
  selectItem: (item: TItem) => void;
  clear: () => void;
  highlight: (index: number, origin?: HighlightOrigin) => void;
  /** Loads the current query again after an error. */
  retry: () => void;
  isSelected: (item: TItem) => boolean;
  itemToKey: (item: TItem) => string | number;
  itemToString: (item: TItem | null) => string;
  /** Called by a label part so the listbox can reference it. Returns the cleanup. */
  registerLabel: () => () => void;

  getRootProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes & { ref: RefObject<HTMLDivElement | null> };
  getLabelProps: () => LabelHTMLAttributes<HTMLLabelElement> & DataAttributes;
  getInputProps: () => InputHTMLAttributes<HTMLInputElement> & DataAttributes;
  getListProps: () => HTMLAttributes<HTMLDivElement> & DataAttributes;
  getOptionProps: (item: TItem, index: number) => HTMLAttributes<HTMLDivElement> & DataAttributes;
}

type AsyncResult<TItem> = { status: 'success'; items: readonly TItem[] } | { status: 'error'; error: unknown };

const EMPTY: readonly never[] = [];
const MAX_CACHED_QUERIES = 100;

function defaultFormatResultCount(count: number): string {
  if (count === 0) return 'No results';
  return count === 1 ? '1 result' : `${count} results`;
}

function withEntry<K, V>(map: ReadonlyMap<K, V>, key: K, value: V): Map<K, V> {
  const next = new Map(map);
  next.delete(key);
  next.set(key, value);
  while (next.size > MAX_CACHED_QUERIES) next.delete(next.keys().next().value as K);
  return next;
}

/**
 * Headless combobox (WAI-ARIA APG pattern with a listbox popup and `aria-autocomplete="list"`).
 * DOM focus stays in the input; the highlighted option is exposed with `aria-activedescendant`.
 *
 * @experimental
 */
export function useCombobox<TItem>(options: UseComboboxOptions<TItem>): UseComboboxReturn<TItem> {
  const { items: staticSource, loadOptions, filter, itemToString, itemToKey, selectOnTab = false } = options;
  const debounceMs = options.debounceMs ?? 250;
  const formatResultCount = options.formatResultCount ?? defaultFormatResultCount;

  const baseId = useId(options.id);
  const ids = useMemo(
    () => ({ root: baseId, label: `${baseId}-label`, input: `${baseId}-input`, list: `${baseId}-list` }),
    [baseId],
  );
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [selectedItem, setSelectedItem] = useControllableState<TItem | null>({
    value: options.value,
    defaultValue: options.defaultValue ?? null,
    onChange: options.onChange,
  });
  const [query, setQuery] = useState<string | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [highlightState, setHighlightState] = useState<{ index: number; origin: HighlightOrigin }>({
    index: -1,
    origin: 'keyboard',
  });
  const [labelCount, setLabelCount] = useState(0);

  // Static options.
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
  const highlightedIndex = isOpen && highlightState.index < items.length ? highlightState.index : -1;
  const statusMessage = status === 'success' ? formatResultCount(items.length) : '';

  // Actions.
  const highlight = useCallback((index: number, origin: HighlightOrigin = 'keyboard') => {
    setHighlightState({ index, origin });
  }, []);

  const open = useCallback(
    (initial: 'first' | 'last' | 'none' = 'none') => {
      setOpen(true);
      const index = initial === 'first' ? 0 : initial === 'last' ? items.length - 1 : -1;
      setHighlightState({ index: items.length > 0 ? index : -1, origin: 'keyboard' });
    },
    [items.length],
  );

  const close = useCallback(() => {
    setOpen(false);
    setHighlightState({ index: -1, origin: 'keyboard' });
  }, []);

  const selectItem = useCallback(
    (item: TItem) => {
      setSelectedItem(item);
      setQuery(null);
      close();
    },
    [setSelectedItem, close],
  );

  const clear = useCallback(() => {
    setSelectedItem(null);
    setQuery(null);
  }, [setSelectedItem]);

  const retry = useCallback(() => {
    if (requestQuery === null) return;
    setResults((prev) => {
      const next = new Map(prev);
      next.delete(requestQuery);
      return next;
    });
  }, [requestQuery]);

  const isSelected = useCallback(
    (item: TItem) => selectedItem !== null && itemToKey(selectedItem) === itemToKey(item),
    [selectedItem, itemToKey],
  );

  const registerLabel = useCallback(() => {
    setLabelCount((count) => count + 1);
    return () => {
      setLabelCount((count) => count - 1);
    };
  }, []);

  // Event handlers.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = items.length;
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
      case 'Enter': {
        const item = highlightedIndex >= 0 ? items[highlightedIndex] : undefined;
        if (isOpen && item !== undefined) {
          event.preventDefault();
          selectItem(item);
        }
        break;
      }
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          close();
        } else if (query !== null || selectedItem !== null) {
          event.preventDefault();
          clear();
        }
        break;
      case 'Tab': {
        const item = highlightedIndex >= 0 ? items[highlightedIndex] : undefined;
        if (isOpen && selectOnTab && item !== undefined) selectItem(item);
        else if (isOpen) close();
        break;
      }
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
    // Leaving with an emptied input clears the value; any other unfinished typing is discarded.
    if (query === '') setSelectedItem(null);
    setQuery(null);
    close();
  };

  const dataState = isOpen ? 'open' : 'closed';
  const activeDescendant = highlightedIndex >= 0 ? `${ids.list}-option-${highlightedIndex}` : undefined;

  return {
    ids,
    isOpen,
    inputValue: query ?? itemToString(selectedItem),
    query,
    selectedItem,
    items,
    highlightedIndex,
    highlightOrigin: highlightState.origin,
    status,
    error,
    statusMessage,
    open,
    close,
    selectItem,
    clear,
    highlight,
    retry,
    isSelected,
    itemToKey,
    itemToString,
    registerLabel,

    getRootProps: () => ({
      ref: rootRef,
      'data-dk-part': 'combobox',
      'data-state': dataState,
      onBlur: onRootBlur,
    }),
    getLabelProps: () => ({
      id: ids.label,
      htmlFor: ids.input,
      'data-dk-part': 'combobox-label',
    }),
    getInputProps: () => ({
      id: ids.input,
      type: 'text',
      role: 'combobox',
      autoComplete: 'off',
      'aria-autocomplete': 'list',
      'aria-expanded': isOpen,
      'aria-controls': isOpen ? ids.list : undefined,
      'aria-activedescendant': activeDescendant,
      value: query ?? itemToString(selectedItem),
      onChange: onInputChange,
      onKeyDown,
      'data-dk-part': 'combobox-input',
      'data-state': dataState,
    }),
    getListProps: () => ({
      id: ids.list,
      role: 'listbox',
      tabIndex: -1,
      'aria-labelledby': labelCount > 0 ? ids.label : undefined,
      'aria-busy': status === 'loading' ? true : undefined,
      // Keeps focus in the input when the user clicks an option or the scrollbar.
      onMouseDown: (event) => {
        event.preventDefault();
      },
      'data-dk-part': 'combobox-list',
      'data-state': dataState,
      'data-loading': status === 'loading' ? '' : undefined,
    }),
    getOptionProps: (item, index) => {
      const highlighted = index === highlightedIndex;
      const selected = isSelected(item);
      return {
        id: `${ids.list}-option-${index}`,
        role: 'option',
        'aria-selected': selected,
        'aria-setsize': items.length,
        'aria-posinset': index + 1,
        onMouseMove: () => {
          if (!highlighted) highlight(index, 'pointer');
        },
        onClick: () => {
          selectItem(item);
        },
        'data-dk-part': 'combobox-option',
        'data-highlighted': highlighted ? '' : undefined,
        'data-selected': selected ? '' : undefined,
      };
    },
  };
}
