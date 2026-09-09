/**
 * Org -> Markdown converter.
 *
 * Strategy (documented in ADR-009):
 * - Document structure (headlines, sections, blocks, tables, lists, drawers,
 *   footnotes) comes from the tree-sitter-org AST.
 * - Inline constructs (emphasis, links, timestamps, macros, math) reuse the
 *   canonical regexes in `common/src/grammar/regex.ts`.
 *
 * The converter is deliberately pure: it takes a parsed tree and returns a
 * Markdown string plus a best-effort Org-line -> Markdown-line map. It does
 * not depend on VS Code or the language server.
 */
import type { Tree, Node as SyntaxNode } from "web-tree-sitter";
import { Emitter, type EmittedDocument } from "./emitter";
import { renderInline } from "./inline";

export interface OrgToMarkdownOptions {
  /**
   * Base directory URI (e.g. `file:///a/b/`) used to resolve relative links.
   */
  baseUri?: string;
  /**
   * Prepend a hidden marker element used by the preview to scope its
   * contributed styles/scripts to Orgdown previews only.
   */
  previewMarker?: boolean;
  /**
   * Optional hook that may replace an image target after it has been resolved
   * (see {@link InlineOptions.resolveImage}). Used by the language server to
   * inline local images that the preview webview cannot load directly.
   */
  resolveImage?: (resolvedTarget: string) => string | undefined;
}

interface Footnote {
  label: string;
  text: string;
  originRow: number;
}

interface RenderContext {
  options: OrgToMarkdownOptions;
  footnotes: Footnote[];
}

const TODO_KEYWORD_RE = /^(TODO|DONE|WAITING|NEXT|COMMENT)\s+/i;
const PRIORITY_RE = /^\[#([A-Z0-9])\]\s*/;
const COOKIE_RE = /\s+\[[0-9/%]+\]\s*$/;
const PLANNING_LINE_RE = /^\s*(SCHEDULED|DEADLINE|CLOSED):\s*(.+)$/i;
const HORIZONTAL_RULE_RE = /^\s*-{5,}\s*$/;
const DIRECTIVE_RE = /^#\+([A-Za-z0-9_-]+):\s*(.*)$/;
const CHECKBOX_RE = /^\[( |X|-)\]\s*(.*)$/;
const DESCRIPTION_ITEM_RE = /^(.+?)\s*::\s*(.*)$/;

/** Named children, with null entries filtered out. */
function named(node: SyntaxNode): SyntaxNode[] {
  return node.namedChildren.filter((c): c is SyntaxNode => c !== null);
}

function stripLeadingIndent(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s+/, ""))
    .join("\n");
}

function decomposeHeadline(itemText: string): {
  todo: string;
  priority: string;
  title: string;
  cookie: string;
} {
  let rest = itemText.trim();
  let todo = "";
  let priority = "";
  let cookie = "";

  const todoMatch = rest.match(TODO_KEYWORD_RE);
  if (todoMatch) {
    todo = todoMatch[1];
    rest = rest.slice(todoMatch[0].length);
  }

  const priorityMatch = rest.match(PRIORITY_RE);
  if (priorityMatch) {
    priority = priorityMatch[0].trim();
    rest = rest.slice(priorityMatch[0].length);
  }

  const cookieMatch = rest.match(COOKIE_RE);
  if (cookieMatch) {
    cookie = cookieMatch[0].trim();
    rest = rest.slice(0, cookieMatch.index);
  }

  return { todo, priority, title: rest.trim(), cookie };
}

function renderSection(node: SyntaxNode, em: Emitter, ctx: RenderContext): void {
  const headline = node.childForFieldName("headline");
  if (headline) {
    const stars = headline.childForFieldName("stars")?.text ?? "";
    const itemText = headline.childForFieldName("item")?.text ?? "";
    const tags = headline.childForFieldName("tags")?.text ?? "";
    const level = Math.max(1, Math.min(stars.replace(/\s/g, "").length, 6));
    const parts = decomposeHeadline(itemText);
    const title = renderInline(parts.title, ctx.options);

    const elements: string[] = [];
    if (parts.todo) {
      elements.push(`<span class="org-todo">${parts.todo}</span>`);
    }
    if (parts.priority) {
      elements.push(`<span class="org-priority">${parts.priority}</span>`);
    }
    elements.push(title);
    if (parts.cookie) {
      elements.push(`<span class="org-progress">${parts.cookie}</span>`);
    }
    if (tags.trim()) {
      elements.push(`<span class="org-tags">${tags.trim()}</span>`);
    }

    em.line(
      `${"#".repeat(level)} ${elements.filter((e) => e !== "").join(" ")}`,
      headline.startPosition.row
    );
  }

  for (const child of named(node)) {
    if (child.type === "headline") {
      continue;
    }
    renderNode(child, em, ctx);
  }
}

