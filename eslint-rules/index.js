import noSectionComments from './no-section-comments.js';
import noTodoWithoutIssue from './no-todo-without-issue.js';

/** Local ESLint rules for the code style in CONTRIBUTING.md. */
export default {
  meta: { name: 'local' },
  rules: {
    'no-section-comments': noSectionComments,
    'no-todo-without-issue': noTodoWithoutIssue,
  },
};
