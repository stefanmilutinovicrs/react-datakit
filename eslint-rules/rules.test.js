import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';
import noSectionComments from './no-section-comments.js';
import noTodoWithoutIssue from './no-todo-without-issue.js';

// Vitest's describe/it read `this`, so they can't be assigned to RuleTester directly.
RuleTester.afterAll = (fn) => afterAll(fn);
RuleTester.describe = (name, fn) => describe(name, fn);
RuleTester.it = (name, fn) => it(name, fn);
RuleTester.itOnly = (name, fn) => it.only(name, fn);

const ruleTester = new RuleTester();

ruleTester.run('no-section-comments', noSectionComments, {
  valid: [
    '// Clicks inside the popup keep focus in the input.\nconst a = 1;',
    '// iOS VoiceOver ignores aria-activedescendant on inputs without a list role\nconst a = 1;',
    '/** The selected value. */\nexport const a = 1;',
    '/**\n * Two lines\n * of JSDoc\n */\nexport const a = 1;',
    '/* eslint-disable no-console */\nconsole.log(1);',
    '/* @__PURE__ */ f();',
    'f(/* force */ true);',
    'const a = x /* inline note: see spec. */;',
    '/* Not a header because it is a sentence. */\nconst a = 1;',
  ],
  invalid: [
    { code: '/* Root */\nconst a = 1;', errors: [{ messageId: 'header' }] },
    { code: '/* Empty, Loading, Error */\nconst a = 1;', errors: [{ messageId: 'header' }] },
    { code: '  /* Prop getters */\nconst a = 1;', errors: [{ messageId: 'header' }] },
    {
      code: '// #region Parts\nconst a = 1;\n// #endregion',
      errors: [{ messageId: 'header' }, { messageId: 'header' }],
    },
    { code: '/* ---- */\nconst a = 1;', errors: [{ messageId: 'divider' }] },
    { code: '// ---\nconst a = 1;', errors: [{ messageId: 'divider' }] },
    { code: '// ===== Root =====\nconst a = 1;', errors: [{ messageId: 'divider' }] },
    { code: '/* ******* */\nconst a = 1;', errors: [{ messageId: 'divider' }] },
  ],
});

ruleTester.run('no-todo-without-issue', noTodoWithoutIssue, {
  valid: [
    '// TODO(https://github.com/owner/repo/issues/12): remove after React 20\nconst a = 1;',
    '/* FIXME https://github.com/owner/repo/pull/7 */\nconst a = 1;',
    '// Todos are shown in a list.\nconst a = 1;',
  ],
  invalid: [
    { code: '// TODO: remove\nconst a = 1;', errors: [{ messageId: 'missingLink', data: { marker: 'TODO' } }] },
    { code: '/* FIXME see #12 */\nconst a = 1;', errors: [{ messageId: 'missingLink', data: { marker: 'FIXME' } }] },
    { code: '// HACK for Safari\nconst a = 1;', errors: [{ messageId: 'missingLink', data: { marker: 'HACK' } }] },
  ],
});
