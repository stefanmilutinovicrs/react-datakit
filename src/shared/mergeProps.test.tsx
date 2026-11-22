import { describe, expect, it, vi } from 'vitest';
import { mergeProps } from './mergeProps';

describe('mergeProps', () => {
  it('lets user props override plain props', () => {
    expect(mergeProps({ id: 'a', role: 'option' }, { id: 'b' })).toEqual({ id: 'b', role: 'option' });
  });

  it('ignores undefined user props', () => {
    expect(mergeProps({ id: 'a' }, { id: undefined })).toEqual({ id: 'a' });
  });

  it('calls both handlers, user first', () => {
    const order: string[] = [];
    const merged = mergeProps({ onClick: () => order.push('ours') }, { onClick: () => order.push('theirs') });
    merged.onClick();
    expect(order).toEqual(['theirs', 'ours']);
  });

  it('skips our handler when the user handler prevents default', () => {
    const ours = vi.fn();
    const merged = mergeProps({ onKeyDown: ours }, { onKeyDown: (event: Event) => event.preventDefault() });
    merged.onKeyDown(new KeyboardEvent('keydown', { cancelable: true }));
    expect(ours).not.toHaveBeenCalled();
  });

  it('joins class names and merges styles, keeping our computed values', () => {
    const merged = mergeProps(
      { className: 'ours', style: { top: 10, color: 'red' } },
      { className: 'theirs', style: { top: 99, background: 'blue' } },
    );
    expect(merged.className).toBe('ours theirs');
    expect(merged.style).toEqual({ top: 10, color: 'red', background: 'blue' });
  });
});
