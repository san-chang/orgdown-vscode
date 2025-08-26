// common/src/scoping.ts
// Single Source of Truth for TextMate Scopes

// =================================================================
// 1. ABSTRACT STRUCTURAL SCOPES
// =================================================================
// These scopes are for defining the hierarchical structure of the
// document and are not typically styled directly.
export const META_DOCUMENT = 'text.org';

/** The entire file header, from the beginning to the first heading. */
export const META_HEADER = 'meta.file.header.org';

export const META_PARAGRAPH = 'meta.paragraph.org';

export const PARAGRAPH = 'markup.paragraph.org';

/** The entire outline node, from a headline to the next. */
export const META_NODE = 'meta.outline-node.org';

/** A meta scope for an active (normal) outline node. */
export const META_NODE_ACTIVE = 'meta.outline-node.active.org';

/** A meta scope for an inactive (commented or archived) outline node. */
export const META_NODE_INACTIVE =
  'meta.outline-node.inactive.org';

/** The content of a section, between headlines. */
export const META_SECTION = 'meta.section.org';

/** Any single-line keyword-like directive. */
export const META_DIRECTIVE = 'meta.directive.org';

/** Any block-level element (begin-end, drawer, etc.). */
export const META_BLOCK = 'meta.block.org';

/** Any block defined by `#+BEGIN...` and `#+END...`. */
export const META_BEGIN_END_BLOCK = 'meta.block.begin-end.org';

/** Any drawer block defined by `:NAME:` and `:END:`. */
export const META_DRAWER = 'meta.block.drawer.org';

// Outline container meta scopes (per-level and inactive) used by the grammar template
export const META_OUTLINE_1 = 'meta.outline.1.org';
export const META_OUTLINE_2 = 'meta.outline.2.org';
export const META_OUTLINE_3 = 'meta.outline.3.org';
export const META_OUTLINE_4 = 'meta.outline.4.org';
export const META_OUTLINE_5 = 'meta.outline.5.org';
export const META_OUTLINE_6 = 'meta.outline.6.org';
export const META_OUTLINE_MORE_THAN_6 = 'meta.outline.more-than-6.org';
/** Container scope applied to inactive (commented/archived) outline levels. */
export const META_OUTLINE_INACTIVE = 'comment.outline.org';

// =================================================================
// 2. DETAILED IMPLEMENTATIONS
// =================================================================

// region Headlines
// =================================================================

/** The entire headline block, applied to the whole line. */
export const HEADING_BLOCK = 'markup.heading.org';

/** A headline that is active (not commented out or archived). */
export const HEADING_ACTIVE = 'markup.heading.active.org';

/** A headline that is commented out or archived. */
export const HEADING_INACTIVE = 'markup.heading.inactive.org';

/** The headline level, e.g., heading.1.org */
export const HEADING_LEVEL_1 = 'markup.heading.1.org';
export const HEADING_LEVEL_2 = 'markup.heading.2.org';
export const HEADING_LEVEL_3 = 'markup.heading.3.org';
export const HEADING_LEVEL_4 = 'markup.heading.4.org';
export const HEADING_LEVEL_5 = 'markup.heading.5.org';
export const HEADING_LEVEL_6 = 'markup.heading.6.org';
export const HEADING_LEVEL_MORE_THAN_6 = 'markup.heading.more-than-6.org';

/** The leading stars, e.g., `*` or `**`. */
export const HEADING_PUNCTUATION = 'punctuation.definition.heading.org';

/** A TODO keyword, e.g., `TODO`, `DONE`. */
export const TODO_KEYWORD = 'keyword.other.todo.org';

/** The entire priority cookie, e.g., `[#A]`. */
export const PRIORITY_COOKIE = 'constant.other.priority.org';

/** The letter inside a priority cookie, e.g., `A`. */
export const PRIORITY_VALUE = 'constant.other.priority.value.org';

/** The main title text of the headline. */
export const HEADING_TITLE = 'entity.name.section.org';

/** The progress cookie, e.g., `[50%]`. */
export const PROGRESS_COOKIE = 'constant.other.progress.org';

/** A tag, e.g., `:work:`. */
export const TAG = 'entity.name.tag.org';

// endregion

// region Lists
// =================================================================

/** An unordered list item's text content. */
export const LIST_UNORDERED_TEXT = 'markup.list.unnumbered.org';

/** An ordered list item's text content. */
export const LIST_ORDERED_TEXT = 'markup.list.numbered.org';