function renderDirective(node: SyntaxNode, em: Emitter): void {
  const match = node.text.trim().match(DIRECTIVE_RE);
  if (!match) {
    return;
  }
  const keyword = match[1].toUpperCase();
  const value = match[2].trim();
  if (keyword === "TITLE" && value !== "") {
    em.line(`# ${value}`, node.startPosition.row);
    em.blank();
  }
  // All other directives (AUTHOR, OPTIONS, INCLUDE, ...) are metadata and are
  // not rendered in the preview.
}

function renderParagraphText(
  text: string,
  startRow: number,
  em: Emitter,
  ctx: RenderContext
): void {
  const trimmed = text.trim();
  if (trimmed === "") {
    return;
  }

  if (HORIZONTAL_RULE_RE.test(trimmed)) {
    em.line("---", startRow);
    em.blank();
    return;
  }

  const planningMatch = trimmed.match(PLANNING_LINE_RE);
  if (planningMatch && !trimmed.includes("\n")) {
    em.line(
      `<p class="org-planning"><span class="org-plan-keyword">${planningMatch[1]}:</span> ${renderInline(planningMatch[2], ctx.options)}</p>`,
      startRow
    );
    em.blank();
    return;
  }

  const rendered = renderInline(stripLeadingIndent(text), ctx.options);
  em.block(rendered, startRow);
  em.blank();
}

function renderParagraph(node: SyntaxNode, em: Emitter, ctx: RenderContext): void {
  const directiveChildren = named(node).filter((c) => c.type === "directive");
  if (directiveChildren.length > 0) {
    const directiveRows = new Set(
      directiveChildren.map((c) => c.startPosition.row - node.startPosition.row)
    );
    for (const directive of directiveChildren) {
      renderDirective(directive, em);
    }
    const remainingLines = node.text
      .replace(/\n$/, "")
      .split("\n")
      .filter((_, index) => !directiveRows.has(index));
    if (remainingLines.some((line) => line.trim() !== "")) {
      const firstRemainingLine = node.text
        .replace(/\n$/, "")
        .split("\n")
        .findIndex((_, index) => !directiveRows.has(index));
      renderParagraphText(
        remainingLines.join("\n"),
        node.startPosition.row + Math.max(0, firstRemainingLine),
        em,
        ctx
      );
    }
    return;
  }
  renderParagraphText(node.text, node.startPosition.row, em, ctx);
}

function renderListItems(
  node: SyntaxNode,
  em: Emitter,
  ctx: RenderContext,
  indent: number,
  ordered: boolean
): void {
  const items = named(node).filter((c) => c.type === "listitem");
  const marker = ordered ? "1. " : "- ";

  for (const item of items) {
    const paragraphs = named(item).filter((c) => c.type === "paragraph");
    const nestedList = named(item).find((c) => c.type === "list");
    const indentStr = " ".repeat(indent);

    let content = paragraphs[0]
      ? stripLeadingIndent(paragraphs[0].text.replace(/\n$/, ""))
      : "";
    let checkbox = "";
    const checkboxNode = named(item).find((c) => c.type === "checkbox");
    if (checkboxNode) {
      checkbox = checkboxNode.text.trim() === "[ ]" ? "[ ]" : "[x]";
    } else {
      const checkboxMatch = content.match(CHECKBOX_RE);
      if (checkboxMatch) {
        checkbox = checkboxMatch[1] === " " ? "[ ]" : "[x]";
        content = checkboxMatch[2];
      }
    }

    const descriptionMatch = content.match(DESCRIPTION_ITEM_RE);
    const renderedContent = descriptionMatch
      ? `**${renderInline(descriptionMatch[1], ctx.options)}**: ${renderInline(descriptionMatch[2], ctx.options)}`
      : renderInline(content, ctx.options);

    const checkboxPrefix = checkbox ? `${checkbox} ` : "";
    em.line(
      `${indentStr}${marker}${checkboxPrefix}${renderedContent}`,
      item.startPosition.row
    );

    // Additional paragraphs inside the item become indented continuation lines.
    for (const paragraph of paragraphs.slice(1)) {
      const continuation = renderInline(
        stripLeadingIndent(paragraph.text.replace(/\n$/, "")),
        ctx.options
      );
      em.line(`${" ".repeat(indent + 2)}${continuation}`, paragraph.startPosition.row);
    }

    if (nestedList) {
      const nestedFirstItem = named(nestedList).find((c) => c.type === "listitem");
      const nestedBullet = nestedFirstItem
        ? (named(nestedFirstItem).find((c) => c.type === "bullet")?.text ?? "")
        : "";
      const nestedOrdered = /^\d+[.)]/.test(nestedBullet);
      renderListItems(nestedList, em, ctx, indent + 2, nestedOrdered);
    }
  }
}

