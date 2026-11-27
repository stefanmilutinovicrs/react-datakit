const NO_BREAK_SPACE = String.fromCharCode(160);

/**
 * A live region reads a text again only when its content changes, so every other announcement
 * (by `count`) ends with a no-break space.
 */
export function announcementText(text: string, count: number): string {
  return count % 2 === 0 ? text + NO_BREAK_SPACE : text;
}
