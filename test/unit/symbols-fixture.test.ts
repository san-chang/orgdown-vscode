import { describe, it, expect, beforeAll } from 'vitest';
import { Parser, Language } from 'web-tree-sitter';
import * as path from 'path';
import * as fs from 'fs';
import { parseFixtureFile, SymbolsExpectation, SymbolNode } from '../../common/src/fixture-parser';
import { provideDocumentSymbols } from '../../server/src/features/symbols';

describe('Symbols from fixtures', () => {
  let parser: Parser;

  beforeAll(async () => {
    await Parser.init();
    parser = new Parser();
    const wasmPath = path.join(__dirname, '../../server/dist/tree-sitter-org.wasm');
    const lang = await Language.load(wasmPath);
    parser.setLanguage(lang as any);
  });

  function convertToSimple(symbols: any[]): SymbolNode[] {
    return symbols.map(sym => ({
      name: sym.name,
      startLine: sym.range.start.line,
      startChar: sym.range.start.character,
      endLine: sym.range.end.line,
      endChar: sym.range.end.character,
      children: convertToSimple(sym.children || []),
    }));
  }

  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  const files = fs
    .readdirSync(fixturesDir)
    .filter(f => f.endsWith('.org'))
    .sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(fixturesDir, file), 'utf8');
    const testCases = parseFixtureFile(content);

    const casesWithSymbols = testCases.filter(tc =>
      tc.expectations.some(e => e.type === 'symbols')
    );

    if (casesWithSymbols.length === 0) {
      continue;
    }

    describe(file, () => {
      for (const testCase of casesWithSymbols) {
        const symbolExpectations = testCase.expectations.filter(
          (e): e is SymbolsExpectation => e.type === 'symbols'
        );

        for (const expectation of symbolExpectations) {
          it(`${testCase.name}`, () => {
            const tree = parser.parse(testCase.input);
            if (!tree) {
              throw new Error('Failed to parse');
            }
            const actualSymbols = provideDocumentSymbols(tree);
            const simpleActual = convertToSimple(actualSymbols);

            expect(simpleActual).toEqual(expectation.symbols);
          });
        }
      }
    });
  }
});
