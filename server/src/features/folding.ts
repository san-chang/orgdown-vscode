import { FoldingRange, FoldingRangeKind } from 'vscode-languageserver/node';
import { Tree } from 'web-tree-sitter';
import { getTreeSitterFolds as getCommonFolds } from '../../../common/src/folding';

export function provideFoldingRanges(tree: Tree): FoldingRange[] {
  return getCommonFolds(tree).map(fr => ({
    startLine: fr.startLine,
    endLine: fr.endLine,
    kind: FoldingRangeKind.Region,
  }));
}
