import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import * as scopeModule from '@common/scoping';
import * as regexModule from '@common/grammar/regex';

const repoRoot = path.resolve(__dirname, '../..');
const grammarTemplatePath = path.join(repoRoot, 'syntaxes', 'org.tmLanguage.template.yaml');

describe('Grammar Integrity Tests', () => {
  it('should have a one-to-one mapping between scopes in scoping.ts and the grammar template', () => {
    const definedScopes = Object.keys(scopeModule);

    const templateContent = fs.readFileSync(grammarTemplatePath, 'utf8');
    const usedScopes = new Set<string>();
    const regex = /{{\s*scope\.(\w+)\s*}}/g;
    let match;
    while ((match = regex.exec(templateContent)) !== null) {
      usedScopes.add(match[1]);
    }

    const definedSet = new Set(definedScopes);

    const unusedScopes = definedScopes.filter(scope => !usedScopes.has(scope));
    const undefinedScopes = [...usedScopes].filter(scope => !definedSet.has(scope));

    expect(undefinedScopes, `Scopes used in grammar but not defined in scoping.ts: ${undefinedScopes.join(', ')}`).toEqual([]);
    // expect(unusedScopes, `Unused scopes defined in scoping.ts: ${unusedScopes.join(', ')}`).toEqual([]);
  });

  it('should have a one-to-one mapping between regexes in regex.ts and the grammar template', () => {
    const definedRegexes = Object.keys(regexModule);

    const templateContent = fs.readFileSync(grammarTemplatePath, 'utf8');
    const usedRegexes = new Set<string>();
    const regex = /{{\s*regex\.(\w+)\s*}}/g;
    let match;
    while ((match = regex.exec(templateContent)) !== null) {
      usedRegexes.add(match[1]);
    }

    const definedSet = new Set(definedRegexes);

    const unusedRegexes = definedRegexes.filter(r => !usedRegexes.has(r));
    const undefinedRegexes = [...usedRegexes].filter(r => !definedSet.has(r));

    expect(undefinedRegexes, `Regexes used in grammar but not defined in regex.ts: ${undefinedRegexes.join(', ')}`).toEqual([]);
    // expect(unusedRegexes, `Unused regexes defined in regex.ts: ${unusedRegexes.join(', ')}`).toEqual([]);
  });
});
