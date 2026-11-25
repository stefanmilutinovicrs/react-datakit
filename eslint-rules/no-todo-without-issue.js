const MARKER = /\b(TODO|FIXME|XXX|HACK)\b/;
const ISSUE_LINK = /https?:\/\/\S+\/(issues|pull)\/\d+/;

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'Require an issue link in TODO, FIXME, XXX and HACK comments.' },
    schema: [],
    messages: {
      missingLink: '{{marker}} comments need a link to an issue, e.g. https://github.com/<owner>/<repo>/issues/123.',
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const match = MARKER.exec(comment.value);
          if (match && !ISSUE_LINK.test(comment.value)) {
            context.report({ loc: comment.loc, messageId: 'missingLink', data: { marker: match[1] } });
          }
        }
      },
    };
  },
};
