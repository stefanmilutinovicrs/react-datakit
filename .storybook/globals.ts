import { useSyncExternalStore } from 'react';
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';
import { resolveScheme } from './themes';

type Globals = Record<string, unknown>;

let current: Globals = {};
const listeners = new Set<() => void>();
const media = window.matchMedia('(prefers-color-scheme: dark)');

/** Puts the toolbar values on the preview's <html>, where the components and the page read them. */
export function applyGlobals(globals: Globals): void {
  current = globals;
  const root = document.documentElement;
  const { theme, accent } = globals;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-dk-theme', theme);
  else root.removeAttribute('data-dk-theme');
  if (typeof accent === 'string') root.setAttribute('data-dk-accent', accent);
  else root.removeAttribute('data-dk-accent');
  for (const listener of listeners) listener();
}

// Docs pages render outside story decorators, so they follow the globals through the channel.
const onGlobals = (event: { globals?: Globals }) => {
  if (event.globals) applyGlobals(event.globals);
};
const channel = addons.getChannel();
channel.on(SET_GLOBALS, onGlobals);
channel.on(GLOBALS_UPDATED, onGlobals);

function subscribe(listener: () => void) {
  listeners.add(listener);
  media.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', listener);
  };
}

/** The scheme the Theme toolbar resolves to, updated when it or the OS setting changes. */
export function useScheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribe, () => resolveScheme(current.theme));
}
