import { describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { useControllableState } from './useControllableState';

describe('useControllableState', () => {
  describe('uncontrolled', () => {
    it('starts from defaultValue and updates its own state', async () => {
      const onChange = vi.fn();
      const { result, act } = await renderHook(() => useControllableState({ defaultValue: 1, onChange }));

      expect(result.current[0]).toBe(1);
      await act(() => result.current[1](2));

      expect(result.current[0]).toBe(2);
      expect(onChange).toHaveBeenCalledExactlyOnceWith(2);
    });

    it('composes several updater calls within one event', async () => {
      const { result, act } = await renderHook(() => useControllableState({ defaultValue: 0 }));

      await act(() => {
        result.current[1]((n) => n + 1);
        result.current[1]((n) => n + 1);
      });

      expect(result.current[0]).toBe(2);
    });
  });

  describe('controlled', () => {
    it('reflects the value prop and only reports changes through onChange', async () => {
      const onChange = vi.fn();
      const { result, act, rerender } = await renderHook(
        (props?: { value: string }) => useControllableState({ value: props?.value, defaultValue: 'unused', onChange }),
        { initialProps: { value: 'a' } },
      );

      expect(result.current[0]).toBe('a');
      await act(() => result.current[1]('b'));

      // The parent has not accepted the change yet, so the value stays.
      expect(result.current[0]).toBe('a');
      expect(onChange).toHaveBeenCalledExactlyOnceWith('b');

      await rerender({ value: 'b' });
      expect(result.current[0]).toBe('b');
    });

    it('treats null as a controlled empty value', async () => {
      const { result, act } = await renderHook(() =>
        useControllableState<string | null>({ value: null, defaultValue: 'unused' }),
      );

      expect(result.current[0]).toBeNull();
      await act(() => result.current[1]('x'));
      expect(result.current[0]).toBeNull();
    });
  });

  it('does not call onChange when the value is unchanged', async () => {
    const onChange = vi.fn();
    const { result, act } = await renderHook(() => useControllableState({ defaultValue: 'same', onChange }));

    await act(() => result.current[1]('same'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the setter stable across renders', async () => {
    const { result, act } = await renderHook(() => useControllableState({ defaultValue: 0 }));
    const firstSetter = result.current[1];

    await act(() => result.current[1](5));
    expect(result.current[1]).toBe(firstSetter);
  });

  it('warns when switching between controlled and uncontrolled', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = await renderHook(
      (props?: { value: number | undefined }) => useControllableState({ value: props?.value, defaultValue: 0 }),
      { initialProps: { value: undefined as number | undefined } },
    );

    await rerender({ value: 3 });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('switched from uncontrolled to controlled'));
    warn.mockRestore();
  });
});
