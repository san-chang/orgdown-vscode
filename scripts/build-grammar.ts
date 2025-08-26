import path from 'path';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import * as regexModule from '../common/src/grammar/regex';
import * as scopeModule from '../common/src/scoping';

interface OrgSrcLanguage {
  name: string;
  identifiers: string[];
  source: string | string[];
  language?: string;
  additionalContentName?: string[];
}

const LANGUAGES: OrgSrcLanguage[] = [
    // language definitions from https://github.com/microsoft/vscode-markdown-tm-grammar/blob/main/build.js
    { name: 'css', language: 'css', identifiers: ['css', 'css.erb'], source: 'source.css' },
    { name: 'basic', language: 'html', identifiers: ['html', 'htm', 'shtml', 'xhtml', 'inc', 'tmpl', 'tpl'], source: 'text.html.basic' },
    { name: 'ini', language: 'ini', identifiers: ['ini', 'conf'], source: 'source.ini' },
    { name: 'java', language: 'java', identifiers: ['java', 'bsh'], source: 'source.java' },
    { name: 'lua', language: 'lua', identifiers: ['lua'], source: 'source.lua' },
    { name: 'makefile', language: 'makefile', identifiers: ['Makefile', 'makefile', 'GNUmakefile', 'OCamlMakefile'], source: 'source.makefile' },
    { name: 'perl', language: 'perl', identifiers: ['perl', 'pl', 'pm', 'pod', 't', 'PL', 'psgi', 'vcl'], source: 'source.perl' },
    { name: 'r', language: 'r', identifiers: ['R', 'r', 's', 'S', 'Rprofile', '\\{\\.r.+?\\}'], source: 'source.r' },
    { name: 'ruby', language: 'ruby', identifiers: ['ruby', 'rb', 'rbx', 'rjs', 'Rakefile', 'rake', 'cgi', 'fcgi', 'gemspec', 'irbrc', 'Capfile', 'ru', 'prawn', 'Cheffile', 'Gemfile', 'Guardfile', 'Hobofile', 'Vagrantfile', 'Appraisals', 'Rantfile', 'Berksfile', 'Berksfile.lock', 'Thorfile', 'Puppetfile'], source: 'source.ruby' },
    // 	Left to its own devices, the PHP grammar will match HTML as a combination of operators
    // and constants. Therefore, HTML must take precedence over PHP in order to get proper
    // syntax highlighting.
    { name: 'php', language: 'php', identifiers: ['php', 'php3', 'php4', 'php5', 'phpt', 'phtml', 'aw', 'ctp'], source: ['text.html.basic', 'source.php'] },
    { name: 'sql', language: 'sql', identifiers: ['sql', 'ddl', 'dml'], source: 'source.sql' },
    { name: 'vs_net', language: 'vs_net', identifiers: ['vb'], source: 'source.asp.vb.net' },
    { name: 'xml', language: 'xml', identifiers: ['xml', 'xsd', 'tld', 'jsp', 'pt', 'cpt', 'dtml', 'rss', 'opml'], source: 'text.xml' },
    { name: 'xsl', language: 'xsl', identifiers: ['xsl', 'xslt'], source: 'text.xml.xsl' },
    { name: 'yaml', language: 'yaml', identifiers: ['yaml', 'yml'], source: 'source.yaml' },
    { name: 'dosbatch', language: 'dosbatch', identifiers: ['bat', 'batch'], source: 'source.batchfile' },
    { name: 'clojure', language: 'clojure', identifiers: ['clj', 'cljs', 'clojure'], source: 'source.clojure' },
    { name: 'coffee', language: 'coffee', identifiers: ['coffee', 'Cakefile', 'coffee.erb'], source: 'source.coffee' },
    { name: 'c', language: 'c', identifiers: ['c', 'h'], source: 'source.c' },
    { name: 'cpp', language: 'cpp', identifiers: ['cpp', 'c\\+\\+', 'cxx'], source: 'source.cpp', additionalContentName: ['source.cpp'] },
    { name: 'diff', language: 'diff', identifiers: ['patch', 'diff', 'rej'], source: 'source.diff' },
    { name: 'dockerfile', language: 'dockerfile', identifiers: ['dockerfile', 'Dockerfile'], source: 'source.dockerfile' },
    { name: 'git_commit', identifiers: ['COMMIT_EDITMSG', 'MERGE_MSG'], source: 'text.git-commit' },
    { name: 'git_rebase', identifiers: ['git-rebase-todo'], source: 'text.git-rebase' },
    { name: 'go', language: 'go', identifiers: ['go', 'golang'], source: 'source.go' },
    { name: 'groovy', language: 'groovy', identifiers: ['groovy', 'gvy'], source: 'source.groovy' },
    { name: 'pug', language: 'pug', identifiers: ['jade', 'pug'], source: 'text.pug' },

    { name: 'js', language: 'javascript', identifiers: ['js', 'jsx', 'javascript', 'es6', 'mjs', 'cjs', 'dataviewjs', '\\{\\.js.+?\\}'], source: 'source.js' },
    { name: 'js_regexp', identifiers: ['regexp'], source: 'source.js.regexp' },
    { name: 'json', language: 'json', identifiers: ['json', 'json5', 'sublime-settings', 'sublime-menu', 'sublime-keymap', 'sublime-mousemap', 'sublime-theme', 'sublime-build', 'sublime-project', 'sublime-completions'], source: 'source.json' },
    { name: 'jsonc', language: 'jsonc', identifiers: ['jsonc'], source: 'source.json.comments' },
    { name: 'less', language: 'less', identifiers: ['less'], source: 'source.css.less' },
    { name: 'objc', language: 'objc', identifiers: ['objectivec', 'objective-c', 'mm', 'objc', 'obj-c', 'm', 'h'], source: 'source.objc' },
    { name: 'swift', language: 'swift', identifiers: ['swift'], source: 'source.swift' },
    { name: 'scss', language: 'scss', identifiers: ['scss'], source: 'source.css.scss' },

    { name: 'perl6', language: 'perl6', identifiers: ['perl6', 'p6', 'pl6', 'pm6', 'nqp'], source: 'source.perl.6' },
    { name: 'powershell', language: 'powershell', identifiers: ['powershell', 'ps1', 'psm1', 'psd1', 'pwsh'], source: 'source.powershell' },
    { name: 'python', language: 'python', identifiers: ['python', 'py', 'py3', 'rpy', 'pyw', 'cpy', 'SConstruct', 'Sconstruct', 'sconstruct', 'SConscript', 'gyp', 'gypi', '\\{\\.python.+?\\}'], source: 'source.python' },
    { name: 'julia', language: 'julia', identifiers: ['julia', '\\{\\.julia.+?\\}'], source: 'source.julia' },
    { name: 'regexp_python', identifiers: ['re'], source: 'source.regexp.python' },
    { name: 'rust', language: 'rust', identifiers: ['rust', 'rs', '\\{\\.rust.+?\\}'], source: 'source.rust' },
    { name: 'scala', language: 'scala', identifiers: ['scala', 'sbt'], source: 'source.scala' },
    { name: 'shell', language: 'shellscript', identifiers: ['shell', 'sh', 'bash', 'zsh', 'bashrc', 'bash_profile', 'bash_login', 'profile', 'bash_logout', '.textmate_init', '\\{\\.bash.+?\\}'], source: 'source.shell' },
    { name: 'ts', language: 'typescript', identifiers: ['typescript', 'ts'], source: 'source.ts' },
    { name: 'tsx', language: 'typescriptreact', identifiers: ['tsx'], source: 'source.tsx' },
    { name: 'csharp', language: 'csharp', identifiers: ['cs', 'csharp', 'c#'], source: 'source.cs' },
    { name: 'fsharp', language: 'fsharp', identifiers: ['fs', 'fsharp', 'f#'], source: 'source.fsharp' },
    { name: 'dart', language: 'dart', identifiers: ['dart'], source: 'source.dart' },
    { name: 'handlebars', language: 'handlebars', identifiers: ['handlebars', 'hbs'], source: 'text.html.handlebars' },
    { name: 'markdown', language: 'markdown', identifiers: ['markdown', 'md'], source: 'text.html.markdown' },
    { name: 'log', language: 'log', identifiers: ['log'], source: 'text.log' },
    { name: 'erlang', language: 'erlang', identifiers: ['erlang'], source: 'source.erlang' },
    { name: 'elixir', language: 'elixir', identifiers: ['elixir'], source: 'source.elixir' },
    { name: 'latex', language: 'latex', identifiers: ['latex', 'tex'], source: 'text.tex.latex' },
    { name: 'bibtex', language: 'bibtex', identifiers: ['bibtex'], source: 'text.bibtex' },
    { name: 'twig', language: 'twig', identifiers: ['twig'], source: 'source.twig' },

    { name: 'lisp', language: 'lisp', identifiers: ['emacs-lisp', 'elisp', 'lisp'], source: 'source.lisp' },
];

