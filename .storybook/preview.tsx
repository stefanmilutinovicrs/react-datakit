import { DocsContainer, type DocsContainerProps } from '@storybook/addon-docs/blocks';
import type { Decorator, Preview } from '@storybook/react-vite';
import type { PropsWithChildren } from 'react';
import '../src/styles/theme.css';
import { applyGlobals, useScheme } from './globals';
import './preview.css';
import { dark, light } from './themes';

function ThemedDocsContainer(props: PropsWithChildren<DocsContainerProps>) {
  const scheme = useScheme();
  return <DocsContainer {...props} theme={scheme === 'dark' ? dark : light} />;
}

const withGlobals: Decorator = (Story, context) => {
  applyGlobals(context.globals);
  return <Story />;
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Light or dark, for the components and the page',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        dynamicTitle: true,
        items: [
          { value: 'auto', title: 'Auto', icon: 'browser' },
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
      },
    },
    accent: {
      description: 'Accent preset (data-dk-accent)',
      toolbar: {
        title: 'Accent',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: [
          { value: 'indigo', title: 'Indigo' },
          { value: 'teal', title: 'Teal' },
          { value: 'violet', title: 'Violet' },
          { value: 'blue', title: 'Blue' },
        ],
      },
    },
  },
  initialGlobals: { theme: 'auto', accent: 'indigo' },
  decorators: [withGlobals],
  parameters: {
    controls: { expanded: true },
    backgrounds: { disable: true },
    docs: { container: ThemedDocsContainer },
    a11y: {
      // Accessibility violations fail the story, not just show a warning.
      test: 'error',
    },
  },
  tags: ['autodocs'],
};

export default preview;
