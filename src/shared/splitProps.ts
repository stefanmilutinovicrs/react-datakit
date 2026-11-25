type MissingKeys<T, K extends readonly PropertyKey[]> = Exclude<keyof T, K[number]>;

/**
 * Lists every option of a hook; a key that is left out fails type checking, so a new option
 * can't silently fall through to the DOM.
 */
export function optionKeys<T>() {
  return <const K extends readonly (keyof T)[]>(
    keys: K & ([MissingKeys<T, K>] extends [never] ? unknown : { missingKeys: MissingKeys<T, K> }),
  ): K => keys;
}

/** Splits props into the hook options named by `keys` and the rest, which go to the DOM element. */
export function splitProps<T extends object, K extends keyof T>(
  props: T,
  keys: readonly K[],
): [Pick<T, K>, Omit<T, K>] {
  const optionSet = new Set<PropertyKey>(keys);
  const picked: Record<PropertyKey, unknown> = {};
  const rest: Record<PropertyKey, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (optionSet.has(key)) picked[key] = value;
    else rest[key] = value;
  }
  return [picked as Pick<T, K>, rest as Omit<T, K>];
}
