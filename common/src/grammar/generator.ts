import fs from 'fs-extra';
import yaml from 'js-yaml';
import * as regexModule from './regex';
import * as scopeModule from '@common/scoping';
import { generateOrgSrcBlockDefinitions as sharedGenerateOrgSrcBlockDefinitions } from './org-src-defs';

// For simplicity this generator focuses on the placeholder replacement and
// supports an optional injected org-src patterns array. The build script
// will supply the full src-block patterns so we don't duplicate the long
// LANGUAGES list here.

// note: use sharedGenerateOrgSrcBlockDefinitions when no custom patterns provided

export async function generateGrammarFromTemplate(templatePath: string, options?: { orgSrcPatterns?: any[] }): Promise<string> {
  const templateYaml = await fs.readFile(templatePath, 'utf8');
  const grammar = yaml.load(templateYaml) as any;

  // Inject generated org-src-blocks. Prefer caller-provided patterns; fall back
  // to the shared generator which mirrors the build script's patterns.
  if (grammar.repository && grammar.repository['org-src-blocks']) {
    const patterns = options?.orgSrcPatterns && options.orgSrcPatterns.length > 0
      ? options.orgSrcPatterns
      : sharedGenerateOrgSrcBlockDefinitions();
    grammar.repository['org-src-blocks'].patterns = patterns;
  }

  let grammarWithPlaceholders = JSON.stringify(grammar, null, 2);

  // Replace regex placeholders with actual patterns
  for (const [key, value] of Object.entries(regexModule)) {
    const regexSource = typeof value === 'string' ? value : (value as any)?.source;
    if (!regexSource) {
      continue;
    }
    const placeholder = `{{regex.${key}}}`;
    const escapedValue = regexSource.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    grammarWithPlaceholders = grammarWithPlaceholders.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), escapedValue);
  }

  // Replace scope placeholders
  for (const [key, value] of Object.entries(scopeModule)) {
    if (typeof value !== 'string') {
      continue;
    }
    const placeholder = `{{scope.${key}}}`;
    grammarWithPlaceholders = grammarWithPlaceholders.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }

  return grammarWithPlaceholders;
}

export default generateGrammarFromTemplate;
