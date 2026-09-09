import { describe, it, expect, beforeAll } from 'vitest';
import { Parser, Language } from 'web-tree-sitter';
import * as path from 'path';
import * as fs from 'fs';
import { parseFixtureFile, MarkdownExpectation } from '../../common/src/fixture-parser';
import { convertOrgToMarkdown } from '../../common/src/preview/org-to-markdown';

describe('Org to Markdown from fixtures', () => {
  let parser: Parser;

  beforeAll(async () => {
    await Parser.init();
    parser = new Parser();
    const wasmPath = path.join(__dirname, '../../server/dist/tree-sitter-org.wasm');
    const lang = await Language.load(wasmPath);
    parser.setLanguage(lang as any);
  });

  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  const files = fs
    .readdirSync(fixturesDir)
    .filter(f => f.endsWith('.org'))
    .sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(fixturesDir, file), 'utf8');
    const testCases = parseFixtureFile(content);

    const casesWithMarkdown = testCases.filter(tc =>
      tc.expectations.some(e => e.type === 'markdown')
    );

    if (casesWithMarkdown.length === 0) {
      continue;
    }

    describe(file, () => {
      for (const testCase of casesWithMarkdown) {
        const markdownExpectations = testCase.expectations.filter(
          (e): e is MarkdownExpectation => e.type === 'markdown'
        );

        for (const expectation of markdownExpectations) {
          it(`${testCase.name}`, () => {
            const tree = parser.parse(testCase.input);
            if (!tree) {
              throw new Error('Failed to parse');
            }
            const { markdown } = convertOrgToMarkdown(tree);
            expect(markdown.trimEnd()).toBe(expectation.expected);
          });
        }
      }
    });
  }
});
