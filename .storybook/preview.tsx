import type { Preview } from '@storybook/react-vite';
import '../src/styles/theme.css';
import './preview.css';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    a11y: {
      // Accessibility violations fail the story, not just show a warning.
      test: 'error',
    },
  },
  tags: ['autodocs'],
};

export default preview;
