import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const name = process.argv[2] ?? '';
if (!/^[A-Z][A-Za-z0-9]+$/.test(name)) {
  console.error('Usage: npm run new-component <Name>   (PascalCase, e.g. FilterBar)');
  process.exit(1);
}

const folder = name.toLowerCase();
const hook = `use${name}`;
const dir = join('src', folder);
if (existsSync(dir)) {
  console.error(`${dir} already exists.`);
  process.exit(1);
}

const files: Record<string, string> = {
  'context.ts': `import { createContext, useContext } from 'react';
import type { Use${name}Return } from './${hook}';

export const ${name}Context = createContext<Use${name}Return | null>(null);

export function ${hook}Context(part: string): Use${name}Return {
  const context = useContext(${name}Context);
  if (!context) throw new Error(\`react-datakit: <${name}.\${part}> must be rendered inside <${name}>.\`);
  return context;
}
`,
  [`${hook}.ts`]: `import { optionKeys, useId, type DataAttributes } from '../shared';

export interface Use${name}Options {
  id?: string | undefined;
}

export const ${folder}OptionKeys = optionKeys<Use${name}Options>()(['id']);

export interface Use${name}Return {
  getRootProps: () => DataAttributes & { id: string };
}

/** @experimental */
export function ${hook}(options: Use${name}Options = {}): Use${name}Return {
  const id = useId(options.id);
  return {
    getRootProps: () => ({ id, 'data-dk-part': '${folder}' }),
  };
}
`,
  [`${name}.tsx`]: `import { forwardRef, type ReactNode } from 'react';
import { Part, splitProps, type PartProps } from '../shared';
import { ${name}Context } from './context';
import { ${folder}OptionKeys, ${hook}, type Use${name}Options } from './${hook}';

export type ${name}RootState = Record<string, never>;

export type ${name}Props = Use${name}Options &
  Omit<PartProps<'div', ${name}RootState>, 'id' | 'children'> & {
    children?: ReactNode;
  };

const Root = forwardRef<HTMLDivElement, ${name}Props>(function ${name}({ children, ...props }, ref) {
  const [options, partProps] = splitProps(props, ${folder}OptionKeys);
  const value = ${hook}(options);
  return (
    <${name}Context.Provider value={value}>
      <Part tag="div" state={{}} ours={{ ...value.getRootProps(), children }} theirs={partProps} forwardedRef={ref} />
    </${name}Context.Provider>
  );
});

/** @experimental */
export const ${name} = Object.assign(Root, {});
`,
  'index.ts': `export { ${name} } from './${name}';
export type { ${name}Props, ${name}RootState } from './${name}';
export { ${hook} } from './${hook}';
export type { Use${name}Options, Use${name}Return } from './${hook}';
`,
  [`${name}.test.tsx`]: `import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { expectNoA11yViolations } from '../test/axe';
import { ${name} } from './index';

describe('${name}', () => {
  it('renders the root part', async () => {
    await render(<${name} data-testid="root" />);
    await expect.element(page.getByTestId('root')).toHaveAttribute('data-dk-part', '${folder}');
  });

  it('has no axe violations', async () => {
    const screen = await render(<${name} />);
    await expectNoA11yViolations(screen.container);
  });
});
`,
  [`${name}.stories.tsx`]: `import type { Meta, StoryObj } from '@storybook/react-vite';
import { ${name} } from './index';

const meta = {
  title: 'Components/${name}',
  tags: ['experimental'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <${name} />,
};
`,
};

mkdirSync(dir);
for (const [file, content] of Object.entries(files)) writeFileSync(join(dir, file), content);

function insert(path: string, anchor: RegExp, text: string, where: 'before' | 'after'): void {
  const source = readFileSync(path, 'utf8');
  const matches = [...source.matchAll(new RegExp(anchor, 'gm'))];
  const match = where === 'after' ? matches.at(-1) : matches[0];
  if (match?.index === undefined) throw new Error(`Could not find ${String(anchor)} in ${path}.`);
  const at = where === 'after' ? match.index + match[0].length : match.index;
  writeFileSync(path, source.slice(0, at) + text + source.slice(at));
}

insert(
  'tsdown.config.ts',
  /^ {4}'[a-z]+\/index': 'src\/[a-z]+\/index\.ts',\n/,
  `    '${folder}/index': 'src/${folder}/index.ts',\n`,
  'after',
);
insert(
  'package.json',
  /^ {4}"\.\/styles\.css"/,
  `    "./${folder}": {
      "import": {
        "types": "./dist/${folder}/index.d.ts",
        "default": "./dist/${folder}/index.js"
      },
      "require": {
        "types": "./dist/${folder}/index.d.cts",
        "default": "./dist/${folder}/index.cjs"
      }
    },
`,
  'before',
);
insert(
  '.size-limit.json',
  /\n\s*\}\n\]/,
  `\n  },
  {
    "name": "react-datakit/${folder} (ESM)",
    "path": "dist/${folder}/index.js",
    "import": "{ ${name} }",
    "ignore": ["react", "react-dom"],
    "limit": "2 kB"`,
  'before',
);
insert('src/index.ts', /$(?![\s\S])/, `export * from './${folder}';\n`, 'after');

console.log(`Created ${dir} and registered react-datakit/${folder}.`);
