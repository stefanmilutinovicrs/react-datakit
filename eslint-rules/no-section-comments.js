const DIVIDER = /^[\s\-=*#~_/+]{3,}$/;
const DECORATED = /(^|\s)[-=*#~_/+]{3,}(\s|$)/;
const REGION = /^#?(end)?region\b/i;
const DIRECTIVE =
  /^(eslint|global|@ts-|prettier-ignore|istanbul|c8|v8|webpack|@vite-ignore|[@#]__PURE__|@license|@preserve)/;
const MAX_HEADER_WORDS = 5;

function isAloneOnLine(sourceCode, comment) {
  const before = sourceCode.getTokenBefore(comment, { includeComments: true });
  const after = sourceCode.getTokenAfter(comment, { includeComments: true });
  return (
    (!before || before.loc.end.line < comment.loc.start.line) && (!after || after.loc.start.line > comment.loc.end.line)
  );
}

function isBlockHeader(sourceCode, comment, text) {
  if (comment.type !== 'Block' || comment.value.startsWith('*') || text.includes('\n')) return false;
  if (!text || /[.:;!?]$/.test(text) || DIRECTIVE.test(text)) return false;
  return text.split(/\s+/).length <= MAX_HEADER_WORDS && isAloneOnLine(sourceCode, comment);
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow section-header and divider comments.' },
    schema: [],
    messages: {
      divider: 'Divider comments are not allowed.',
      header: 'Section-header comments are not allowed; split the file by group of parts instead.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (comment.type === 'Shebang') continue;
          const text = comment.value.replace(/^\*/, '').trim();
          const isJsdoc = comment.type === 'Block' && comment.value.startsWith('*');
          if (DIVIDER.test(text) || (!isJsdoc && DECORATED.test(text))) {
            context.report({ loc: comment.loc, messageId: 'divider' });
          } else if (REGION.test(text) || isBlockHeader(sourceCode, comment, text)) {
            context.report({ loc: comment.loc, messageId: 'header' });
          }
        }
      },
    };
  },
};
