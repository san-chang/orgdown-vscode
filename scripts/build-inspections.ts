import fs from 'fs-extra';
import path from 'path';

const fixturesDir = path.resolve(__dirname, '../test/fixtures');
// Integration tests read from test/inspections
const inspectionsDir = path.resolve(__dirname, '../test/inspections');

async function buildInspections() {
  await fs.ensureDir(inspectionsDir);
  await fs.emptyDir(inspectionsDir);

  const fixtureFiles = await fs.readdir(fixturesDir);

  for (const fixtureFile of fixtureFiles) {
    if (path.extname(fixtureFile) !== '.org') {
      continue;
    }

    const fixturePath = path.join(fixturesDir, fixtureFile);
    const inspectionPath = path.join(inspectionsDir, fixtureFile.replace('.org', '.inspection.org'));

    const content = await fs.readFile(fixturePath, 'utf-8');
    const compiledContent = compileFixture(content, fixtureFile);

    await fs.writeFile(inspectionPath, compiledContent);
  }
}

function compileFixture(content: string, originalFilename: string): string {
  const lines = content.split('\n');
  let compiledLines: string[] = [];
  let currentHeadlineLevel = 0;

  const fileTitleMatch = content.match(/^#\+TITLE: (.+)$/m);
  const fileTitle = fileTitleMatch ? fileTitleMatch[1] : 'Untitled Test Suite';

  compiledLines.push(`#+TITLE: Inspection for ${originalFilename} (Auto-Generated)`);
  compiledLines.push('');
  compiledLines.push(`#+FIXTURE: ${originalFilename}`);
  compiledLines.push(`#+DESCRIPTION: ${fileTitle}`);
  compiledLines.push('');
  compiledLines.push(`# DO NOT EDIT. Run 'pnpm build:inspections' to regenerate.`);
  compiledLines.push(`# Content start after this line`);
  compiledLines.push(`# --------------------------------------------------------`);
  compiledLines.push('');


  let isOrgBlock = false;
  let srcContent: string[] = [];
  let testName: string | null = null;
  let testDescription: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.trim().toLowerCase();

    if (lower.startsWith('#+name:')) {
      testName = line.replace(/^\s*#\+name:/i, '').trim();
      continue;
    }

    if (lower.startsWith('#+description:')) {
      testDescription = line.replace(/^\s*#\+description:/i, '').trim();
      continue;
    }

    // Only process begin_fixture (ignore case)
    if (lower.startsWith('#+begin_fixture')) {
      isOrgBlock = true;
      continue;
    }

    if (lower.startsWith('#+end_fixture')) {
      // End of fixture block. If there is no EXPECTED block following this
      // fixture we should still emit the fixture as a Test so that build
      // inspections include fixtures without EXPECTED sections.
      // Look ahead to see if an EXPECTED block appears before the next test
      // marker or headline.
      let j = i + 1;
      let hasExpectedFollowing = false;
      for (; j < lines.length; j++) {
        const nxt = lines[j].trim().toLowerCase();
        if (nxt === '') { continue; }
        if (nxt.startsWith('|')) { continue; }
        if (nxt.startsWith('#+expected')) { hasExpectedFollowing = true; break; }
        // If we hit another fixture, name or a headline, stop searching
        if (nxt.startsWith('#+begin_fixture') || nxt.startsWith('#+name:') || /^\*+\s/.test(lines[j])) {
          break;
        }
        // otherwise stop search (some other content)
        break;
      }

      if (!hasExpectedFollowing && srcContent.length > 0) {
        const parentLevel = currentHeadlineLevel + 1;
        const effectiveName = testName || 'Fixture';
        compiledLines.push(`${'*'.repeat(parentLevel)} Test: ${effectiveName}`);
        if (testDescription) {
          compiledLines.push(`  #+DESCRIPTION: ${testDescription}`);
        }
        const transformedSrc = transformSrcContent(srcContent.join('\n'), parentLevel);
        compiledLines.push(transformedSrc);
        compiledLines.push('');
        srcContent = [];
        testName = null;
        testDescription = null;
      }

      isOrgBlock = false;
      continue;
    }

    // Handle EXPECTED blocks explicitly: parse and skip the entire EXPECTED
    // block here instead of using a separate skip flag. This makes handling
    // consecutive EXPECTED blocks deterministic.
    if (lower.startsWith('#+expected')) {
      // Look ahead for 'no-match' (skip empty and table lines)
      let j = i + 1;
      let foundNoMatch = false;
      // Collected lines of the EXPECTED block (for potential future use)
      const expectedBlockLines: string[] = [];
      for (; j < lines.length; j++) {
        const raw = lines[j];
        const trimmed = raw.trim();
        const lowerTrim = trimmed.toLowerCase();
        // If we hit a marker that terminates the EXPECTED block, stop
        if (trimmed === '') { expectedBlockLines.push(raw); continue; }
        if (trimmed.startsWith('|')) { expectedBlockLines.push(raw); continue; }
        if (lowerTrim === 'no-match') { foundNoMatch = true; expectedBlockLines.push(raw); j++; break; }
        // If the next meaningful line starts a new section, end the expected block
        if (lowerTrim.startsWith('#+expected') || lowerTrim.startsWith('#+name:') || lowerTrim.startsWith('#+begin_fixture') || (/^\*+\s/.test(trimmed) && !trimmed.includes('=>'))) {
          break;
        }
        // Otherwise this line is part of the EXPECTED block content (e.g. scope lines)
        expectedBlockLines.push(raw);
      }

      if (!foundNoMatch) {
        const parentLevel = currentHeadlineLevel + 1;
        if (testName) {
          compiledLines.push(`${'*'.repeat(parentLevel)} Test: ${testName}`);
          if (testDescription) {
            compiledLines.push(`  #+DESCRIPTION: ${testDescription}`);
          }
          const transformedSrc = transformSrcContent(srcContent.join('\n'), parentLevel);
          compiledLines.push(transformedSrc);
          compiledLines.push('');
        }
      }

      // Advance the main index to the last line consumed by the EXPECTED block
      i = Math.max(i, j - 1);
      // Reset fixture state
      srcContent = [];
      testName = null;
      testDescription = null;
      continue;
    }

    if (isOrgBlock) {
      // Strip a leading comma from any line inside the fixture, matching
      // the behavior in `common/src/fixture-parser.ts`. This lets fixture
      // content escape lines that would otherwise be interpreted as markers
      // (for example, a line starting with "#+NAME:").
      const match = line.match(/^(\s*),(.*)/);
      if (match) {
        srcContent.push(match[1] + match[2]);
      } else {
        srcContent.push(line);
      }
    } else if (line.match(/^(\*+) /)) {
      const match = line.match(/^(\*+) /)!;
      currentHeadlineLevel = match[1].length;
      compiledLines.push(`${'*'.repeat(currentHeadlineLevel + 1)}${line.substring(currentHeadlineLevel)}`);
    } else if (!lower.startsWith('#+expected') &&
               !line.startsWith('|') &&
               !lower.startsWith('#+property') &&
               lower !== 'no-match'
              ) {
      compiledLines.push(line);
    }
  }

  // Join and then collapse excessive blank lines introduced during transformation.
  let compiled = compiledLines.join('\n');
  // Replace 3+ consecutive newlines with exactly two (single blank line)
  compiled = compiled.replace(/\n{3,}/g, '\n\n');
  // Trim leading blank lines
  compiled = compiled.replace(/^\s*\n+/, '');
  // Ensure the file ends with a single newline
  compiled = compiled.replace(/\n+\s*$/g, '\n');
  return compiled;
}

function transformSrcContent(content: string, parentLevel: number): string {
  const lines = content.split('\n');
  const transformed: string[] = [];

  for (const line of lines) {
    const headlineMatch = line.match(/^(\*+) /);
    if (headlineMatch) {
      const level = headlineMatch[1].length;
      const newLevel = parentLevel + level;
      transformed.push(`${'*'.repeat(newLevel)}${line.substring(level)}`);
    } else {
      transformed.push(line);
    }
  }
  return transformed.join('\n');
}

buildInspections().catch(console.error);
