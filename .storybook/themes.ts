import { create } from 'storybook/theming/create';

const shared = {
  brandTitle: 'react-datakit',
  brandUrl: 'https://github.com/stefanmilutinovicrs/react-datakit',
  brandTarget: '_blank',
  fontBase: 'system-ui, sans-serif',
  appBorderRadius: 8,
  inputBorderRadius: 8,
};

export const light = create({
  ...shared,
  base: 'light',
  colorPrimary: '#4f46e5',
  colorSecondary: '#4f46e5',
  appBg: '#fafafa',
  appContentBg: '#ffffff',
  appPreviewBg: '#ffffff',
  appBorderColor: '#e4e4e7',
  textColor: '#18181b',
  textMutedColor: '#6f6f78',
  textInverseColor: '#ffffff',
  barBg: '#ffffff',
  barTextColor: '#6f6f78',
  barSelectedColor: '#4f46e5',
  barHoverColor: '#4f46e5',
  inputBg: '#ffffff',
  inputBorder: '#e4e4e7',
  inputTextColor: '#18181b',
});

export const dark = create({
  ...shared,
  base: 'dark',
  colorPrimary: '#6061ef',
  colorSecondary: '#9c96f0',
  appBg: '#09090b',
  appContentBg: '#09090b',
  appPreviewBg: '#09090b',
  appBorderColor: '#2e2e33',
  textColor: '#fafafa',
  textMutedColor: '#a1a1aa',
  textInverseColor: '#18181b',
  barBg: '#18181b',
  barTextColor: '#a1a1aa',
  barSelectedColor: '#9e99f1',
  barHoverColor: '#9e99f1',
  inputBg: '#18181b',
  inputBorder: '#2e2e33',
  inputTextColor: '#fafafa',
});

/** The scheme a Theme toolbar value resolves to; `auto` follows the OS. */
export function resolveScheme(theme: unknown): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
