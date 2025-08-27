// src/grammar/regex.ts
// Centralized Org Mode regex definitions for grammar, tests, and code generation
// All regex patterns used in the TextMate grammar are defined here as the single source of truth

/**
 * Interface for regex patterns used in TextMate grammar
 */
export interface RegexPattern {
  /** The native JavaScript RegExp object */
  regex: RegExp;
  /** The source string for TextMate grammar injection */
  source: string;
  /** Make it compatible with string usage */
  toString(): string;
}

/**
 * Create a regex pattern with both native RegExp and source string
 * For case-insensitive patterns, adds (?i) prefix for TextMate compatibility
 */
function createRegexPattern(regex: RegExp): RegexPattern {
  let source = regex.source;

  // Add TextMate inline flags if needed
  if (regex.flags.includes("i")) {
    source = `(?i)${source}`;
  }
  if (regex.flags.includes("m")) {
    source = `(?m)${source}`;
  }
  if (regex.flags.includes("s")) {
    source = `(?s)${source}`;
  }

  return {
    regex,
    source,
    toString: () => source,
  };
}

// #region TEMPLATE UTILS
// =============================================================================
// These tiny helpers are used purely by the YAML template for common anchors.
/** End-of-line anchor for begin/end blocks */
export const endOfLine = createRegexPattern(/(?=$)/);
/** Generic empty line detection (multiline) */
export const emptyLine = createRegexPattern(/^\s*$/m);
// #endregion TEMPLATE UTILS

// #region HEADLINES & OUTLINES
// =============================================================================
/**
 * Anchor to the very start of the document, only if not immediately a headline
 *
 * File-header begin anchor (Oniguruma template atom).
 * Matches the absolute start of the file only when it is not immediately a headline.
 * This is a template-only string (not a JS RegExp) used during grammar generation.
 */
export const fileHeaderBeginRegex = "\\A(?!\\*+\\s)";

/**
 * Section content anchoring
 *
 * Section content begin anchor (template atom).
 * Matches either the start of a line or the continuation anchor \G used by some regex engines
 * to resume matching where the previous match ended. Used only in grammar templates.
 */
export const sectionContentBeginRegex = "(^|\\G)";

/**
 * Matches a single leading star for a level-1 headline.
 * Capture groups:
 * 1 = the star character ("*") indicating level 1
 * Matches: "* " at beginning of headline (the trailing whitespace is required by the fragment)
 */
export const starsLevel1Fragment = createRegexPattern(/(\*)\s+/);

/**
 * Matches two leading stars for a level-2 headline.
 * Capture groups:
 * 1 = the two stars ("**") indicating level 2
 */
export const starsLevel2Fragment = createRegexPattern(/(\*{2})\s+/);

/**
 * Matches three leading stars for a level-3 headline.
 * Capture groups:
 * 1 = the three stars ("***") indicating level 3
 */
export const starsLevel3Fragment = createRegexPattern(/(\*{3})\s+/);

/**
 * Matches four leading stars for a level-4 headline.
 * Capture groups:
 * 1 = the four stars ("****") indicating level 4
 */
export const starsLevel4Fragment = createRegexPattern(/(\*{4})\s+/);

/**
 * Matches five leading stars for a level-5 headline.
 * Capture groups:
 * 1 = the five stars ("*****") indicating level 5
 */
export const starsLevel5Fragment = createRegexPattern(/(\*{5})\s+/);

/**
 * Matches six leading stars for a level-6 headline.
 * Capture groups:
 * 1 = the six stars ("******") indicating level 6
 */
export const starsLevel6Fragment = createRegexPattern(/(\*{6})\s+/);

/**
 * Matches seven or more leading stars (levels >6).
 * Capture groups:
 * 1 = the run of seven or more stars ("*******"...)
 */
export const starsLevelMoreThan6Fragment = createRegexPattern(/(\*{7,})\s+/);

/**
 * Optional TODO keyword fragment that may appear after the stars.
 * Capture groups:
 * 1 = the todo keyword if present (TODO, DONE, WAITING, NEXT, COMMENT)
 * The entire group is optional (the fragment ends with "?").
 */
export const todoFragment = createRegexPattern(
  /(?:(TODO|DONE|WAITING|NEXT|COMMENT)\s+)?/
);

/**
 * Optional priority fragment: a bracketed priority like "[#A]".
 * Capture groups:
 * 1 = the full priority token including brackets (e.g. "[#A]")
 * 2 = the single priority letter/character inside the brackets (e.g. "A")
 * The entire fragment is optional.
 */
