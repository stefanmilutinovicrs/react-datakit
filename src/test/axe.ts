import axe from 'axe-core';
import { expect } from 'vitest';

/** Runs axe on one element and fails with a readable list of violations. */
export async function expectNoA11yViolations(element: Element): Promise<void> {
  const results = await axe.run(
    { include: [element] },
    {
      resultTypes: ['violations'],
      // Tests render fragments, not whole pages, so page-level rules don't apply.
      rules: {
        region: { enabled: false },
        'landmark-one-main': { enabled: false },
        'page-has-heading-one': { enabled: false },
      },
    },
  );

  const violations = results.violations.map(
    (v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(violations).toEqual([]);
}
