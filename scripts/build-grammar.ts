import path from 'path';
import fs from 'fs-extra';
// yaml is not needed here; generator handles parsing
import generateGrammarFromTemplate from '../common/src/grammar/generator';
import { generateOrgSrcBlockDefinitions } from '../common/src/grammar/org-src-defs';

const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(path.join(__dirname, '..'));
const grammarSourceDir = path.join(repoRoot, 'syntaxes');
const grammarDestDir = path.join(repoRoot, 'syntaxes');

// generateOrgSrcBlockDefinitions is provided by the shared module imported above

// Note: includes are not required since each src block is a standalone pattern

async function buildGrammar() {
  const templatePath = path.join(grammarSourceDir, 'org.tmLanguage.template.yaml');
  const destPath = path.join(grammarDestDir, 'org.tmLanguage.json');

  console.log(`Building ${path.basename(destPath)} from ${path.basename(templatePath)}`);

  // Build org-src patterns using the local helper
  const orgSrcPatterns = generateOrgSrcBlockDefinitions();

  // Use the shared generator to perform placeholder replacement and get the final JSON string
  const grammarWithPlaceholders = await generateGrammarFromTemplate(templatePath, { orgSrcPatterns });

  // Write the final, fully-processed JSON file
  await fs.writeFile(destPath, grammarWithPlaceholders);
  console.log('Grammar built successfully');
}

buildGrammar().catch(err => {
  console.error(err);
  process.exit(1);
});
