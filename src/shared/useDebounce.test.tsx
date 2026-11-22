import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', async () => {
    const { result } = await renderHook(() => useDebounce('a', 250));
    expect(result.current).toBe('a');
  });

  it('updates only after the value stops changing for the delay', async () => {
    const { result, rerender, act } = await renderHook((props?: { value: string }) => useDebounce(props?.value, 250), {
      initialProps: { value: 'a' },
    });

    await rerender({ value: 'ab' });
    await act(() => vi.advanceTimersByTime(200));
    await rerender({ value: 'abc' });
    await act(() => vi.advanceTimersByTime(200));

    // 400 ms have passed, but never 250 ms without a change.
    expect(result.current).toBe('a');

    await act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe('abc');
  });

  it('passes through without delay when delayMs is 0', async () => {
    const { result, rerender } = await renderHook((props?: { value: number }) => useDebounce(props?.value, 0), {
      initialProps: { value: 1 },
    });

    await rerender({ value: 2 });
    expect(result.current).toBe(2);
  });

  it('stores function values as values, not as updaters', async () => {
    const fn = () => 'called';
    const { result, rerender, act } = await renderHook(
      (props?: { value: () => string }) => useDebounce(props?.value, 100),
      { initialProps: { value: () => 'first' } },
    );

    await rerender({ value: fn });
    await act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(fn);
  });
});
