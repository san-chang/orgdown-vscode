import * as scopeModule from "./scoping";
export type TestType = "regex" | "scope" | "folding" | "symbols";

export interface RegexExpectation {
  type: "regex";
  name: string;
  shouldMatch: boolean;
  captures?: { index: number; value: string }[];
}

export interface ScopeExpectation {
  type: "scope";
  assertions: {
    text: string;
    mustContain: string[];
    mustNotContain: string[];
  }[];
  // Optional tree representation, built from indentation depth
  tree?: ScopeNode[];
}

export interface ScopeNode {
  text: string;
  mustContain: string[];
  mustNotContain: string[];
  children: ScopeNode[];
}

export interface FoldingExpectation {
  type: "folding";
  ranges: { startLine: number; endLine: number }[];
}

export interface SymbolNode {
  name: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  children: SymbolNode[];
}

export interface SymbolsExpectation {
  type: "symbols";
  symbols: SymbolNode[];
}

export type Expectation = RegexExpectation | ScopeExpectation | FoldingExpectation | SymbolsExpectation;

export interface FixtureTestCase {
  name: string;
  input: string;
  expectations: Expectation[];
}

function processExpectedValue(value: string): string {
  return value
    .replace(/<sp:(\d+)>/g, (_, count) => " ".repeat(parseInt(count, 10)))
    .replace(/<tab>/g, "\t")
    .replace(/<pipe>/g, "|");
}

function parseExpectedArgs(line: string): Map<string, string> {
  const args = new Map<string, string>();
  const regex = /:(\w+)\s+([^:]+)/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    args.set(match[1].toLowerCase(), match[2].trim());
  }
  return args;
}

