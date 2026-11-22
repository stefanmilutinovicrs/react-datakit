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
- [ ] Theme rules live in `@layer datakit` and use `:where()` selectors only
- [ ] axe passes in every state; tested in Chromium, Firefox and WebKit
- [ ] No hydration warnings in the Next.js App Router

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