const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(path.join(__dirname, '..'));
const grammarSourceDir = path.join(repoRoot, 'syntaxes');
const grammarDestDir = path.join(repoRoot, 'syntaxes');

function generateOrgSrcBlockDefinitions(): any[] {
  const patterns = LANGUAGES.map(lang => {
    const includes = Array.isArray(lang.source)
      ? lang.source.map(scope => ({ include: scope }))
      : [{ include: lang.source }];

    // Start with our new generic scopes
    let contentName = '{{scope.BLOCK_CONTENT}} {{scope.BLOCK_SRC_CONTENT}}';

    // Add the language-specific meta scope
    contentName += lang.language ? ` meta.embedded.block.${lang.language}` : ` meta.embedded.block.${lang.name}`;

    // Add any additional scopes needed for injection
    if (lang.additionalContentName && lang.additionalContentName.length > 0) {
      contentName += ` ${lang.additionalContentName.join(' ')}`;
    }

    // This rule is highly specific to one language. It matches the language identifier
    // and then includes the correct grammar.
    return {
      name: '{{scope.META_BLOCK}} {{scope.BLOCK_SRC_META}}',
      begin: '(?i)^(\\s*)(#\\+BEGIN_SRC)[ \\t]+(' + lang.identifiers.join('|') + ')\\b([ \\t].*)?$',
      end: '{{regex.srcBlockEndRegex}}',
      beginCaptures: {
        '1': { name: '{{scope.LEADING_WHITESPACE}}' },
        '2': { name: '{{scope.BLOCK_KEYWORD}}' },
        '3': { name: '{{scope.BLOCK_LANGUAGE}}' },
        '4': {
          name: '{{scope.BLOCK_PARAMETERS}}',
          patterns: [
            { include: '#src-block-switch' },
            { include: '#src-block-header' }
          ]
        }
      } as any,
      endCaptures: {
        '1': { name: '{{scope.LEADING_WHITESPACE}}' },
        '2': { name: '{{scope.BLOCK_KEYWORD}}' }
       },
      patterns: [{
        begin: '(^|\\G)',
        while: '{{regex.srcBlockWhileRegex}}',
        contentName,
        patterns: includes,
      }],
    };
  });

  // Fallback for unknown languages. It's a separate rule.
  patterns.push({
    name: '{{scope.META_BLOCK}} {{scope.BLOCK_SRC_META}}',
    begin: '{{regex.srcBlockBeginRegex}}',
    end: '{{regex.srcBlockEndRegex}}',
    beginCaptures: {
        '1': { name: '{{scope.LEADING_WHITESPACE}}' },
        '2': { name: '{{scope.BLOCK_KEYWORD}}' },
        '3': {
          name: '{{scope.BLOCK_PARAMETERS}}',
          patterns: [
            { include: '#src-block-switch' },
            { include: '#src-block-header' }
          ]
        }
    } as any,
    endCaptures: {
      '1': { name: '{{scope.LEADING_WHITESPACE}}' },
      '2': { name: '{{scope.BLOCK_KEYWORD}}' }
    },
    patterns: [{
      begin: '(^|\G)',
      while: '{{regex.srcBlockWhileRegex}}',
      contentName: '{{scope.BLOCK_CONTENT}} {{scope.BLOCK_SRC_CONTENT}} meta.embedded.block.fallback',
      patterns: [],
    }],
  });

  return patterns;
}

