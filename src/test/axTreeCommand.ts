import { defineBrowserCommand } from '@vitest/browser-playwright';
import type { AxNode, AxOption } from './axTree';

interface CdpValue {
  value?: unknown;
}
interface CdpAxNode {
  nodeId: string;
  ignored: boolean;
  role?: CdpValue;
  name?: CdpValue;
  parentId?: string;
}
interface CdpFrameTree {
  frame: { id: string; url: string };
  childFrames?: CdpFrameTree[];
}

function findFrame(tree: CdpFrameTree, url: string): string | undefined {
  if (tree.frame.url === url) return tree.frame.id;
  for (const child of tree.childFrames ?? []) {
    const id = findFrame(child, url);
    if (id) return id;
  }
  return undefined;
}

const text = (value: CdpValue | undefined) => (typeof value?.value === 'string' ? value.value : '');

function toNode(node: CdpAxNode): AxNode {
  return { role: text(node.role), name: text(node.name) };
}

export const axOption = defineBrowserCommand<[name: string]>(async (context, name): Promise<AxOption | null> => {
  const frame = await context.frame();
  const session = await context.page.context().newCDPSession(context.page);
  try {
    const { frameTree } = (await session.send('Page.getFrameTree')) as { frameTree: CdpFrameTree };
    const frameId = findFrame(frameTree, frame.url());
    const { nodes } = (await session.send('Accessibility.getFullAXTree', frameId ? { frameId } : {})) as {
      nodes: CdpAxNode[];
    };
    const byId = new Map(nodes.map((node) => [node.nodeId, node]));
    const option = nodes.find((node) => !node.ignored && node.role?.value === 'option' && node.name?.value === name);
    if (!option) return null;
    let parent = option.parentId ? byId.get(option.parentId) : undefined;
    while (parent && (parent.ignored || !['group', 'listbox'].includes(text(parent.role))))
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    return { ...toNode(option), container: parent ? toNode(parent) : null };
  } finally {
    await session.detach();
  }
});
