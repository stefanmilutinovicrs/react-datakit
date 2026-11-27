import { expect, it } from 'vitest';
import { plainSpaces } from './plainSpaces';

it('turns thin, narrow no-break and no-break spaces into plain ones', () => {
  expect(plainSpaces('Mar 10\u2009–\u200914, 2026')).toBe('Mar 10 – 14, 2026');
  expect(plainSpaces('1\u202f234,5')).toBe('1 234,5');
  expect(plainSpaces('10\u00a0mars')).toBe('10 mars');
});