/** The bullet of a list item, e.g., `-`, `+`, `1.`. */
export const LIST_BULLET = 'punctuation.definition.list.begin.org';

/** A checkbox, including the brackets. */
export const CHECKBOX = 'constant.language.checkbox.org';

/** The term in a description list. */
export const DESCRIPTION_TERM = 'entity.name.tag.description.term.org';

/** The `::` separator in a description list. */
export const DESCRIPTION_SEPARATOR = 'punctuation.separator.key-value.org';

/** The counter in an ordered list, e.g., `[@5]`. */
export const LIST_COUNTER = 'constant.numeric.list.counter.org';

/** The numeric value inside a counter, e.g., `5`. */
export const LIST_COUNTER_VALUE = 'constant.numeric.list.counter.value.org';

// endregion

// region Horizontal Rules
// =================================================================

/** A horizontal rule, e.g., `-----`. */
export const HORIZONTAL_RULE = 'meta.separator.org';

// endregion

// region Generic Block Parts
// =================================================================

/** A block of insignificant whitespace. */
export const PUNCTUATION_WHITESPACE = 'punctuation.whitespace.org';

/** Leading whitespace for lists and blocks. */
export const LEADING_WHITESPACE = 'string.other.whitespace.leading.org';

/** The content of a block. */
export const BLOCK_CONTENT = 'markup.block.org';

/** The keyword of a block, e.g., `#+BEGIN_SRC`, `#+END_QUOTE`. */
export const BLOCK_KEYWORD = 'keyword.control.block.org';

/** The name of a block, e.g., `QUOTE`, `SRC`. */
export const BLOCK_NAME = 'entity.name.function.block.org';

/** The parameters of a block. */
export const BLOCK_PARAMETERS = 'variable.parameter.block.org';

/** The key of a parameter, e.g., `:results`. */
export const BLOCK_PARAMETER_KEY = 'keyword.other.property.key.org';

/** The value of a parameter, e.g., `output`. */
export const BLOCK_PARAMETER_VALUE = 'string.unquoted.property.value.org';

// endregion

// region Specific Blocks
// =================================================================

/** The meta scope for the entire standard block. */
export const BLOCK_STANDARD_META = 'meta.block.begin-end.standard.org';

/** The content area of a standard block. */
export const BLOCK_STANDARD_CONTENT = 'markup.block.standard.org';

/** The meta scope for the entire source block. */
export const BLOCK_SRC_META = 'meta.block.begin-end.src.org';

/** The content area of a source block. */
export const BLOCK_SRC_CONTENT = 'markup.block.src.org';

/** The language identifier in a source block, e.g., `python`. */
export const BLOCK_LANGUAGE = 'entity.name.type.language.org';

/** A switch in a source block, e.g., `-n` or `+n`. */
export const BLOCK_SWITCH = 'storage.modifier.switch.org';

/** The meta scope for the entire dynamic block. */
export const DYNAMIC_BLOCK_META = 'meta.block.begin-end.dynamic.org';

/** The content area of a dynamic block. */
export const DYNAMIC_BLOCK_CONTENT = 'markup.block.dynamic.org';

/** The meta scope for the entire customized block. */
export const BLOCK_CUSTOMIZED_META = 'meta.block.begin-end.customized.org';

/** The content area of a customized block. */
export const BLOCK_CUSTOMIZED_CONTENT = 'markup.block.customized.org';

// endregion

// region Keyword-Like Lines
// =================================================================

/** The entire keyword line, e.g., `#+TITLE: My Title`. */
export const KEYWORD = 'meta.directive.keyword.org';

/** The keyword key, e.g., `#+TITLE:`. */
export const KEYWORD_KEY = 'keyword.other.org';

/** The name of the keyword, e.g., `TITLE`. */
export const KEYWORD_NAME = 'entity.name.function.org';

/** The value of the keyword, e.g., `My Title`. */
export const KEYWORD_VALUE = 'string.unquoted.org';

/** The meta scope for a link abbreviation line. */
export const LINK_ABBREVIATION_META = 'meta.directive.link-abbreviation.org';

/** The `#+LINK:` keyword itself. */
export const LINK_ABBREVIATION_KEYWORD = 'keyword.other.link.abbreviation.org';

/** The abbreviation key, e.g., `gh`. */
export const LINK_ABBREVIATION_KEY = 'variable.parameter.link.abbreviation.org';

