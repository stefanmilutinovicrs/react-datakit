import { expect, vi } from 'vitest';

/** Captures React's warnings about unknown or invalid DOM props while `run` renders. */
export async function expectNoOptionsOnDom(run: () => Promise<Element>, keys: readonly string[]): Promise<void> {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const element = await run();
    const attributes = element.getAttributeNames();
    expect(keys.filter((key) => attributes.includes(key.toLowerCase()))).toEqual([]);
    expect(errors.mock.calls.map((call) => String(call[0]))).toEqual([]);
  } finally {
    errors.mockRestore();
  }
}