export const priorityFragment = createRegexPattern(/(?:(\[#([A-Z0-9])\])\s*)?/);

/**
 * Headline text fragment (non-greedy) used to capture the title itself.
 * Capture groups:
 * 1 = the headline text (may be empty because of non-greedy match)
 */
export const headlineTextFragment = createRegexPattern(/(.*?)/);

/**
 * Optional cookie/progress fragment such as "[1/3]" or "[50%]".
 * Capture groups:
 * 1 = the bracketed progress text (e.g. "[1/3]"), if present
 */
export const cookieFragment = createRegexPattern(/(?:\s+(\[[0-9/%]+\]))?/);

/**
 * Optional tags fragment at end of headline, e.g. ":tag1:tag2:"
 * Capture groups:
 * 1 = the full tag string including surrounding colons (e.g. ":work:urgent:")
 * The fragment allows a single tag cluster; trailing whitespace is handled by the headline assembly.
 */
export const tagsFragment = createRegexPattern(/(?:\s*(:[^ \t:][^ \t]*:))?/);

/**
 * Detects the start of a headline to be used as a lookahead when closing blocks.
 * Matches zero-width at positions where a line begins with one or more stars followed by space.
 * No capture groups (used as a lookahead).
 */
export const headlineDetectToCloseBlockRegex = createRegexPattern(/(?=^\*+\s)/);

/**
 * Full-line headline regex for level 1 assembled from fragments.
 * Matches a complete level-1 headline from start to end of line.
 * Capture groups follow the fragments used:
 * 1 = stars ("*")
 * 2 = todo keyword (if present)
 * 3 = full priority token (e.g. "[#A]") (if present)
 * 4 = priority character (e.g. "A") (if present)
 * 5 = headline text (non-greedy)
 * 6 = progress/cookie (e.g. "[1/3]") (if present)
 * 7 = tags cluster (e.g. ":tag:") (if present)
 */
export const headlineLevel1Regex = createRegexPattern(
  new RegExp(
    `^${(starsLevel1Fragment as any).regex.source}${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`
  )
);
/**
 * Full-line headline regex for level 2; capture groups same as for level 1 but with level-2 stars.
 */
export const headlineLevel2Regex = createRegexPattern(
  new RegExp(
    `^${(starsLevel2Fragment as any).regex.source}${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`
  )
);
/**
 * Full-line headline regex for level 3; capture groups same as for level 1 but with level-3 stars.
 */
export const headlineLevel3Regex = createRegexPattern(
  new RegExp(
    `^${(starsLevel3Fragment as any).regex.source}${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`
  )
);
/**
 * Full-line headline regex for level 4; capture groups same as for level 1 but with level-4 stars.
 */
export const headlineLevel4Regex = createRegexPattern(
  new RegExp(
    `^${(starsLevel4Fragment as any).regex.source}${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`
  )
);
/**
 * Full-line headline regex for level 5; capture groups same as for level 1 but with level-5 stars.
 */
export const headlineLevel5Regex = createRegexPattern(
  new RegExp(
    `^${(starsLevel5Fragment as any).regex.source}${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`
  )
);
/**
 * Full-line headline regex for level 6; capture groups same as for level 1 but with level-6 stars.
 */
export const headlineLevel6Regex = createRegexPattern(
  new RegExp(
    `^${(starsLevel6Fragment as any).regex.source}${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`
  )
);
/**
 * Full-line headline regex for levels >6 (7 or more stars); capture groups same as for level 1.
 */
export const headlineLevelMoreThan6Regex = createRegexPattern(
  new RegExp(
    `^${(starsLevelMoreThan6Fragment as any).regex.source}${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`
  )
);

/**
 * Inactive headline (level 1) regex. Matches headlines that are marked as inactive
 * by including the word "COMMENT" at the start of the content or containing an ":ARCHIVE:" tag.
 * Case-insensitive flag is enabled.
 * Capture groups align with the fragments used (stars, todo, priority, text, cookie, tags).
 */
export const inactiveHeadlineLevel1Regex = createRegexPattern(
  new RegExp(
    `^${
      (starsLevel1Fragment as any).regex.source
    }(?:COMMENT\\b\\s.*|.*:ARCHIVE:)(?:\\s+)?${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`,
    "i"
  )
);
/**
 * Inactive headline regex for level 2. Same capture semantics as inactiveHeadlineLevel1Regex.
 */
export const inactiveHeadlineLevel2Regex = createRegexPattern(
  new RegExp(
    `^${
      (starsLevel2Fragment as any).regex.source
    }(?:COMMENT\\b\\s.*|.*:ARCHIVE:)(?:\\s+)?${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`,
    "i"
  )
);
/**
 * Inactive headline regex for level 3. Same capture semantics as inactiveHeadlineLevel1Regex.
 */
export const inactiveHeadlineLevel3Regex = createRegexPattern(
  new RegExp(
    `^${
      (starsLevel3Fragment as any).regex.source
    }(?:COMMENT\\b\\s.*|.*:ARCHIVE:)(?:\\s+)?${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`,
    "i"
  )
);
/**
 * Inactive headline regex for level 4. Same capture semantics as inactiveHeadlineLevel1Regex.
 */
export const inactiveHeadlineLevel4Regex = createRegexPattern(
  new RegExp(
    `^${
      (starsLevel4Fragment as any).regex.source
    }(?:COMMENT\\b\\s.*|.*:ARCHIVE:)(?:\\s+)?${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`,
    "i"
  )
);
/**
 * Inactive headline regex for level 5. Same capture semantics as inactiveHeadlineLevel1Regex.
 */
export const inactiveHeadlineLevel5Regex = createRegexPattern(
  new RegExp(
    `^${
      (starsLevel5Fragment as any).regex.source
    }(?:COMMENT\\b\\s.*|.*:ARCHIVE:)(?:\\s+)?${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`,
    "i"
  )
);
/**
 * Inactive headline regex for level 6. Same capture semantics as inactiveHeadlineLevel1Regex.
 */
export const inactiveHeadlineLevel6Regex = createRegexPattern(
  new RegExp(
    `^${
      (starsLevel6Fragment as any).regex.source
    }(?:COMMENT\\b\\s.*|.*:ARCHIVE:)(?:\\s+)?${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`,
    "i"
  )
);
/**
 * Inactive headline regex for levels >6. Same capture semantics as inactiveHeadlineLevel1Regex.
 */
export const inactiveHeadlineLevelMoreThan6Regex = createRegexPattern(
  new RegExp(
    `^${
      (starsLevelMoreThan6Fragment as any).regex.source
    }(?:COMMENT\\b\\s.*|.*:ARCHIVE:)(?:\\s+)?${
      (todoFragment as any).regex.source
    }${(priorityFragment as any).regex.source}${
      (headlineTextFragment as any).regex.source
    }${(cookieFragment as any).regex.source}${
      (tagsFragment as any).regex.source
    }\\s*$`,
    "i"
  )
);

/**
 *  Outline end look ahead per level (template atoms)
 *
 * Lookahead anchors used by templates to mark the end of an outline section for a given level.
 * Each is an Oniguruma-compatible lookahead string that asserts a headline of the specified level follows.
 */
export const outlineEndLevel1Regex = "(?=^\\*{1,1}\\s)";
/** Lookahead anchor for outline end at level 2 (template atom). */
export const outlineEndLevel2Regex = "(?=^\\*{1,2}\\s)";
/** Lookahead anchor for outline end at level 3 (template atom). */
export const outlineEndLevel3Regex = "(?=^\\*{1,3}\\s)";
/** Lookahead anchor for outline end at level 4 (template atom). */
export const outlineEndLevel4Regex = "(?=^\\*{1,4}\\s)";
/** Lookahead anchor for outline end at level 5 (template atom). */
export const outlineEndLevel5Regex = "(?=^\\*{1,5}\\s)";
/** Lookahead anchor for outline end at level 6 (template atom). */
export const outlineEndLevel6Regex = "(?=^\\*{1,6}\\s)";
// #endregion HEADLINES

// #region COMMENTS
// =============================================================================
/**
 * Line comments - lines starting with optional whitespace, then '# ' (hash + space)
 * Per Org manual 13.6, such lines are treated as comments and not exported.
 */
/**
 * Line comment begin capture (used as a begin pattern with capture group)
 *
 * Line comment begin capture (template atom).
 * Captures leading indentation followed by '# ' so the grammar can start a comment region with the indent included.
 */
export const lineCommentBeginCaptureRegex = "(^\\s*#\\s)";
// #endregion COMMENTS

// #region BLOCKS
// =============================================================================

// #region BLOCKS / Begin-end / COMMENTS
/**
 * Begin marker for a comment block: "#\+BEGIN_COMMENT" (case-insensitive).
 * Capture groups:
 * 1 = leading indentation
 * 2 = full token "#+BEGIN_COMMENT"
 */
export const commentBlockBeginRegex = createRegexPattern(
  /^(\s*)(#\+BEGIN_COMMENT)\s*$/i
);
/**
 * End marker for a comment block: "#\+END_COMMENT" (case-insensitive).
 * Capture groups:
 * 1 = leading indentation
 * 2 = full token "#+END_COMMENT"
 */
export const commentBlockEndRegex = createRegexPattern(
  /^(\s*)(#\+END_COMMENT)\s*$/i
);
// #endregion

// #region BLOCKS / Begin-end / Standard
/**
 * Begin marker for verbatim standard blocks such as COMMENT or EXAMPLE.
 * Capture groups:
 * 1 = leading indentation
 * 2 = the "#\+BEGIN_" token
 * 3 = the block name (EXAMPLE)
 * 4 = optional remainder (parameters or text) after the block name
 */
export const standardBlockVerbatimBeginRegex = createRegexPattern(
  /^(\s*)(#\+BEGIN_)(EXAMPLE)(?: (.*))?$/i
);
/**
 * End marker for verbatim standard blocks. Uses a backreference to the block name.
 * Capture groups:
 * 1 = leading indentation
 * 2 = the "#\+END_" token
 * 3 = the block name matched via backreference
 */
export const standardBlockVerbatimEndRegex = createRegexPattern(
  /^(\s*)(#\+END_)(\3)\s*$/i
);
// #endregion

// #region BLOCKS / Begin-end / Markup
/**
 * Begin marker for markup blocks (QUOTE, CENTER, VERSE) that may contain inline markup.
 * Capture groups:
 * 1 = leading indentation
 * 2 = "#\+BEGIN_" token
 * 3 = block name (QUOTE, CENTER, VERSE)
 * 4 = optional trailing text/parameters
 */
export const standardBlockMarkupBeginRegex = createRegexPattern(
  /^(\s*)(#\+BEGIN_)(QUOTE|CENTER|VERSE)(?: (.*))?$/i
);
/**
 * End marker for markup blocks or a headline-detected closing. When matching the explicit end form,
 * capture groups correspond to indentation, the "#\+END_" token, and the block name backreference.
 */
export const standardBlockMarkupEndRegex = createRegexPattern(
  new RegExp(
    `^(\\s*)(#\\+END_)(\\3)\\s*$|${
      (headlineDetectToCloseBlockRegex as any).regex.source
    }`,
    "i"
  )
);
// #endregion

// #region BLOCKS / Begin-end / Src
/**
 * Begin of a source block (#\+BEGIN_SRC). Captures language and any arguments.
 * Capture groups:
 * 1 = leading indentation
 * 2 = the literal "#\+BEGIN_SRC"
 * 3 = remainder of the line (language, switches, parameters)
 */
export const srcBlockBeginRegex = createRegexPattern(
  /^(\s*)(#\+BEGIN_SRC)[ \t]*(.*)$/i
);
/**
 * End of a source block (#\+END_SRC) or headline-detected close. When matching literal end:
 * 1 = leading indentation
 * 2 = the literal "#\+END_SRC"
 */
export const srcBlockEndRegex = createRegexPattern(
  new RegExp(
    `^(\\s*)(#\\+END_SRC)\\s*$|${
      (headlineDetectToCloseBlockRegex as any).regex.source
    }`,
    "i"
  )
);
/**
 * While-inside matcher for source blocks: matches lines that are not the end marker nor headline starts.
 * No explicit capture groups (used as a negative lookahead).
 */
export const srcBlockWhileRegex = createRegexPattern(
  new RegExp(
    `^(?!\\s*#\\+END_SRC|${
      (headlineDetectToCloseBlockRegex as any).regex.source
    })`,
    "i"
  )
);
/**
 * Matches switches or options provided on a #+BEGIN_SRC line such as "-n" or "+results \"val\"".
 * Capture groups:
 * 1 = the switch token with optional quoted argument
 */
export const srcSwitchRegex = createRegexPattern(
  /(?:^|\s)([-+][a-zA-Z0-9]+(?:\s+"[^"]*")?)/
);
// #endregion

// #region BLOCKS / Begin-end / Customized
/**
 * Begin marker for a customized (user-defined) block name.
 * Capture groups:
 * 1 = leading indentation
 * 2 = "#\+BEGIN_" token
 * 3 = custom block name
 * 4 = optional trailing parameters
 */
export const customizedBlockBeginRegex = createRegexPattern(
  /^(\s*)(#\+BEGIN_)([a-zA-Z0-9_-]+)(?: (.*))?$/i
);
/**
 * End marker for customized blocks or headline-detected close. When explicit end is matched,
 * groups correspond to indentation, the token "#\+END_", and the block name backreference.
 */
export const customizedBlockEndRegex = createRegexPattern(
  new RegExp(
    `^(\\s*)(#\\+END_)\\3*$|${
      (headlineDetectToCloseBlockRegex as any).regex.source
    }`,
    "i"
  )
);
/**
 * While-inside matcher for customized blocks; similar behavior to the end marker alternation.
 */
export const customizedBlockWhileRegex = createRegexPattern(
  new RegExp(
    `^(\\s*)(#\\+END_)\\3*$|${
      (headlineDetectToCloseBlockRegex as any).regex.source
    }`,
    "i"
  )
);
// #endregion

// #region BLOCKS / Begin-end / Dynamic
/**
 * Begin marker for dynamic blocks (#\+BEGIN: name args).
 * Capture groups:
 * 1 = leading indentation
 * 2 = literal "#\+BEGIN:"
 * 3 = dynamic block name
 * 4 = optional arguments following the name
 */
export const dynamicBlockBeginRegex = createRegexPattern(
  /^(\s*)(#\+BEGIN:)\s+([a-zA-Z0-9_-]+)(?: (.*))?$/i
);

/**
 * End marker for dynamic blocks or headline-detected close;
 * capture group:
 * 1 = indentation
 * 2 = the token when literal matched.
 */
export const dynamicBlockEndRegex = createRegexPattern(
  new RegExp(
    `^(\\s*)(#\\+END:)\\s*$|${
      (headlineDetectToCloseBlockRegex as any).regex.source
    }`,
    "i"
  )
);
// #endregion

/**
 * Block parameter entry used on begin lines. Examples: ":caption "Title"" or ":name value".
 * Capture groups:
 * 1 = parameter key including leading colon (e.g. ":caption")
 * 2 = parameter value (quoted or unquoted token)
 */
export const blockParameterRegex = createRegexPattern(
  /(:[a-zA-Z0-9_-]+)\s+((?:"[^"]*"|'[^']*'|[^\s:]+))/
);

// #region Blocks / Latex Environment
/**
 * LaTeX environment begin marker, e.g. "\begin{equation}".
 * Capture groups:
 * 1 = the environment name (e.g. "equation", may include asterisk)
 */
export const latexEnvironmentBeginRegex = createRegexPattern(
  /\\begin\{([a-zA-Z*]+)\}/
);
/**
 * LaTeX environment end marker that pairs with a begin (uses backreference in templates).
 * This pattern is intended for template/Oniguruma substitution where \1 refers to the
 * captured environment name from the begin marker.
 */
export const latexEnvironmentEndRegex = createRegexPattern(/\\end\{\\1\}/);
// #endregion Blocks / Latex Environment

// #region Blocks / Drawers
// =============================================================================
/**
 * Matches the beginning of a generic drawer like ":LOGBOOK:" but excludes :END and :PROPERTIES:.
 * Capture groups:
 * 1 = the drawer name (letters and underscores)
 */
export const genericDrawerBeginRegex = createRegexPattern(
  /^\s*:(?!END|PROPERTIES)([A-Z_]+):\s*$/i
);

// #region PROPERTIES
/**
 * Exact match for the beginning of a PROPERTIES drawer (":PROPERTIES:"). Case-insensitive.
 */
export const propertyDrawerBeginRegex =
  createRegexPattern(/^\s*:PROPERTIES:\s*$/i);

/**
 * Matches a single property line inside a PROPERTIES drawer such as ":Owner: Alice".
 * Capture groups:
 * 1 = property key
 * 2 = optional value (rest of the line)
 */
export const propertyRegex = createRegexPattern(
  /^\s*:([a-zA-Z0-9_+-]+):(?:[ \t]*(.*))?$/
);
// #endregion PROPERTIES

/**
 * Matches the drawer end marker ":END:" or a headline start used to close drawer regions.
 */
export const drawerEndRegex = createRegexPattern(
  new RegExp(
    `^\\s*:END:\\s*$|${(headlineDetectToCloseBlockRegex as any).regex.source}`,
    "i"
  )
);
// #endregion Blocks / Drawers

// #region Blocks / TABLE
// =============================================================================
/**
 * Detects a table row line starting and ending with pipe characters.
 */
export const tableRegex = createRegexPattern(/^\s*\|.*\|$/);
/** Table row (content) line */
export const tableRowLine = createRegexPattern(/^\s*\|.*\|$/);
/** Table row separator line (e.g., |---+---| or |:---|) */
export const tableRowSeparatorLine = createRegexPattern(
  /^\s*\|(?:\s*[-+:]+\s*\|)+\s*$/
);
/**
 * Table row begin anchor: asserts a line whose first non-space char is '|'. Template-only.
 */
export const tableRowBeginRegex = "^\\s*(?=\\|)";
/**
 * Table cell begin punctuation (string) used by template rules to recognize a cell start.
 */
export const tableCellBeginRegex = "\\|\\s*";
/**
 * Table cell end lookahead (string). Matches the boundary before the next '|' or '+' or end-of-line.
 */
export const tableCellEndRegex = "\\s*(?=\\||\\+|$)";
// #endregion Blocks / TABLE
// #endregion BLOCKS

// #region INLINE / TIMESTAMPS
// =============================================================================

/**
 * Active timestamp matcher: angle-bracket timestamps like "<2025-08-27 Wed>".
 * Does not match the trailing part of a range due to the negative lookbehind. No capture groups.
 */
export const timestampActiveRegex = createRegexPattern(
  /<\d{4}-\d{2}-\d{2}[^>]*?(?<!-->)>/
);

/**
 * Inactive timestamp matcher: square-bracket timestamps like "[2025-08-27]". No capture groups.
 */
export const timestampInactiveRegex = createRegexPattern(
  /\[\d{4}-\d{2}-\d{2}[^\]]*?(?<!--)\]/
);

/**
 * Active timestamp range matcher e.g. "<2025-01-01>--<2025-01-07>".
 */
export const timestampActiveRangeRegex = createRegexPattern(
  /<\d{4}-\d{2}-\d{2}[^>]*>--<\d{4}-\d{2}-\d{2}[^>]*>/
);

/**
 * Inactive timestamp range matcher e.g. "[2025-01-01]--[2025-01-07]".
 */
export const timestampInactiveRangeRegex = createRegexPattern(
  /\[\d{4}-\d{2}-\d{2}[^\]]*\]--\[\d{4}-\d{2}-\d{2}[^\]]*\]/
);
// #endregion INLINE / TIMESTAMPS

// #region KEYWORD LINES
// =============================================================================
// #region KEYWORD / INCLUDE
/**
 * Matches a full-line include directive (#\+INCLUDE: path).
 * Capture groups:
 * 1 = the literal "#+INCLUDE:" token
 * 2 = the included path (quoted, bracketed, or bare)
 */
export const includeDirectiveBeginRegex = createRegexPattern(
  /^\s*(#\+INCLUDE:)\s+("[^"]+"|<[^>]+>|[^ \t]+)(?=\s|$)/i
);
// #endregion KEYWORD / INCLUDE
// #region KEYWORD / PLANNING_LINES
// =============================================================================
/**
 * Matches planning lines at beginning of a line such as:
 *   SCHEDULED: <2025-01-01>
 *   DEADLINE: [2025-01-02]--[2025-01-03]
 * Capture groups:
 * 1 = planning keyword (SCHEDULED, DEADLINE, CLOSED)
 * 2 = the timestamp or timestamp range (one of the timestamp patterns)
 */
export const planningLineRegex = createRegexPattern(
  new RegExp(
    `^\\s*(SCHEDULED|DEADLINE|CLOSED):\\s*(${timestampActiveRangeRegex.source}|${timestampActiveRegex.source}|${timestampInactiveRangeRegex.source}|${timestampInactiveRegex.source})\\s*$`,
    "i"
  )
);
// #endregion KEYWORD / PLANNING_LINES

// #endregion KEYWORD / LINK
/**
 * Matches #+LINK: abbreviation definitions.
 * Capture groups:
 * 1 = leading whitespace
 * 2 = the literal "#+LINK:" token
 * 3 = the abbreviation key
 * 4 = the URL template or expansion string
 */
export const linkAbbreviationRegex = createRegexPattern(
  /^(\s*)(#\+LINK:)\s+([a-zA-Z0-9_-]+)\s+(.*)$/i
);
// #endregion KEYWORD / LINK

// #endregion KEYWORD / MACRO
/**
 * Matches a macro definition line like "#+MACRO: name body".
 * Capture groups:
 * 1 = the literal "#+MACRO:" token
 * 2 = macro name
 * 3 = macro body (rest of the line)
 */
export const macroDefinitionRegex = createRegexPattern(
  /^\s*(#\+MACRO:)\s+([a-zA-Z_][a-zA-Z0-9_-]*)\s+(.*)$/i
);
/**
 * Matches macro parameter references such as "$1", "$2".
 * Capture groups:
 * 1 = the parameter token including leading '$'
 */
export const macroParameter = createRegexPattern(/(\$[0-9]+)/);
// #endregion KEYWORD / MACRO

/**
 * Generic keyword line matcher for #+KEY: value lines excluding some reserved keywords.
 * Capture groups:
 * 1 = the full token including #+ and trailing colon (e.g. "#+AUTHOR:")
 * 2 = the keyword name itself
 * 3 = the rest of the line (value)
 */
export const genericKeywordRegex = createRegexPattern(
  /^\s*(#\+(?!LINK|SCHEDULED|DEADLINE|CLOSED|INCLUDE)([^:]+):)\s*(.*)\s*$/i
);
// #endregion KEYWORD LINES

// #region LISTS
// =============================================================================
/**
 * Unordered list item at beginning of line.
 * Matches lines like "- item" or "+ [ ] item".
 * Capture groups:
 * 1 = leading indentation (spaces/tabs)
 * 2 = list marker ("-" or "+")
 * 3 = optional checkbox state (space, "X", or "-") when a checkbox is present
 */
export const unorderedListRegex = createRegexPattern(
  /^(\s*)([-+])\s+(?:\[( |X|-)\])?/
);

/**
 * Ordered list item at beginning of line.
 * Matches lines like "1. item" or "2) [X] item".
 * Capture groups:
 * 1 = leading indentation
 * 2 = ordered marker (digits followed by '.' or ')', e.g. "1." or "2)")
 * 3 = optional checkbox state (space, "X", or "-")
 */
export const orderedListRegex = createRegexPattern(
  /^(\s*)(\d+[.)])\s+(?:\[( |X|-)\])?/
);

/**
 * Description list separator used inside list items.
 * Matches the separator "::" between term and description.
 * Capture groups:
 * 1 = the term (left-hand side)
 * 2 = the literal separator "::"
 */
export const descriptionSeparatorRegex = createRegexPattern(/(.*?)\s*(::)\s*/);

/**
 * Explicit list counter like "[@3]" used to override numbering.
 * Capture groups:
 * 1 = the numeric value inside the counter
 */
export const listCounterRegex = createRegexPattern(/\[@(\d+)\]/);
// #endregion LISTS

// #region HORIZONTAL_RULES
// =============================================================================
/**
 * Horizontal rule line consisting of five or more dashes, optionally indented.
 * Capture groups:
 * 1 = leading indentation
 * 2 = the sequence of dashes (the rule itself)
 */
export const horizontalRuleRegex = createRegexPattern(/^(\s*)(-{5,})\s*$/);
// #endregion HORIZONTAL_RULES

// #region PARAGRAPHS
// =============================================================================
/**
 * Paragraph begin anchor: asserts the line starts with non-space and is not a headline.
 */
export const paragraphBeginRegex = createRegexPattern(/^(?=\S)(?!\*+\s)/);

/**
 * Paragraph end anchor: positive lookahead for an empty line or a headline start. Multiline-aware.
 */
export const paragraphEndRegex = createRegexPattern(
  new RegExp(
    `${"(?=^\\s*$)"}|${(headlineDetectToCloseBlockRegex as any).regex.source}`,
    "m"
  )
);
// #endregion PARAGRAPHS

// #region INLINE / LINKS
// =============================================================================
/**
 * Matches a standard Org Mode link of the form [[target][description]] or [[target]].
 * Capture groups:
 * 1 = opening punctuation "[["
 * 2 = link target (non-greedy)
 * 3 = optional separator "][" (the literal "]\[")
 * 4 = optional description text (non-greedy)
 * 5 = closing punctuation "]]"
 */
export const linkRegex = createRegexPattern(
  /(\[\[)(.*?)(?:(\]\[)(.*?))?(\]\])/
);
/**
 * Matches the protocol part of a link target.
 */
export const linkProtocolRegex = createRegexPattern(/\b([a-zA-Z0-9_+-]+):/);
/**
 * Plain and angle-bracket links
 */
export const plainLinkRegex = createRegexPattern(
  /(https?|ftp|file):\/\/[^\s<>]+/i
);
/**
 * Angle-bracket URL link, e.g. "<https://example.com>".
 * Capture groups:
 * 1 = the URL inside the angle brackets
 */
export const angleBracketLinkRegex =
  createRegexPattern(/<(https?:\/\/[^>]+)>/i);
// #endregion INLINE / LINKS

// #region INLINE / FOOTNOTES
// =============================================================================
/**
 * Footnote reference of the form [fn:label]. Capture group 1 = label.
 */
export const footnoteReferenceRegex = createRegexPattern(/\[fn:([^:\]]+)\]/);

/**
 * Anonymous footnote reference literal "[fn]". No capture groups.
 */
export const footnoteAnonymousReferenceRegex = createRegexPattern(/\[fn\]/);

/**
 * Inline footnote definition like "[fn:: text]"; capture group 1 = definition text.
 */
export const footnoteInlineDefinitionRegex =
  createRegexPattern(/\[fn::\s*(.*?)\]/);

/**
 * Start of a footnote definition block. Capture groups:
 * 1 = leading indentation
 * 2 = full marker (e.g. "[fn:label]")
 * 3 = the label inside the marker
 * 4 = whitespace separating marker from content
 * 5 = the remainder of the line (content)
 */
export const footnoteDefinitionStartRegex = createRegexPattern(
  /^(\s*)(\[fn:([^\]]+)\])(\s*)(.*)$/
);
/**
 * Footnote definition block end lookahead
 *
 * Footnote definition end lookahead (template atom).
 * Asserts an empty line or the start of another footnote marker to close a footnote block.
 */
export const footnoteDefinitionEndRegex = "(?=^\\s*$|^\\[fn:)";

/**
 * Matches a non-empty content line for footnotes (contains at least one non-space char).
 */
export const footnoteContentRegex = createRegexPattern(/.*\S.*/);
// #endregion INLINE / FOOTNOTES

// #region INLINE / MACROS
/**
 * Inline macro - matches Org Mode inline macro usages like "{{{name}}}" or "{{{name(arg)}}}".
 * Capture groups:
 * 1 = opening punctuation "{{{"
 * 2 = macro body (name and optional arguments, up to but not including a newline)
 * 3 = closing punctuation "}}}"
 */
export const inlineMacroRegex = createRegexPattern(
  /(\{\{\{)([^}\n]+?)(\}\}\})/
);

/**
 * Macro name fragment used inside macro bodies.
 * Matches a valid macro identifier (starts with a letter or underscore, followed by letters/digits/underscore/hyphen).
 * No capture groups.
 */
export const macroNameFragment = createRegexPattern(/[a-zA-Z_][a-zA-Z0-9_-]*/);

/**
 * Macro arguments fragment (simplified): matches a parenthesized argument list including the parentheses.
 * Capture groups: none (the fragment itself contains the parentheses so callers can scope inner content).
 */
export const macroArgsFragment = createRegexPattern(/\([^\)]*\)/);
// #endregion INLINE / MACROS

// #endregion INLINE / LATEX
/**
 * LaTeX inline and display math fragments.
 * Matches inline ($...$), display ($$...$$), and the escaped delimiters "\(...\)" and "\[...\]".
 * No capture groups; the whole match is the LaTeX region.
 */
export const latexInlineRegex = createRegexPattern(
  /\$\$.*?\$\$|\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\]/
);
// #endregion INLINE / LATEX

// #region INLINE_MARKUP
// =============================================================================
/**
 * Bold markup begin anchor.
 * Matches the opening asterisk used for bold markup when it is a valid begin token.
 * Example match: the first '*' in " *bold*" or "|*bold*|" when it begins a bold region.
 * Capture groups:
 * 1 = the opening '*' character
 */
export const boldBeginRegex = createRegexPattern(
  /(?<=^|\s|\|)(\*)(?=[^\s*])(?=.*?([^\s*])\*(?!\w))/
);
/**
 * Bold markup end anchor.
 * Matches the closing asterisk of a bold region. Ensures it is not part of a word.
 * Capture groups:
 * 1 = the closing '*' character
 */
export const boldEndRegex = createRegexPattern(/(?<=[^\s*])(\*)(?!\w)/);

/**
 * Italic markup begin anchor.
 * Matches the opening slash used for italic markup ("/") when it starts an italic region.
 * Capture groups:
 * 1 = the opening '/' character
 */
export const italicBeginRegex = createRegexPattern(
  /(?<=^|\s)(\/)(?=[^\s\/])(?=.*?([^\s\/])\/(?!\w))/
);
/**
 * Italic markup end anchor.
 * Matches the closing slash of an italic region.
 * Capture groups:
 * 1 = the closing '/' character
 */
export const italicEndRegex = createRegexPattern(/(?<=[^\s\/])(\/)(?!\w)/);

/**
 * Underline markup begin anchor.
 * Matches the opening underscore used for underline markup when valid.
 * Capture groups:
 * 1 = the opening '_' character
 */
export const underlineBeginRegex = createRegexPattern(
  /(?<=^|\s)(_)(?=[^\s_])(?=.*?([^\s_])_(?!\w))/
);
/**
 * Underline markup end anchor.
 * Matches the closing underscore of an underline region.
 * Capture groups:
 * 1 = the closing '_' character
 */
export const underlineEndRegex = createRegexPattern(/(?<=[^\s_])(_)(?!\w)/);

/**
 * Strikethrough markup begin anchor.
 * Matches the opening '+' used for strike-through markup.
 * Capture groups:
 * 1 = the opening '+' character
 */
export const strikeThroughBeginRegex = createRegexPattern(
  /(?<=^|\s)(\+)(?=[^\s+])(?=.*?([^\s+])\+(?!\w))/
);
/**
 * Strikethrough markup end anchor.
 * Matches the closing '+' of a strike-through region.
 * Capture groups:
 * 1 = the closing '+' character
 */
export const strikeThroughEndRegex = createRegexPattern(
  /(?<=[^\s+])(\+)(?!\w)/
);

/**
 * Code markup begin anchor.
 * Matches the opening tilde used for inline code spans ("~").
 * Capture groups:
 * 1 = the opening '~' character
 */
export const codeBeginRegex = createRegexPattern(
  /(?<=^|\s)(~)(?=[^\s~])(?=.*?([^\s~])~(?!\w))/
);
/**
 * Code markup end anchor.
 * Matches the closing tilde of an inline code span.
 * Capture groups:
 * 1 = the closing '~' character
 */
export const codeEndRegex = createRegexPattern(/(?<=[^\s~])(~)(?!\w)/);

/**
 * Verbatim (monospace) markup begin anchor.
 * Matches the opening '=' character for verbatim text segments.
 * Capture groups:
 * 1 = the opening '=' character
 */
export const verbatimBeginRegex = createRegexPattern(
  /(?<=^|\s)(=)(?=[^\s=])(?=.*?([^\s=])=(?!\w))/
);
/**
 * Verbatim markup end anchor.
 * Matches the closing '=' for verbatim regions.
 * Capture groups:
 * 1 = the closing '=' character
 */
export const verbatimEndRegex = createRegexPattern(/(?<=[^\s=])(=)(?!\w)/);

/**
 * Subscript/superscript fragment used for inline _{...} or ^{...} forms and single-char forms.
 * Capture groups:
 * 1 = the braced content or the single following non-space character
 */
export const subSuperScriptRegex = createRegexPattern(/[_^](\{[^}]+\}|\S)/);
// #endregion INLINE_MARKUP
