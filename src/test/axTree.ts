import { commands, server } from 'vitest/browser';

export interface AxNode {
  role: string;
  name: string;
}

/** An option in the browser's own accessibility tree, with the nearest group or listbox above it. CDP doesn't expose setsize and posinset. */
export interface AxOption extends AxNode {
  container: AxNode | null;
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    axOption: (name: string) => Promise<AxOption | null>;
  }
}

// Only Chromium exposes its computed tree to Playwright (through CDP); Firefox and WebKit don't.
export const hasNativeAxTree = server.browser === 'chromium';

/** Reads the option named `name` from Chromium's computed accessibility tree. */
export function axOption(name: string): Promise<AxOption | null> {
  return commands.axOption(name);
}
