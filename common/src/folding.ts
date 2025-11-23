import type { Tree, SyntaxNode } from 'web-tree-sitter';

export interface SimpleFoldingRange {
  startLine: number;
  endLine: number;
  kind?: string;
}

export function getTreeSitterFolds(tree: Tree): SimpleFoldingRange[] {
  const folds: SimpleFoldingRange[] = [];

  function traverse(node: SyntaxNode) {
    if (node.type === 'section') {
      const headlineNode = node.childForFieldName('headline');
      if (headlineNode) {
        const startLine = headlineNode.startPosition.row;
        const endLine = node.endPosition.row - 1;
        if (endLine > startLine) {
          folds.push({ startLine, endLine });
        }
      }
    } else if (node.type === 'block' || node.type === 'drawer' || node.type === 'property_drawer') {
      if (node.endPosition.row > node.startPosition.row) {
        folds.push({ startLine: node.startPosition.row, endLine: node.endPosition.row - 1 });
      }
    }

    for (const child of node.children) {
      if (child) {
        traverse(child);
      }
    }
  }

  traverse(tree.rootNode);
  return folds;
}