function renderList(node: SyntaxNode, em: Emitter, ctx: RenderContext): void {
  const firstItem = named(node).find((c) => c.type === "listitem");
  const firstBullet = firstItem
    ? (named(firstItem).find((c) => c.type === "bullet")?.text ?? "")
    : "";
  const ordered = /^\d+[.)]/.test(firstBullet);
  renderListItems(node, em, ctx, 0, ordered);
  em.blank();
}

function renderTable(node: SyntaxNode, em: Emitter, ctx: RenderContext): void {
  const rows: string[][] = [];

  for (const child of named(node)) {
    if (child.type === "row") {
      const cells = named(child)
        .filter((c) => c.type === "cell")
        .map((cell) => {
          const contents = named(cell).find((c) => c.type === "contents");
          const raw = contents ? contents.text.replace(/\n$/, "").trim() : "";
          return renderInline(raw, ctx.options).replace(/\|/g, "\\|");
        });
      rows.push(cells);
    }
  }

  if (rows.length === 0) {
    return;
  }

  const width = Math.max(...rows.map((row) => row.length));
  const pad = (row: string[]): string[] => [
    ...row,
    ...Array(Math.max(0, width - row.length)).fill(""),
  ];
  const formatRow = (row: string[]): string => `| ${pad(row).join(" | ")} |`;

  // The first row is treated as the header (same convention as pandoc's Org
  // reader); horizontal separator rows (`|---+---|`) are dropped entirely.
  em.line(formatRow(rows[0]), node.startPosition.row);
  em.line(`|${Array(width).fill("---").join("|")}|`, node.startPosition.row + 1);
  for (let i = 1; i < rows.length; i++) {
    em.line(formatRow(rows[i]), node.startPosition.row + i + 1);
  }
  em.blank();
}

function blockName(node: SyntaxNode): string {
  return named(node).find((c) => c.type === "expr")?.text ?? "";
}

function blockParameter(node: SyntaxNode): string {
  return named(node).filter((c) => c.type === "expr")[1]?.text ?? "";
}

function blockContents(node: SyntaxNode): SyntaxNode | undefined {
  return named(node).find((c) => c.type === "contents");
}

function renderBlock(node: SyntaxNode, em: Emitter, ctx: RenderContext): void {
  const name = blockName(node).toUpperCase();
  const contentsNode = blockContents(node);
  const contents = contentsNode ? contentsNode.text : "";

  switch (name) {
    case "COMMENT":
      return;
    case "SRC": {
      const param = blockParameter(node);
      const language = param.split(/\s+/)[0]?.startsWith("-") ? "" : param.split(/\s+/)[0] ?? "";
      em.line(`\`\`\`${language}`, node.startPosition.row);
      em.block(contents, contentsNode?.startPosition.row);
      em.line("```", node.endPosition.row);
      em.blank();
      return;
    }
    case "EXAMPLE": {
      em.line("```", node.startPosition.row);
      em.block(contents, contentsNode?.startPosition.row);
      em.line("```", node.endPosition.row);
      em.blank();
      return;
    }
    case "QUOTE": {
      const quoted = contents
        .replace(/\n$/, "")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      em.block(quoted, contentsNode?.startPosition.row);
      em.blank();
      return;
    }
    case "CENTER": {
      em.line('<div class="org-center">', node.startPosition.row);
      em.line(renderInline(contents.replace(/\n$/, ""), ctx.options), contentsNode?.startPosition.row);
      em.line("</div>", node.endPosition.row);
      em.blank();
      return;
    }
    case "VERSE": {
      em.line('<pre class="org-verse">', node.startPosition.row);
      em.line(contents.replace(/\n$/, ""), contentsNode?.startPosition.row);
      em.line("</pre>", node.endPosition.row);
      em.blank();
      return;
    }
    default: {
      // Customized blocks: keep the content losslessly inside a fenced block.
      const hint = name.toLowerCase();
      em.line(`\`\`\`${hint}`, node.startPosition.row);
      em.block(contents, contentsNode?.startPosition.row);
      em.line("```", node.endPosition.row);
      em.blank();
      return;
    }
  }
}

