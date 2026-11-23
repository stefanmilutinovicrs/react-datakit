import { describe, expect, expectTypeOf, it } from 'vitest';
import { optionKeys, splitProps } from './splitProps';

interface Options {
  value?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
}

describe('splitProps', () => {
  it('splits hook options from the rest', () => {
    const onChange = () => {};
    const [options, rest] = splitProps({ value: 'a', onChange, title: 'x', 'data-x': '1' }, ['value', 'onChange']);
    expect(options).toEqual({ value: 'a', onChange });
    expect(rest).toEqual({ title: 'x', 'data-x': '1' });
    expectTypeOf(rest).toEqualTypeOf<{ title: string; 'data-x': string }>();
  });

  it('leaves out options that were not passed', () => {
    const props: Options & { title: string } = { title: 'x' };
    const [options, rest] = splitProps(props, ['value', 'onChange']);
    expect(options).toEqual({});
    expect(Object.keys(options)).toEqual([]);
    expect(rest).toEqual({ title: 'x' });
  });
});

describe('optionKeys', () => {
  it('accepts a complete list of option keys', () => {
    expect(optionKeys<Options>()(['value', 'onChange'])).toEqual(['value', 'onChange']);
  });

  it('rejects a list with a missing option', () => {
    // @ts-expect-error onChange is missing.
    expect(optionKeys<Options>()(['value'])).toEqual(['value']);
  });
});
