import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { addons } from 'storybook/manager-api';
import { dark, light, resolveScheme } from './themes';

type Globals = Record<string, unknown> | undefined;

const themeFor = (globals: Globals) => (resolveScheme(globals?.theme) === 'dark' ? dark : light);

addons.setConfig({ theme: themeFor(undefined) });

// The Theme toolbar drives Storybook's own UI too; Auto follows the OS while the page is open.
addons.register('react-datakit/theme', (api) => {
  let globals: Globals;
  const apply = () => {
    api.setOptions({ theme: themeFor(globals) });
  };
  const onGlobals = (event: { globals?: Globals }) => {
    globals = event.globals;
    apply();
  };
  api.on(SET_GLOBALS, onGlobals);
  api.on(GLOBALS_UPDATED, onGlobals);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
});
