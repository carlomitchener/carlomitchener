import site from '../site.json';

export function tree(lists = {}) {
  return site.tree.map(({ fill, ...node }) => {
    const nodes = fill ? lists[fill] : null;
    return nodes && nodes.length ? { ...node, nodes } : node;
  });
}
