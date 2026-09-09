import { describe, it, expect } from 'vitest';
import { parseFixtureFile, RegexExpectation, ScopeExpectation, MarkdownExpectation } from '@common/fixture-parser';

describe('Fixture Parser Unit Tests', () => {
  it('should parse a simple regex test case', () => {
    const content = `
#+NAME: A simple regex test
#+BEGIN_FIXTURE
* A headline
#+END_FIXTURE
#+EXPECTED: :type regex :name headlineLevel1Regex
| Group # | Expected Value |
|---------+----------------|
| 5       | A headline     |
    `;
    const testCases = parseFixtureFile(content);
    expect(testCases).toHaveLength(1);
    const testCase = testCases[0];
    expect(testCase.name).toBe('A simple regex test');
    expect(testCase.input).toBe('* A headline');
    expect(testCase.expectations).toHaveLength(1);

    const expectation = testCase.expectations[0] as RegexExpectation;
    expect(expectation.type).toBe('regex');
    expect(expectation.name).toBe('headlineLevel1Regex');
    expect(expectation.shouldMatch).toBe(true);
    expect(expectation.captures).toEqual([{ index: 5, value: 'A headline' }]);
  });

    it('should parse a new scope test case', () => {
    const content = `
#+NAME: A simple scope test
#+BEGIN_FIXTURE
*bold*
#+END_FIXTURE
#+EXPECTED: :type scope
bold => markup.bold.org
* => punctuation
    `;
    const testCases = parseFixtureFile(content);
    expect(testCases).toHaveLength(1);
    const testCase = testCases[0];
    expect(testCase.name).toBe('A simple scope test');
    expect(testCase.input).toBe('*bold*');
    expect(testCase.expectations).toHaveLength(1);

    const expectation = testCase.expectations[0] as ScopeExpectation;
    expect(expectation.type).toBe('scope');
    expect(expectation.assertions).toEqual([
      { text: 'bold', mustContain: ['markup.bold.org'], mustNotContain: [] },
      { text: '*', mustContain: ['punctuation'], mustNotContain: [] },
    ]);
  });

  it('should parse tree-like scope expectations using => lines', () => {
    const content = `
#+NAME: Tree scope test
#+BEGIN_FIXTURE
* TODO [#A] Sample :tag:
#+END_FIXTURE
#+EXPECTED: :type scope
* => punctuation.definition.heading.org
TODO => keyword.other.todo.org
"[#A]" => constant.other.priority.org
"A" => constant.other.priority.value.org
" :tag:" => entity.name.tag.org
    `;
    const testCases = parseFixtureFile(content);
    expect(testCases).toHaveLength(1);
    const testCase = testCases[0];
    const expectation = testCase.expectations[0] as ScopeExpectation;
    expect(expectation.type).toBe('scope');
    expect(expectation.assertions).toEqual([
      { text: '*', mustContain: ['punctuation.definition.heading.org'], mustNotContain: [] },
      { text: 'TODO', mustContain: ['keyword.other.todo.org'], mustNotContain: [] },
      { text: '[#A]', mustContain: ['constant.other.priority.org'], mustNotContain: [] },
      { text: 'A', mustContain: ['constant.other.priority.value.org'], mustNotContain: [] },
      { text: ' :tag:', mustContain: ['entity.name.tag.org'], mustNotContain: [] },
    ]);
  });

  it('should parse mixed positive and negative scope expectations', () => {
    const content = `
#+NAME: A mixed scope test
#+BEGIN_FIXTURE
some text
#+END_FIXTURE
#+EXPECTED: :type scope
"some text" => scope.one, !scope.two, scope.three, !scope.four
    `;
    const testCases = parseFixtureFile(content);
    expect(testCases).toHaveLength(1);
    const expectation = testCases[0].expectations[0] as ScopeExpectation;
    expect(expectation.type).toBe('scope');
    expect(expectation.assertions).toEqual([
      {
        text: 'some text',
        mustContain: ['scope.one', 'scope.three'],
        mustNotContain: ['scope.two', 'scope.four'],
      },
    ]);
  });

  it('should handle a test case with no-match', () => {
    const content = `
#+NAME: A no-match test
#+BEGIN_FIXTURE
not a headline
#+END_FIXTURE
#+EXPECTED: :type regex :name headlineLevel1Regex
no-match
    `;
    const testCases = parseFixtureFile(content);
    expect(testCases).toHaveLength(1);
    const expectation = testCases[0].expectations[0] as RegexExpectation;
    expect(expectation.shouldMatch).toBe(false);
    expect(expectation.captures).toBeUndefined();
  });

  it('should handle one input with multiple expectations (regex and scope)', () => {
    const content = `
#+NAME: One input, two expectations
#+BEGIN_FIXTURE
* A headline
#+END_FIXTURE
#+EXPECTED: :type regex :name headlineLevel1Regex
| 5 | A headline |
#+EXPECTED: :type scope
* => punctuation.definition.heading.org
    `;
    const testCases = parseFixtureFile(content);
    expect(testCases).toHaveLength(1);
    const testCase = testCases[0];
    expect(testCase.name).toBe('One input, two expectations');
    expect(testCase.expectations).toHaveLength(2);

    const regexExpect = testCase.expectations[0] as RegexExpectation;
    expect(regexExpect.type).toBe('regex');
    expect(regexExpect.name).toBe('headlineLevel1Regex');

  const scopeExpect = testCase.expectations[1] as ScopeExpectation;
  expect(scopeExpect.type).toBe('scope');
  expect(scopeExpect.assertions[0].mustContain).toEqual(['punctuation.definition.heading.org']);
  expect(scopeExpect.assertions[0].mustNotContain).toEqual([]);
  });

  it('should parse a markdown expectation verbatim', () => {
    const content = `
#+NAME: Markdown expectation test
#+BEGIN_FIXTURE
* A headline
#+END_FIXTURE
#+EXPECTED: :type markdown
# A headline

Some paragraph.
    `;
    const testCases = parseFixtureFile(content);
    expect(testCases).toHaveLength(1);
    const testCase = testCases[0];
    expect(testCase.expectations).toHaveLength(1);

    const expectation = testCase.expectations[0] as MarkdownExpectation;
    expect(expectation.type).toBe('markdown');
    expect(expectation.expected).toBe('# A headline\n\nSome paragraph.');
  });

  it('should apply placeholder expansion inside markdown expectations', () => {
    const content = `
#+NAME: Placeholder expansion
#+BEGIN_FIXTURE
input
#+END_FIXTURE
#+EXPECTED: :type markdown
<pipe> a <pipe> b <pipe>
<sp:2>x<tab>y
    `;
    const testCases = parseFixtureFile(content);
    const expectation = testCases[0].expectations[0] as MarkdownExpectation;
    expect(expectation.expected).toBe('| a | b |\n  x\ty');
  });

  it('should correctly parse content that looks like a delimiter', () => {
    const content = `
#+NAME: A nested test
#+BEGIN_FIXTURE
#+BEGIN_SRC python
print("hello")
#+END_SRC
#+END_FIXTURE
#+EXPECTED: :type regex :name someRegex
| 1 | some value |
    `;
    const testCases = parseFixtureFile(content);
    expect(testCases).toHaveLength(1);
    expect(testCases[0].input).toBe('#+BEGIN_SRC python\nprint("hello")\n#+END_SRC');
  });

  it('should handle blank lines between expected and end of fixture', () => {
    const content = `
#+NAME: Blank lines test
#+BEGIN_FIXTURE
Input text
#+END_FIXTURE


#+EXPECTED: :type regex :name someRegex
no-match
    `;
    const testCases = parseFixtureFile(content);
    expect(testCases).toHaveLength(1);
    expect(testCases[0].name).toBe('Blank lines test');
  });

  it('should return an empty array if no tests are found', () => {
    const content = `
* A regular org file

With no test cases.
    `;
    const testCases = parseFixtureFile(content);
    expect(testCases).toHaveLength(0);
  });
});