/** The URL template for an abbreviation. */
export const LINK_ABBREVIATION_URL = 'string.unquoted.link.abbreviation.url.org';

/** The meta scope for the entire planning line. */
export const PLANNING_LINE_META = 'meta.directive.planning.org';

/** The keyword for a planning line. */
export const PLANNING_KEYWORD = 'keyword.control.task-management.org';

/** The timestamp for a planning line. */
export const PLANNING_TIMESTAMP = 'constant.other.timestamp.planning.org';

// endregion

// region Include Directive
// =================================================================

/** The include directive token, e.g., #+INCLUDE: */
export const INCLUDE_KEYWORD = 'keyword.other.include.org';

/** The include path/target, e.g., "file.org" or <file> */
export const INCLUDE_PATH = 'string.quoted.include.path.org';

/** Options following the include (e.g., :lines, :minlevel, etc.) */
export const INCLUDE_OPTIONS = 'meta.directive.include.options.org';

// endregion

// region Drawers
// =================================================================

/** The keyword for the beginning of a drawer. */
export const DRAWER_BEGIN_KEYWORD = 'keyword.control.block.drawer.begin.org';

/** The keyword for the end of a drawer. */
export const DRAWER_END_KEYWORD = 'keyword.control.block.drawer.end.org';

/** The name of a drawer. */
export const DRAWER_NAME = 'entity.name.function.drawer.org';

/** The content of a drawer. */
export const DRAWER_CONTENT = 'markup.block.drawer.content.org';

/** The meta scope for the entire properties drawer. */
export const PROPERTY_DRAWER_META = 'meta.block.drawer.property.org';

/** The keyword for the beginning of a properties drawer. */
export const PROPERTY_DRAWER_BEGIN_KEYWORD = 'punctuation.definition.property-drawer.begin.org';

/** The keyword for the end of a properties drawer. */
export const PROPERTY_DRAWER_END_KEYWORD = 'punctuation.definition.property-drawer.end.org';

/** The meta scope for a single property line. */
export const PROPERTY_META = 'meta.property.org';

/** The key of a property, e.g., `:Key:`. */
export const PROPERTY_KEY = 'entity.name.property.org';

/** The value of a property. */
export const PROPERTY_VALUE = 'variable.other.property.value.org';

// endregion

// region Timestamps
// =================================================================

/** An active timestamp, e.g., `<2025-08-01 Fri>`. */
export const TIMESTAMP_ACTIVE = 'constant.other.timestamp.active.org';

/** An inactive timestamp, e.g., `[2025-08-01 Fri]`. */
export const TIMESTAMP_INACTIVE = 'constant.other.timestamp.inactive.org';

/** An active timestamp range, e.g., `<2025-08-01>--<2025-08-02>`. */
export const TIMESTAMP_ACTIVE_RANGE = 'constant.other.timestamp.active.range.org';

/** An inactive timestamp range, e.g., `[2025-08-01]--[2025-08-02]`. */
export const TIMESTAMP_INACTIVE_RANGE = 'constant.other.timestamp.inactive.range.org';

// endregion


// region Macros (inline)
// =================================================================

/** Meta scope for an entire inline macro construct (e.g. {{{name(...)}}}). */
export const META_INLINE_MACRO = 'meta.inline.macro.org';

/** The macro itself (container scope). */
export const MACRO = 'variable.other.macro.org';

/** Punctuation for macro delimiters (opening/closing braces). */
export const MACRO_PUNCTUATION = 'punctuation.definition.macro.org';

/** The macro name (function-like identifier). */
export const MACRO_NAME = 'entity.name.function.macro.org';

/** Macro parameter or argument scope. */
export const MACRO_PARAMETER = 'variable.parameter.macro.org';

// endregion

// region Inline Markup
// =================================================================

export const BOLD = 'markup.bold.org';
export const ITALIC = 'markup.italic.org';
export const UNDERLINE = 'markup.underline.org';
export const STRIKE_THROUGH = 'markup.strikethrough.org';
export const CODE = 'markup.inline.raw.org';
export const VERBATIM = 'markup.inline.raw.org';
export const LINK = 'markup.underline.link.org';
export const LATEX = 'markup.math.org';
export const ENTITY = 'constant.character.entity.org';
export const SUB_SUPER_SCRIPT = 'markup.other.sub-super-script.org';

