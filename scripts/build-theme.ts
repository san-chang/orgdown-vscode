import path from 'path';
import fs from 'fs-extra';
import * as scopes from '../common/src/scoping';

// Color palette extracted from the user-provided Spacemacs theme snippet (dark theme GUI values)
const palette = {
  head1: '#4f97d7',
  head2: '#2d9574',
  head3: '#67b11d',
  head4: '#b1951d',
  war: '#dc752f',   // For TODO, priority
  meta: '#9f8766',  // For tags, keywords
  base: '#b2b2b2',  // Default/base text
  func: '#bc6ec5',  // For functions, document title
  var: '#7590db',   // For variables, dates
  const: '#a45bad', // For constants
  blue: '#4f97d7',  // For links
  cyan: '#28def0',  // For code
  suc: '#86dc2f',   // For DONE state
  err: '#e0211d',   // For warnings
  comp: '#c56ec3',  // For components, agenda structure
  keyword: '#4f97d7',
};

// Mapping from our TextMate scopes to the theme settings
const scopeToSettingsMap: Record<string, { foreground?: string; fontStyle?: string }> = {
  // Headlines
  [scopes.HEADING_LEVEL_1]: { foreground: palette.head1, fontStyle: 'bold' },
  [scopes.HEADING_LEVEL_2]: { foreground: palette.head2, fontStyle: 'bold' },
  [scopes.HEADING_LEVEL_3]: { foreground: palette.head3 },
  [scopes.HEADING_LEVEL_4]: { foreground: palette.head4 },
  [scopes.HEADING_LEVEL_5]: { foreground: palette.head1 },
  [scopes.HEADING_LEVEL_6]: { foreground: palette.head2 },
  [scopes.HEADING_PUNCTUATION]: { foreground: palette.keyword, fontStyle: 'bold' },
  [scopes.TODO_KEYWORD]: { foreground: palette.war, fontStyle: 'bold' },
  [scopes.PRIORITY_COOKIE]: { foreground: palette.war, fontStyle: 'bold' },
  [scopes.TAG]: { foreground: palette.meta, fontStyle: 'bold' },
  [scopes.PROGRESS_COOKIE]: { foreground: palette.const },

  // Lists
  [scopes.LIST_BULLET]: { foreground: palette.keyword },
  [scopes.CHECKBOX]: { foreground: palette.var, fontStyle: 'bold' },
  [scopes.DESCRIPTION_TERM]: { foreground: palette.comp, fontStyle: 'italic' },
  [scopes.DESCRIPTION_SEPARATOR]: { foreground: palette.meta, fontStyle: 'bold' },
  [scopes.LIST_COUNTER]: { foreground: palette.const },

  // Keywords
  [scopes.KEYWORD_NAME]: { foreground: palette.meta, fontStyle: 'bold' },
  [scopes.KEYWORD_VALUE]: { foreground: palette.func },

  // Inline Markup
  [scopes.BOLD]: { fontStyle: 'bold' },
  [scopes.ITALIC]: { fontStyle: 'italic' },
  [scopes.UNDERLINE]: { fontStyle: 'underline' },
  [scopes.STRIKE_THROUGH]: { fontStyle: 'strikethrough' },
  [scopes.CODE]: { foreground: palette.cyan },
  // [scopes.VERBATIM]: { foreground: palette.const },
  [scopes.LINK]: { foreground: palette.blue, fontStyle: 'underline' },
};

const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(path.join(__dirname, '..'));
const themesDir = path.join(repoRoot, 'themes');
const baseThemePath = path.join(themesDir, 'base-theme.json');
const finalThemePath = path.join(themesDir, 'orgdown-debug-theme.json');

async function buildDebugTheme() {
  console.log('Building Orgdown semantic debug theme...');

  const baseTheme = await fs.readJson(baseThemePath);

  const orgdownTokenColors = Object.entries(scopeToSettingsMap).map(([scope, settings]) => {
    return {
      scope,
      settings,
    };
  });

  // Prepend our rules to the base theme's rules
  const finalTokenColors = [...orgdownTokenColors, ...baseTheme.tokenColors];

  const finalTheme = {
    ...baseTheme,
    name: 'Orgdown Debug Theme',
    tokenColors: finalTokenColors,
  };

  await fs.ensureDir(themesDir);
  await fs.writeJson(finalThemePath, finalTheme, { spaces: 2 });

  console.log(`Successfully built debug theme to: ${finalThemePath}`);
}

buildDebugTheme().catch(err => {
  console.error(err);
  process.exit(1);
});
