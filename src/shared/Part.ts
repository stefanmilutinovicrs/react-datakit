import { createElement, type ComponentPropsWithoutRef, type ReactElement, type Ref } from 'react';
import { mergeProps } from './mergeProps';

type Tag = 'div' | 'input' | 'label' | 'button';

/** `data-*` attributes, typed so prop getters can return them. */
export type DataAttributes = { [key: `data-${string}`]: string | undefined };

/** Props every part accepts on top of the native props of its element. */
export type PartProps<TTag extends Tag, TState> = Omit<ComponentPropsWithoutRef<TTag>, 'className'> & {
  /** A class name, or a function of the part's state that returns one. */
  className?: string | ((state: TState) => string | undefined) | undefined;
  /**
   * Replaces the default element. Receives the final props (spread them onto your
   * element, including `ref`) and the part's state.
   */
  render?: ((props: ComponentPropsWithoutRef<TTag> & { ref: Ref<never> }, state: TState) => ReactElement) | undefined;
};

interface PartElementProps<TTag extends Tag, TState> {
  tag: TTag;
  state: TState;
  ours: object;
  theirs: PartProps<TTag, TState>;
  forwardedRef:
    Ref<HTMLDivElement> | Ref<HTMLInputElement> | Ref<HTMLLabelElement> | Ref<HTMLButtonElement> | undefined;
}

/**
 * Renders a part: merges our props with the user's, resolves a state-based className,
 * attaches the ref and calls `render` when given.
 */
export function Part<TTag extends Tag, TState>({
  tag,
  state,
  ours,
  theirs,
  forwardedRef,
}: PartElementProps<TTag, TState>): ReactElement {
  const { className, render, ...rest } = theirs;
  const resolvedClassName = typeof className === 'function' ? className(state) : className;
  const props = mergeProps(ours, { ...rest, className: resolvedClassName }) as ComponentPropsWithoutRef<TTag>;
  const withRef = { ...props, ref: forwardedRef as Ref<never> };
  return render ? render(withRef, state) : createElement(tag, withRef);
}