/** Punctuation for inline markup, e.g., the * in *bold*. */
export const BOLD_PUNCTUATION = 'punctuation.definition.bold.org';
export const ITALIC_PUNCTUATION = 'punctuation.definition.italic.org';
export const UNDERLINE_PUNCTUATION = 'punctuation.definition.underline.org';
export const STRIKE_THROUGH_PUNCTUATION = 'punctuation.definition.strikethrough.org';
export const CODE_PUNCTUATION = 'punctuation.definition.raw.code.org';
export const VERBATIM_PUNCTUATION = 'punctuation.definition.raw.verbatim.org';

/** The meta scope for an entire inline markup construct. */
export const META_INLINE_BOLD = 'meta.inline.bold.org';
export const META_INLINE_ITALIC = 'meta.inline.italic.org';
export const META_INLINE_UNDERLINE = 'meta.inline.underline.org';
export const META_INLINE_STRIKE_THROUGH = 'meta.inline.strikethrough.org';
export const META_INLINE_CODE = 'meta.inline.code.org';
export const META_INLINE_VERBATIM = 'meta.inline.verbatim.org';

/** The entire link structure, e.g., [[...]]. */
export const LINK_META = 'meta.link.org';

/** The opening brackets of a link, e.g., `[[`. */
export const LINK_BEGIN_PUNCTUATION = 'punctuation.definition.link.begin.org';

/** The closing brackets of a link, e.g., `]]`. */
export const LINK_END_PUNCTUATION = 'punctuation.definition.link.end.org';

/** The separator between target and description, e.g., `][`. */
export const LINK_SEPARATOR_PUNCTUATION = 'punctuation.separator.link.org';

/** The description part of a link. */
export const LINK_DESCRIPTION = 'string.other.link.description.org';

/** A plain URL in text that is automatically linked. */
export const LINK_PLAIN = 'markup.underline.link.plain.org';

/** A URL enclosed in angle brackets. */
export const LINK_ANGLE = 'markup.underline.link.angle.org';

/** The protocol of a link, e.g., `http:`, `file:`. */
export const LINK_PROTOCOL = 'keyword.other.link.protocol.org';

// endregion

// region Footnotes
// =================================================================

/** The scope for an inline footnote reference, e.g., `[fn:1]`. */
export const FOOTNOTE_REFERENCE = 'markup.footnote.reference.org';

/** Punctuation used to define or reference a footnote (brackets, colons). */
export const FOOTNOTE_PUNCTUATION = 'punctuation.definition.footnote.org';

/** The label/id of a footnote, e.g., `1` or `label`. */
export const FOOTNOTE_LABEL = 'constant.other.footnote.label.org';

/** Meta scope for a footnote definition block/line. */
export const FOOTNOTE_DEFINITION = 'meta.footnote.definition.org';

/** The content text of a footnote definition. */
export const FOOTNOTE_CONTENT = 'markup.footnote.content.org';

// endregion

// region Tables (table-specific scopes)
// =================================================================

/** Meta scope for a whole table block. */
export const META_TABLE = 'meta.block.table.org';

/** Alias used in the grammar template for the table begin/end meta scope. */
export const TABLE_META = 'meta.block.begin-end.table.org';

/** The content area of a table block. */
export const TABLE_CONTENT = 'markup.block.table.org';

/** A single table row. */
export const TABLE_ROW = 'markup.block.table.row.org';

/** A table cell content scope. */
export const TABLE_CELL = 'markup.table.cell.org';

/** Punctuation for table cell separators ("|" or "+"). */
export const TABLE_CELL_PUNCTUATION = 'punctuation.separator.table.cell.org';

/** A row-separator line (e.g., "|---+---|"). */
export const TABLE_ROW_SEPARATOR = 'punctuation.definition.table.row-separator.org';

/** Optional meta scopes for caption/attributes and formulas. */
export const TABLE_CAPTION_META = 'meta.directive.table.caption.org';
export const TABLE_ATTR_META = 'meta.directive.table.attr.org';
export const TABLE_FORMULA = 'meta.directive.table.formula.org';

// endregion

// region Comments
// =================================================================

/** A single-line comment starting with '# ' */
export const COMMENT_LINE = 'comment.line.number-sign.org';

/** A block-level comment, e.g. #+BEGIN_COMMENT ... #+END_COMMENT */
export const COMMENT_BLOCK =
  'comment.block.org meta.block.begin-end.org meta.block.begin-end.standard.org';

export const COMMENT_BLOCK_CONTENT = 'comment.block.content.org';
// endregion