function parseExpectedBlock(
  lines: string[],
  startIndex: number
): { expectations: Expectation[]; endIndex: number } {
  const allExpectations: Expectation[] = [];
  let currentIndex = startIndex;

  while (
    currentIndex < lines.length &&
    lines[currentIndex].trim().toLowerCase().startsWith("#+expected:")
  ) {
    const expectedLine = lines[currentIndex];
    const args = parseExpectedArgs(expectedLine);
    const testType = args.get("type");

    const blockContentLines: string[] = [];
    let blockEndIndex = currentIndex;

    for (let j = currentIndex + 1; j < lines.length; j++) {
      const rawLine = lines[j];
      const line = rawLine.trim();
      // End the EXPECTED block on the next test/name marker, another EXPECTED,
      // or a top-level headline (starts with one or more '*'). This prevents
      // suggestion-style scope blocks followed immediately by a heading from
      // being treated as invalid content.
      if (
        line.startsWith("#+NAME:") ||
        line.startsWith("#+BEGIN_FIXTURE") ||
        line.startsWith("#+EXPECTED:") ||
        // Only treat a headline (e.g. "* Heading") as a terminator when it is
        // not itself a scope assertion (which would include '=>'). This allows
        // scope expectation lines that start with '*' (for headings) to be
        // parsed correctly.
        (/^\*+\s/.test(line) && !line.includes("=>"))
      ) {
        blockEndIndex = j - 1;
        break;
      }
      blockContentLines.push(rawLine); // Keep original indentation for table parsing
      blockEndIndex = j;
    }

    if (testType === "regex") {
      const regexName = args.get("name");
      if (!regexName) {
        throw new Error(
          `Regex test case is missing a :name argument in line: ${expectedLine}`
        );
      }

      let shouldMatch = true;
      const tableLines: string[] = [];
      for (const line of blockContentLines) {
        if (line.trim().toLowerCase() === "no-match") {
          shouldMatch = false;
        } else if (line.trim().startsWith("|")) {
          tableLines.push(line.trim());
        }
      }

      const captures = tableLines
        .map((line) => {
          const parts = line.split("|").map((s) => s.trim());
          if (parts.length >= 3) {
            const groupNumStr = parts[1];
            if (groupNumStr !== "Group #" && !groupNumStr.includes("---")) {
              return {
                index: parseInt(groupNumStr, 10),
                value: processExpectedValue(parts[2]),
              };
            }
          }
          return null;
        })
        .filter(
          (item): item is { index: number; value: string } => item !== null
        );

      allExpectations.push({
        type: "regex",
        name: regexName,
        shouldMatch,
        captures: shouldMatch ? captures : undefined,
      });
    } else if (testType === "scope") {
      const assertions: {
        text: string;
        mustContain: string[];
        mustNotContain: string[];
      }[] = [];

      // Build a tree from indentation
      const roots: ScopeNode[] = [];
      const nodeStack: Array<{ depth: number; node: ScopeNode }> = [];
      for (const raw of blockContentLines) {
        const normalized = raw.replace(/\t/g, "    ");
        let line = normalized;
        if (line.trim() === "" || line.trim().startsWith("#")) {
          continue;
        }
        // determine indentation depth BEFORE stripping bullets (spaces-only depth)
        const leadingSpacesMatch = line.match(/^(\s*)/);
        const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[1] : "";
        const depth = leadingSpaces.length > 0 ? leadingSpaces.length : 0;
        // strip optional leading bullet and spaces
        line = line.replace(/^\s*-\s*/, "");
        if (!line.includes("=>")) {
          continue;
        }
        const idx = line.indexOf("=>");
        const left = line.slice(0, idx).trim();
        let right = line.slice(idx + 2).trim();

        let text = left.trim();
        if (
          (text.startsWith('"') && text.endsWith('"')) ||
          (text.startsWith("'") && text.endsWith("'"))
        ) {
          text = text.slice(1, -1);
        }
        text = processExpectedValue(text);
        // Resolve {{scopes.NAME}} templates in the right-hand side to actual scope strings
        right = right.replace(
          /\{\{\s*scopes\.([A-Za-z0-9_]+)\s*\}\}/g,
          (m, key) => {
            const val = (scopeModule as any)[key];
            return typeof val === "string" ? val : m;
          }
        );

        // parse scopes: comma-separated list
        const mustContain: string[] = [];
        const mustNotContain: string[] = [];
        const rawScopes = right
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        for (const scope of rawScopes) {
          if (scope.startsWith("!")) {
            mustNotContain.push(scope.substring(1));
          } else {
            mustContain.push(scope);
          }
        }

        if (mustContain.length > 0 || mustNotContain.length > 0) {
          assertions.push({ text, mustContain, mustNotContain });

          // insert into tree using depth-based stack
          const node: ScopeNode = {
            text,
            mustContain,
            mustNotContain,
            children: [],
          };
          while (
            nodeStack.length > 0 &&
            nodeStack[nodeStack.length - 1].depth >= depth
          ) {
            nodeStack.pop();
          }
          if (nodeStack.length === 0) {
            roots.push(node);
          } else {
            nodeStack[nodeStack.length - 1].node.children.push(node);
          }
          nodeStack.push({ depth, node });
        }
      }

      // If there are no parsed assertions, only throw when the block contains
      // meaningful (non-comment, non-blank) content. This lets fixtures include
      // an empty scope block (or commented notes) which we use to trigger
      // suggestion generation at test time.
      const hasMeaningfulContent = blockContentLines.some((l) => {
        const t = l.trim();
        return t !== "" && !t.startsWith("#");
      });

      if (assertions.length === 0 && hasMeaningfulContent) {
        throw new Error(
          "Scope expectation block must contain lines in the format: text => scope"
        );
      }

      allExpectations.push({ type: "scope", assertions, tree: roots });
    } else if (testType === "folding") {
      // Parse folding ranges: [0-3], [1-2]
      const ranges: { startLine: number; endLine: number }[] = [];
      const content = blockContentLines.join(" ").trim();
      const rangeRegex = /\[(\d+)-(\d+)\]/g;
      let match;
      while ((match = rangeRegex.exec(content)) !== null) {
        ranges.push({
          startLine: parseInt(match[1], 10),
          endLine: parseInt(match[2], 10),
        });
      }
      allExpectations.push({ type: "folding", ranges });
    } else if (testType === "symbols") {
      // Parse symbol tree with indentation:
      // - Level 1 (0:0-3:0)
      //   - Level 2 (1:0-2:0)
      const roots: SymbolNode[] = [];
      const nodeStack: Array<{ depth: number; node: SymbolNode }> = [];

      for (const raw of blockContentLines) {
        const normalized = raw.replace(/\t/g, "    ");
        const line = normalized;
        if (line.trim() === "" || line.trim().startsWith("#")) {
          continue;
        }

        // Determine indentation depth
        const leadingSpacesMatch = line.match(/^(\s*)/);
        const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[1] : "";
        const depth = leadingSpaces.length;

        // Parse: - Name (startLine:startChar-endLine:endChar)
        const match = line.match(/^\s*-\s*(.+?)\s+\((\d+):(\d+)-(\d+):(\d+)\)/);
        if (!match) {
          continue;
        }

        const node: SymbolNode = {
          name: match[1].trim(),
          startLine: parseInt(match[2], 10),
          startChar: parseInt(match[3], 10),
          endLine: parseInt(match[4], 10),
          endChar: parseInt(match[5], 10),
          children: [],
        };

        // Build tree using depth-based stack
        while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].depth >= depth) {
          nodeStack.pop();
        }
        if (nodeStack.length === 0) {
          roots.push(node);
        } else {
          nodeStack[nodeStack.length - 1].node.children.push(node);
        }
        nodeStack.push({ depth, node });
      }

      allExpectations.push({ type: "symbols", symbols: roots });
    }

    currentIndex = blockEndIndex + 1;
    while (currentIndex < lines.length && lines[currentIndex].trim() === "") {
      currentIndex++;
    }
  }

  return { expectations: allExpectations, endIndex: currentIndex - 1 };
}

