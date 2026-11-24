# Contributing

## Questions

If you have questions about usage, help or support, please use [GitHub Discussions](https://github.com/stefanmilutinovicrs/react-datakit/discussions). Issues that are questions will be closed and redirected there.

## Reporting issues

If you have found what you think is a bug, first search the [open and closed issues](https://github.com/stefanmilutinovicrs/react-datakit/issues?q=is%3Aissue) to make sure it has not already been reported. If you cannot find an existing report, use the [bug report template](https://github.com/stefanmilutinovicrs/react-datakit/issues/new?template=bug_report.yml).

## Suggesting new features

Open an issue first, so we can agree on the use case before any code is written. A proposal for a new component should describe the problem, the [WAI-ARIA pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) it follows, an API sketch and the list of tests.

## Pull request guidelines

Every pull request must follow the [pull request template](.github/pull_request_template.md).

- Search the [open and closed pull requests](https://github.com/stefanmilutinovicrs/react-datakit/pulls?q=is%3Apr) before starting work.
- Keep each pull request focused on one change. Unrelated changes belong in separate pull requests.
- Explain what changed and why.
- You may use AI tools, but you remain responsible for understanding, testing and verifying every line you submit.

## Development

- Fork this repository.
- Use the Node.js version from [.nvmrc](./.nvmrc):

  ```bash
  nvm use
  ```

- Install dependencies and the browsers used by the tests:

  ```bash
  npm install
  npx playwright install chromium
  ```

  `npm install` also turns on the pre-commit hook in `.githooks/`, which runs `npm run lint`.

- Start Storybook while you work:

  ```bash
  npm run storybook
  ```

- Implement your changes and tests in `src/`, then open a pull request.

### Adding a component

1. Write failing tests for keyboard behavior and ARIA attributes before the implementation.
2. Put the logic in a hook (`src/<name>/use<Name>.ts`) and build compound components on it. Shared logic goes to `src/shared/`.
3. Register the subpath in `tsdown.config.ts`, the `"exports"` field of `package.json` and `.size-limit.json`.
4. Mark the component `@experimental` (JSDoc and Storybook tag) until it is stable.
5. Add Storybook stories: basic, controlled, edge cases and themed.

Checklist:

- [ ] Follows the WAI-ARIA pattern, with full keyboard support
- [ ] Controlled and uncontrolled via `useControllableState`
- [ ] Every part has `data-dk-part`, state data attributes, `className`, `style`, a render prop and a forwarded ref
- [ ] Text users can't reach through a part (ARIA names, list names, live region announcements) is in a `labels` option with English defaults, exported as `default<Name>Labels`; visible content is changed through parts, never `labels`
- [ ] Theme rules live in `@layer datakit` and use `:where()` selectors only
- [ ] axe passes in every state; tested in Chromium, Firefox and WebKit
- [ ] No hydration warnings in the Next.js App Router

## Code style

### Comments

- Comments explain why, never what. No section headers or dividers, no comments that restate the code, no commented-out code, no TODOs without an issue link.
- Write a `//` comment only for a non-obvious decision: a browser or screen reader quirk, a race condition, a WAI-ARIA requirement (link the spec).
- Write JSDoc only when it adds something the name and the type don't say: one sentence, no `@example` (examples live in Storybook). `@experimental` and `@deprecated` are allowed.
- JSDoc only on exported code: components, props and types.
- JSDoc on a prop only when it states a requirement or behavior that the name and the type don't show: a default, a unit, what `null` or `-1` means, when it is called. `itemToKey` says the key must be stable and unique; `items` or `open` need nothing.

### Component folders

A component folder is split by group of parts, not one file per part:

```
src/<name>/
  context.ts           React context and its hook
  use<Name>.ts         the headless hook
  <Group>.tsx          one file per group of related parts, e.g. Chips.tsx, Calendar.tsx
  <Name>.tsx           the root part and the compound export
  index.ts             the public exports of the subpath
  <Name>.test.tsx
  <Name>.stories.tsx
```

- Files with components are PascalCase (`Chips.tsx`, `Trigger.tsx`); hooks and everything else are camelCase (`useMultiSelect.ts`, `context.ts`, `presets.ts`).
- Logic used by more than one component lives in `src/shared/`, never copied.
- Leave out a file that would only re-export something; don't add files just to match the layout.
- `npm run new-component <name>` creates a folder that follows these rules.

### What lint checks

`npm run lint` fails on section-header and divider comments, TODOs without an issue link and `@example` in JSDoc. It runs in CI and in the pre-commit hook. Everything else in this section is checked in review: lint can't tell a "why" comment from a "what" comment.

## Changesets

This repo uses [Changesets](https://github.com/changesets/changesets). Every change that affects the published package must include a changeset: run `npx changeset` and commit the generated file. Descriptions end up in the changelog, so make them clear. Documentation, CI and other development-only changes do not need one.

Versioning follows semver: a fix is a patch, a new option or prop is a minor, and changed behavior or a removed prop is a major (after 1.0).

## Releases

Releases are made with the [Changesets Action](https://github.com/changesets/action): it opens a "Version Packages" pull request from the merged changesets, and merging it publishes to npm with provenance.

## Test

All checks that CI runs:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:all-browsers
npm run build
npm run check:package
npm run size
npm run build-storybook
```

`npm test` runs the tests in Chromium only, which is enough while you work.
