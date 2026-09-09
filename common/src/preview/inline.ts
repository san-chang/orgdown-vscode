/**
 * Inline Org markup -> Markdown/HTML renderer.
 *
 * tree-sitter-org intentionally leaves inline constructs (bold, italic,
 * links, timestamps, ...) as plain text inside paragraphs, headlines and
 * table cells. The canonical Org regexes already live in
 * `common/src/grammar/regex.ts` (single source of truth for the TextMate
 * grammar), so this renderer reuses those exact patterns instead of
 * maintaining a second set of rules.
 */
import * as R from "../grammar/regex";

export interface InlineOptions {
  /**
   * Base directory URI (e.g. `file:///a/b/`) used to resolve relative Org
   * links such as `[[./img.png]]` into absolute file URIs so the built-in
   * Markdown preview can resolve them against the virtual document.
   */
  baseUri?: string;
  /**
   * Optional hook that may replace an image target after it has been resolved.
   *
   * The built-in Markdown preview loads local `file:` images through its
   * webview, which is restricted to the webview's `localResourceRoots`. For a
   * virtual preview document those roots do not include the Org file's
   * directory, so the server uses this hook to inline local images as `data:`
   * URIs. Returning `undefined` keeps the original target.
   */
  resolveImage?: (resolvedTarget: string) => string | undefined;
}

interface MatchResult {
  match: RegExpExecArray;
  end: number;
}

// JavaScript ignores `lastIndex` on non-global regexes, so `matchAt` needs a
// global clone to search from an exact position. The clones are cached per
// pattern to avoid recompiling them on every call.
const globalRegexCache = new WeakMap<RegExp, RegExp>();

function toGlobal(regex: RegExp): RegExp {
  if (regex.flags.includes("g")) {
    return regex;
  }
  let global = globalRegexCache.get(regex);
  if (!global) {
    global = new RegExp(regex.source, `${regex.flags}g`);
    globalRegexCache.set(regex, global);
  }
  return global;
}

function matchAt(text: string, regex: RegExp, index: number): MatchResult | null {
  const global = toGlobal(regex);
  global.lastIndex = index;
  const match = global.exec(text);
  if (!match || match.index !== index) {
    return null;
  }
  return { match, end: match.index + match[0].length };
}

const IMAGE_EXTENSION_RE = /\.(?:png|jpe?g|gif|svg|webp|bmp|tiff?|ico|avif)$/i;

/**
 * Whether an Org link target points at an image file. Org Mode renders image
 * links inline, so the Markdown output must use image syntax (`![...]()`)
 * instead of a regular link.
 */
