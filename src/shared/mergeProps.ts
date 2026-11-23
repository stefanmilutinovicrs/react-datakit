type Props = Record<string, unknown>;
type Handler = (event: unknown, ...rest: unknown[]) => void;

function isHandlerKey(key: string): boolean {
  return key.length > 2 && key.startsWith('on') && key.charCodeAt(2) >= 65 && key.charCodeAt(2) <= 90;
}

function isDefaultPrevented(event: unknown): boolean {
  return typeof event === 'object' && event !== null && 'defaultPrevented' in event && event.defaultPrevented === true;
}

/** Merges a part's props with the user's; `event.preventDefault()` in the user's handler skips the built-in one. */
export function mergeProps<A extends object, B extends object>(ours: A, theirs: B): A & B {
  const result: Props = { ...(ours as Props) };
  for (const [key, theirValue] of Object.entries(theirs)) {
    if (theirValue === undefined) continue;
    const ourValue = result[key];

    if (isHandlerKey(key) && typeof ourValue === 'function' && typeof theirValue === 'function') {
      const ourHandler = ourValue as Handler;
      const theirHandler = theirValue as Handler;
      result[key] = (event: unknown, ...rest: unknown[]) => {
        theirHandler(event, ...rest);
        if (!isDefaultPrevented(event)) ourHandler(event, ...rest);
      };
    } else if (key === 'className' && typeof ourValue === 'string' && typeof theirValue === 'string') {
      result[key] = `${ourValue} ${theirValue}`;
    } else if (key === 'style' && typeof ourValue === 'object' && typeof theirValue === 'object') {
      result[key] = { ...theirValue, ...ourValue };
    } else {
      result[key] = theirValue;
    }
  }
  return result as A & B;
}
