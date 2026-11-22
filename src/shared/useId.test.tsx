import { describe, expect, it } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { useId } from './useId';

describe('useId', () => {
  it('generates a prefixed id that is stable across renders', async () => {
    const { result, rerender } = await renderHook(() => useId());
    const first = result.current;

    expect(first).toMatch(/^dk-/);
    await rerender();
    expect(result.current).toBe(first);
  });

  it('generates different ids for different instances', async () => {
    const a = await renderHook(() => useId());
    const b = await renderHook(() => useId());
    expect(a.result.current).not.toBe(b.result.current);
  });

  it('prefers the id passed from props', async () => {
    const { result } = await renderHook(() => useId('my-input'));
    expect(result.current).toBe('my-input');
  });
});
