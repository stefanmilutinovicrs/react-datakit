import { commands } from 'vitest/browser';

export interface EmulatedMedia {
  colorScheme?: 'light' | 'dark' | null;
  forcedColors?: 'active' | 'none' | null;
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    emulateMedia: (media: EmulatedMedia) => Promise<void>;
  }
}

/** Emulates media features for the whole page; `null` returns to the browser's own value. */
export function emulateMedia(media: EmulatedMedia): Promise<void> {
  return commands.emulateMedia(media);
}
