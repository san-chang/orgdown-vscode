/**
 * Markdown emitter with source-line tracking.
 *
 * The Orgdown preview pipeline converts Org documents to Markdown. Keeping a
 * mapping from Org source lines to generated Markdown lines is the foundation
 * for editor<->preview scroll sync and for locating preview regions back in
 * the source document.
 */
export interface EmittedDocument {
  markdown: string;
  /**
   * lineMap[orgLine] === mdLine means that the Org line `orgLine` (0-based)
   * contributed content that landed on Markdown line `mdLine` (0-based).
   * Entries are only written for lines that were explicitly emitted; lines
   * that were skipped (comments, drawers, ...) have no entry.
   */
  lineMap: number[];
}

export class Emitter {
  private chunks: string[] = [];
  private currentLine = 0;
  private map: number[] = [];

  /**
   * Append a single line of Markdown. A trailing newline is added for you.
   *
   * @param line Markdown text for one line (must not contain '\n').
   * @param originRow The Org source row this line originates from (optional).
   */
  line(line: string, originRow?: number): void {
    if (originRow !== undefined) {
      this.map[originRow] = this.currentLine;
    }
    this.chunks.push(line, "\n");
    this.currentLine += 1;
  }

  /**
   * Append a block of text that may span multiple lines. If `originStartRow`
   * is provided, every line of `text` is mapped to successive Markdown lines
   * starting at the current output position (a best-effort 1:1 mapping used
   * by the structure renderers).
   */
  block(text: string, originStartRow?: number): void {
    const trimmed = text.replace(/\n$/, "");
    if (trimmed === "") {
      return;
    }
    const lines = trimmed.split("\n");
    for (let i = 0; i < lines.length; i++) {
      this.line(lines[i], originStartRow !== undefined ? originStartRow + i : undefined);
    }
  }

  /** Append a blank line. */
  blank(originRow?: number): void {
    this.line("", originRow);
  }

  /** Current output line count (0-based; equals number of lines emitted so far). */
  get lineCount(): number {
    return this.currentLine;
  }

  get text(): string {
    return this.chunks.join("");
  }

  get lineMap(): number[] {
    return this.map;
  }
}