function renderDynamicBlock(node: SyntaxNode, em: Emitter): void {
  const name = blockName(node).toLowerCase();
  const contentsNode = blockContents(node);
  const contents = contentsNode ? contentsNode.text : "";
  em.line(`\`\`\`${name}`, node.startPosition.row);
  em.block(contents, contentsNode?.startPosition.row);
  em.line("```", node.endPosition.row);
  em.blank();
}

function renderPlan(node: SyntaxNode, em: Emitter, ctx: RenderContext): void {
  const lines = node.text.replace(/\n$/, "").split("\n");
  const rendered = lines
    .map((line) => {
      const match = line.match(PLANNING_LINE_RE);
      if (match) {
        return `<span class="org-plan-keyword">${match[1]}:</span> ${renderInline(match[2], ctx.options)}`;
      }
      return renderInline(line.trim(), ctx.options);
    })
    .join("<br>");
  em.line(`<p class="org-planning">${rendered}</p>`, node.startPosition.row);
  em.blank();
}

function collectFootnote(node: SyntaxNode, ctx: RenderContext): void {
  const labelNode = named(node).find((c) => c.type === "expr");
  const descriptionNode = named(node).find((c) => c.type === "description");
  if (!labelNode || !descriptionNode) {
    return;
  }
  ctx.footnotes.push({
    label: labelNode.text,
    text: descriptionNode.text,
    originRow: node.startPosition.row,
  });
}

function renderFootnotes(em: Emitter, ctx: RenderContext): void {
  if (ctx.footnotes.length === 0) {
    return;
  }
  em.blank();
  for (const footnote of ctx.footnotes) {
    const description = renderInline(
      stripLeadingIndent(footnote.text.replace(/\n$/, "")).replace(/\n/g, " "),
      ctx.options
    );
    em.line(`[^${footnote.label}]: ${description}`, footnote.originRow);
  }
}

function renderNode(node: SyntaxNode, em: Emitter, ctx: RenderContext): void {
  switch (node.type) {
    case "section":
      renderSection(node, em, ctx);
      return;
    case "body":
      for (const child of named(node)) {
        renderNode(child, em, ctx);
      }
      return;
    case "directive":
      renderDirective(node, em);
      return;
    case "comment":
      return; // Org comments are not exported.
    case "paragraph":
      renderParagraph(node, em, ctx);
      return;
    case "list":
      renderList(node, em, ctx);
      return;
    case "table":
      renderTable(node, em, ctx);
      return;
    case "block":
      renderBlock(node, em, ctx);
      return;
    case "dynamic_block":
      renderDynamicBlock(node, em);
      return;
    case "plan":
      renderPlan(node, em, ctx);
      return;
    case "drawer":
    case "property_drawer":
      return; // Drawers are hidden, matching Emacs Org export behavior.
    case "fndef":
      collectFootnote(node, ctx);
      return;
    case "hr":
      em.line("---", node.startPosition.row);
      em.blank();
      return;
    default:
      // Unknown structure: recurse if there are children, otherwise fall back
      // to the raw text so nothing is silently dropped.
      if (named(node).length > 0) {
        for (const child of named(node)) {
          renderNode(child, em, ctx);
        }
      } else {
        const text = node.text.replace(/\n$/, "");
        if (text.trim() !== "") {
          em.block(renderInline(stripLeadingIndent(text), ctx.options), node.startPosition.row);
          em.blank();
        }
      }
      return;
  }
}

/**
 * Convert a parsed Org document tree into Markdown.
 */
export function convertOrgToMarkdown(
  tree: Tree,
  options: OrgToMarkdownOptions = {}
): EmittedDocument {
  const em = new Emitter();
  const ctx: RenderContext = { options, footnotes: [] };

  if (options.previewMarker) {
    em.line('<div id="orgdown-preview-marker"></div>', 0);
  }

  for (const child of named(tree.rootNode)) {
    renderNode(child, em, ctx);
  }

  renderFootnotes(em, ctx);

  return { markdown: em.text, lineMap: em.lineMap };
}
