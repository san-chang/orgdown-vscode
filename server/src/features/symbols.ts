import { DocumentSymbol, SymbolKind } from 'vscode-languageserver/node';
import { Tree } from 'web-tree-sitter';

export function provideDocumentSymbols(tree: Tree): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];

  function traverse(node: any): DocumentSymbol | null {
    if (node.type === 'section') {
      const headlineNode = node.childForFieldName('headline');
      if (!headlineNode) {
        return null;
      }

      const itemNode = headlineNode.childForFieldName('item');
      const title = itemNode ? itemNode.text : 'Untitled';

      const range = {
        start: { line: node.startPosition.row, character: node.startPosition.column },
        end: { line: node.endPosition.row, character: node.endPosition.column },
      };
      const selectionRange = {
        start: { line: headlineNode.startPosition.row, character: headlineNode.startPosition.column },
        end: { line: headlineNode.endPosition.row, character: headlineNode.endPosition.column },
      };

      const symbol: DocumentSymbol = {
        name: title,
        kind: SymbolKind.String,
        range: range,
        selectionRange: selectionRange,
        children: [],
      };

      // Process children - look for nested sections
      for (const child of node.children) {
        if (!child) {
          continue;
        }
        if (child.type === 'section') {
          const childSymbol = traverse(child);
          if (childSymbol) {
            symbol.children!.push(childSymbol);
          }
        }
      }
      return symbol;
    }
    return null;
  }

  // Recursively find all top-level sections
  function findSections(node: any) {
    if (node.type === 'section') {
      const symbol = traverse(node);
      if (symbol) {
        symbols.push(symbol);
      }
    } else {
      for (const child of node.children) {
        if (child) {
          findSections(child);
        }
      }
    }
  }

  findSections(tree.rootNode);
  return symbols;
}