function isImageTarget(target: string): boolean {
  // Strip an explicit `file:` protocol prefix (e.g. `file:./img.png`).
  const pathPart = target.trim().replace(/^file:/i, "");
  // Ignore trailing anchors/queries when deciding (e.g. `img.png#x`).
  const lastSegment = pathPart.split(/[#?]/)[0];
  return IMAGE_EXTENSION_RE.test(lastSegment);
}

function resolveLinkTarget(target: string, baseUri?: string): string {
  const trimmed = target.trim();
  // `file:` with a relative path behaves like a plain relative path and
  // should be resolved against the Org file's directory when available.
  if (/^file:/i.test(trimmed) && !trimmed.startsWith("file://")) {
    return resolveLinkTarget(trimmed.slice("file:".length), baseUri);
  }
  // Other explicit protocols (https:, id:, ...) and in-document anchors pass
  // through unchanged.
  if (/^[a-zA-Z0-9_+-]+:/.test(trimmed) || trimmed.startsWith("#")) {
    return trimmed;
  }
  if (baseUri) {
    try {
      return new URL(trimmed, baseUri.endsWith("/") ? baseUri : `${baseUri}/`).href;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function renderLink(match: RegExpExecArray, options: InlineOptions): string {
  const target = (match[2] ?? "").trim();
  const description = (match[4] ?? "").trim();
  const url = resolveLinkTarget(target, options.baseUri);
  if (isImageTarget(target)) {
    const alt = description !== "" ? renderInline(description, options) : "";
    const src = options.resolveImage?.(url) ?? url;
    return `![${alt}](${src})`;
  }
  const label = description !== "" ? renderInline(description, options) : target;
  return `[${label}](${url})`;
}

interface EmphasisRule {
  begin: RegExp;
  end: RegExp;
  wrap: (inner: string) => string;
}

const EMPHASIS_RULES: EmphasisRule[] = [
  {
    begin: R.boldBeginRegex.regex,
    end: R.boldEndRegex.regex,
    wrap: (inner) => `<strong>${inner}</strong>`,
  },
  {
    begin: R.italicBeginRegex.regex,
    end: R.italicEndRegex.regex,
    wrap: (inner) => `<em>${inner}</em>`,
  },
  {
    begin: R.underlineBeginRegex.regex,
    end: R.underlineEndRegex.regex,
    wrap: (inner) => `<u>${inner}</u>`,
  },
  {
    begin: R.strikeThroughBeginRegex.regex,
    end: R.strikeThroughEndRegex.regex,
    wrap: (inner) => `<s>${inner}</s>`,
  },
  {
    begin: R.codeBeginRegex.regex,
    end: R.codeEndRegex.regex,
    wrap: (inner) => `<code>${inner}</code>`,
  },
  {
    begin: R.verbatimBeginRegex.regex,
    end: R.verbatimEndRegex.regex,
    wrap: (inner) => `<code class="org-verbatim">${inner}</code>`,
  },
];

function findEmphasisSpan(
  text: string,
  rule: EmphasisRule,
  start: number
): { innerStart: number; innerEnd: number; end: number } | null {
  const begin = matchAt(text, rule.begin, start);
  if (!begin) {
    return null;
  }
  const beginEnd = begin.end;
  const endRegex = toGlobal(rule.end);
  endRegex.lastIndex = beginEnd;
  const endMatch = endRegex.exec(text);
  if (!endMatch || endMatch.index < beginEnd || endMatch.index === beginEnd) {
    return null;
  }
  return {
    innerStart: beginEnd,
    innerEnd: endMatch.index,
    end: endMatch.index + endMatch[0].length,
  };
}

function renderLine(line: string, options: InlineOptions): string {
  let out = "";
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    // Org escape character: keep the escaped character verbatim.
    if (char === "\\" && i + 1 < line.length) {
      out += char + line[i + 1];
      i += 2;
      continue;
    }

    // LaTeX (pass through unchanged; the Markdown preview renders math).
    const latex = matchAt(line, R.latexInlineRegex.regex, i);
    if (latex) {
      out += latex.match[0];
      i = latex.end;
      continue;
    }

    // [[target][description]] / [[target]]
    const link = matchAt(line, R.linkRegex.regex, i);
    if (link) {
      out += renderLink(link.match, options);
      i = link.end;
      continue;
    }

    // <https://example.com>
    const angleLink = matchAt(line, R.angleBracketLinkRegex.regex, i);
    if (angleLink) {
      const url = angleLink.match[1];
      out += `<${url}>`;
      i = angleLink.end;
      continue;
    }

    // Bare https:// / ftp:// / file:// URLs
    const plainLink = matchAt(line, R.plainLinkRegex.regex, i);
    if (plainLink) {
      out += `<${plainLink.match[0]}>`;
      i = plainLink.end;
      continue;
    }

    // Timestamp ranges before single timestamps.
    const tsRange = matchAt(line, R.timestampActiveRangeRegex.regex, i);
    if (tsRange) {
      out += `<span class="org-timestamp">${tsRange.match[0]}</span>`;
      i = tsRange.end;
      continue;
    }
    const tsRangeInactive = matchAt(line, R.timestampInactiveRangeRegex.regex, i);
    if (tsRangeInactive) {
      out += `<span class="org-timestamp org-timestamp-inactive">${tsRangeInactive.match[0]}</span>`;
      i = tsRangeInactive.end;
      continue;
    }
    const tsActive = matchAt(line, R.timestampActiveRegex.regex, i);
    if (tsActive) {
      out += `<span class="org-timestamp">${tsActive.match[0]}</span>`;
      i = tsActive.end;
      continue;
    }
    const tsInactive = matchAt(line, R.timestampInactiveRegex.regex, i);
    if (tsInactive) {
      out += `<span class="org-timestamp org-timestamp-inactive">${tsInactive.match[0]}</span>`;
      i = tsInactive.end;
      continue;
    }

    // Footnotes: [fn:label] -> Markdown footnote reference.
    const footnote = matchAt(line, R.footnoteReferenceRegex.regex, i);
    if (footnote) {
      out += `[^${footnote.match[1]}]`;
      i = footnote.end;
      continue;
    }

    // Inline macros: keep the raw invocation text.
    const macro = matchAt(line, R.inlineMacroRegex.regex, i);
    if (macro) {
      out += macro.match[0];
      i = macro.end;
      continue;
    }

    // Emphasis (bold, italic, underline, strike, code, verbatim).
    let emphasisHandled = false;
    for (const rule of EMPHASIS_RULES) {
      const span = findEmphasisSpan(line, rule, i);
      if (span && span.innerEnd > span.innerStart) {
        const inner = renderInline(line.slice(span.innerStart, span.innerEnd), options);
        out += rule.wrap(inner);
        i = span.end;
        emphasisHandled = true;
        break;
      }
    }
    if (emphasisHandled) {
      continue;
    }

    // Sub/superscript: ^{...} / _{...} / ^x / _x
    const subSuper = matchAt(line, R.subSuperScriptRegex.regex, i);
    if (subSuper) {
      const marker = subSuper.match[0][0];
      const rawInner = subSuper.match[1];
      const inner = rawInner.startsWith("{")
        ? rawInner.slice(1, -1)
        : rawInner;
      const tag = marker === "^" ? "sup" : "sub";
      out += `<${tag}>${inner}</${tag}>`;
      i = subSuper.end;
      continue;
    }

    // Plain character.
    out += char;
    i += 1;
  }

  return out;
}

/**
 * Render inline Org markup in `text` to Markdown/HTML.
 * Multi-line input is processed line by line and joined back with newlines.
 */
export function renderInline(text: string, options: InlineOptions = {}): string {
  const normalized = text.replace(/\n$/, "");
  if (normalized === "") {
    return "";
  }
  return normalized.split("\n").map((line) => renderLine(line, options)).join("\n");
}