// Note: includes are not required since each src block is a standalone pattern

async function buildGrammar() {
  const templatePath = path.join(grammarSourceDir, 'org.tmLanguage.template.yaml');
  const destPath = path.join(grammarDestDir, 'org.tmLanguage.json');

  console.log(`Building ${path.basename(destPath)} from ${path.basename(templatePath)}`);

  // Load the YAML template file
  const grammarYaml = await fs.readFile(templatePath, 'utf8');
  const grammar = yaml.load(grammarYaml) as any;

  // Inject the generated SRC block definitions
  if (grammar.repository && grammar.repository['org-src-blocks']) {
    grammar.repository['org-src-blocks'].patterns = generateOrgSrcBlockDefinitions();
  }

  // Convert the entire grammar object to a string, with placeholders
  let grammarWithPlaceholders = JSON.stringify(grammar, null, 2);

  // Replace all regex placeholders with actual patterns
  for (const [key, value] of Object.entries(regexModule)) {
    // Handle both old string format and new RegexPattern format
    const regexSource = typeof value === 'string' ? value : value?.source;
    if (regexSource) {
      const placeholder = `{{regex.${key}}}`;
      // In JSON, backslashes in the regex need to be double-escaped.
      const escapedValue = regexSource.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      grammarWithPlaceholders = grammarWithPlaceholders.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), escapedValue);
    }
  }

  // Replace all scope placeholders with actual patterns
  for (const [key, value] of Object.entries(scopeModule)) {
    if (typeof value === 'string') {
      const placeholder = `{{scope.${key}}}`;
      // Scopes don't need escaping.
      grammarWithPlaceholders = grammarWithPlaceholders.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }
  }

  // Write the final, fully-processed JSON file
  await fs.writeFile(destPath, grammarWithPlaceholders);
  console.log('Grammar built successfully');
}

buildGrammar().catch(err => {
  console.error(err);
  process.exit(1);
});
