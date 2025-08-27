import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import * as scopeModule from '@common/scoping';
import * as regexModule from '@common/grammar/regex';
import generateGrammarFromTemplate from '@common/grammar/generator';

const repoRoot = path.resolve(__dirname, '../..');
const grammarTemplatePath = path.join(repoRoot, 'syntaxes', 'org.tmLanguage.template.yaml');

describe('Grammar Generation Tests', () => {
  it('should have a one-to-one mapping between scopes in scoping.ts and the grammar template', async () => {
    const definedScopes = Object.keys(scopeModule);

    const templateContent = fs.readFileSync(grammarTemplatePath, 'utf8');
    const usedScopes = new Set<string>();
    const regex = /{{\s*scope\.(\w+)\s*}}/g;
    let match;
    while ((match = regex.exec(templateContent)) !== null) {
      usedScopes.add(match[1]);
    }

    const definedSet = new Set(definedScopes);

    // Generate final grammar and include any scopes that appear only after
    // dynamic injection.
    const finalGrammar = await generateGrammarFromTemplate(grammarTemplatePath, {});
    for (const [key, value] of Object.entries(scopeModule)) {
      if (typeof value !== 'string') {
        continue;
      }
      if (finalGrammar.includes(value)) {
        usedScopes.add(key);
      }
    }

    const unusedScopes = definedScopes.filter(scope => !usedScopes.has(scope));
    const undefinedScopes = [...usedScopes].filter(scope => !definedSet.has(scope));

    // Known intentionally-unused scopes (internal helpers, duplicates, or
    // legacy names). Update this list when intentionally removing or renaming
    // scopes.
    const allowedUnusedScopes = new Set([
      'BLOCK_SWITCH',
      'PROPERTY_DRAWER_BEGIN_KEYWORD',
      'PROPERTY_DRAWER_END_KEYWORD',
      'INCLUDE_OPTIONS',
      'TABLE_CAPTION_META',
      'TABLE_ATTR_META',
      'TABLE_FORMULA'
    ]);

    const actuallyUnused = unusedScopes.filter(s => !allowedUnusedScopes.has(s));

    expect(undefinedScopes, `Scopes used in grammar but not defined in scoping.ts: ${undefinedScopes.join(', ')}`).toEqual([]);
    expect(actuallyUnused, `Unused scopes defined in scoping.ts: ${actuallyUnused.join(', ')}`).toEqual([]);
  });

  it('should have a one-to-one mapping between regexes in regex.ts and the grammar template', async () => {
    const definedRegexes = Object.keys(regexModule);

    const templateContent = fs.readFileSync(grammarTemplatePath, 'utf8');
    const usedRegexes = new Set<string>();
    const placeholderRegex = /{{\s*regex\.(\w+)\s*}}/g;
    let match;
    while ((match = placeholderRegex.exec(templateContent)) !== null) {
      usedRegexes.add(match[1]);
    }

    const finalGrammar = await generateGrammarFromTemplate(grammarTemplatePath, {});
    for (const r of definedRegexes) {
      const val: any = (regexModule as any)[r];
      const source = typeof val === 'string' ? val : val?.source;
      if (!source) {
        continue;
      }
      const escapedSource = source.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      if (finalGrammar.includes(escapedSource)) {
        usedRegexes.add(r);
      }
    }

    const definedSet = new Set(definedRegexes);

    const unusedRegexes = definedRegexes.filter(r => !usedRegexes.has(r));
    const undefinedRegexes = [...usedRegexes].filter(r => !definedSet.has(r));

    // Allowlist for regexes that are helper fragments or intentionally not
    // referenced directly from the template (they are composed into other
    // regexes). Keep this list small and review when refactoring regex.ts.
    const allowedUnusedRegexes = new Set<string>([
      'srcSwitchRegex'
    ]);

    const actuallyUnusedRegexes = unusedRegexes.filter(r => !allowedUnusedRegexes.has(r));

    expect(undefinedRegexes, `Regexes used in grammar but not defined in regex.ts: ${undefinedRegexes.join(', ')}`).toEqual([]);
    expect(actuallyUnusedRegexes, `Unused regexes defined in regex.ts: ${actuallyUnusedRegexes.join(', ')}`).toEqual([]);
  });

  it('generated grammar should contain no unreplaced placeholders', async () => {
    const finalGrammar = await generateGrammarFromTemplate(grammarTemplatePath, {});

    // Detect any remaining Mustache-like placeholders of the form {{...}}
    const leftoverPlaceholder = /{{\s*[^}]+\s*}}/;
    const match = leftoverPlaceholder.exec(finalGrammar);

    expect(match, `Found unreplaced placeholder in generated grammar: ${match ? match[0] : '<none>'}`).toBeNull();
  });
});