export function parseFixtureFile(content: string): FixtureTestCase[] {
  const tests: FixtureTestCase[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().toLowerCase().startsWith("#+name:")) {
      continue;
    }

    const testName = line.replace(/^\s*#\+name:/i, "").trim();
    const containerStartLine = i + 1;

    if (
      containerStartLine >= lines.length ||
      !lines[containerStartLine]
        .trim()
        .toLowerCase()
        .startsWith("#+begin_fixture")
    ) {
      continue;
    }

    const contentStartIndex = containerStartLine + 1;
    let contentEndIndex = -1;

    for (let j = contentStartIndex; j < lines.length; j++) {
      if (lines[j].trim().toLowerCase().startsWith("#+end_fixture")) {
        contentEndIndex = j;
        break;
      }
    }

    if (contentEndIndex === -1) {
      continue; // Unmatched BEGIN_FIXTURE
    }

    const fixtureLines = lines.slice(contentStartIndex, contentEndIndex);
    const processedLines = fixtureLines.map((line) => {
      // Strip a leading comma from any line inside the fixture. This allows
      // fixture content to escape lines that might otherwise be
      // misinterpreted by the fixture parser itself (e.g., a line
      // starting with #+NAME:).
      const match = line.match(/^(\s*),(.*)/);
      if (match) {
        return match[1] + match[2]; // return line with leading comma removed
      }
      return line;
    });

    const input = processedLines.join("\n");
    i = contentEndIndex;

    let lookaheadIndex = i + 1;
    while (
      lookaheadIndex < lines.length &&
      lines[lookaheadIndex].trim() === ""
    ) {
      lookaheadIndex++;
    }

    if (
      lookaheadIndex < lines.length &&
      lines[lookaheadIndex].trim().toLowerCase().startsWith("#+expected:")
    ) {
      const { expectations, endIndex } = parseExpectedBlock(
        lines,
        lookaheadIndex
      );
      tests.push({
        name: testName,
        input,
        expectations,
      });
      i = endIndex;
    }
  }

  return tests;
}
