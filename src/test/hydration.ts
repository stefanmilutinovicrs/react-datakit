import { version } from 'react';
import type { MockInstance } from 'vitest';

// React 18 warns about useLayoutEffect during renderToString even in these tests, where `document`
// exists and useIsomorphicLayoutEffect picks it; on a real server it picks useEffect. React 19
// dropped the warning. Only this exact message is ignored, and only on React 18.
const react18LayoutEffectWarning =
  "Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr for common fixes.%s";

const isReact18 = version.split('.')[0] === '18';

/** The console.error calls a hydration test must fail on. */
export function hydrationErrors(errors: MockInstance<typeof console.error>): unknown[][] {
  return errors.mock.calls.filter((args) => !(isReact18 && args[0] === react18LayoutEffectWarning));
}
