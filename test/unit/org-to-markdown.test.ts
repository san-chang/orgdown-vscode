import { describe, it, expect, beforeAll } from 'vitest';
import { Parser, Language } from 'web-tree-sitter';
import * as path from 'path';
import { convertOrgToMarkdown } from '../../common/src/preview/org-to-markdown';

describe('Org to Markdown converter', () => {
  let parser: Parser;

  beforeAll(async () => {
    await Parser.init();
    parser = new Parser();
    const wasmPath = path.join(__dirname, '../../server/dist/tree-sitter-org.wasm');
    const lang = await Language.load(wasmPath);
    parser.setLanguage(lang as any);
  });

  function convert(input: string, options?: Parameters<typeof convertOrgToMarkdown>[1]) {
    const tree = parser.parse(input);
    if (!tree) {
      throw new Error('Failed to parse');
    }
    return convertOrgToMarkdown(tree, options);
  }

  it('resolves relative links against the base directory URI', () => {
    const { markdown } = convert(
      'See [[./img.png][image]] and [[../doc.org][doc]].',
      { baseUri: 'file:///home/user/project/' }
    );
    expect(markdown).toContain('[image](file:///home/user/project/img.png)');
    expect(markdown).toContain('[doc](file:///home/user/doc.org)');
  });

  it('renders image links with Markdown image syntax and absolute file URIs', () => {
    const { markdown } = convert(
      'See [[./img.png][A photo]] and [[./logo.svg]].',
      { baseUri: 'file:///home/user/project/' }
    );
    expect(markdown).toContain('![A photo](file:///home/user/project/img.png)');
    expect(markdown).toContain('![](file:///home/user/project/logo.svg)');
  });

  it('renders file-prefixed image links as images', () => {
    const { markdown } = convert(
      'See [[file:img.png][img]] and [[file:../photo.JPG][photo]].',
      { baseUri: 'file:///home/user/project/' }
    );
    expect(markdown).toContain('![img](file:///home/user/project/img.png)');
    expect(markdown).toContain('![photo](file:///home/user/photo.JPG)');
  });

  it('lets a resolveImage hook replace image targets', () => {
    const { markdown } = convert('See [[./img.png][photo]].', {
      baseUri: 'file:///home/user/project/',
      resolveImage: (target) => `data:image/png;base64,AAAA#${target}`,
    });
    expect(markdown).toContain(
      '![photo](data:image/png;base64,AAAA#file:///home/user/project/img.png)'
    );
  });

  it('does not call resolveImage for non-image links', () => {
    let calls = 0;
    convert('Read [[./report.pdf][report]].', {
      baseUri: 'file:///home/user/project/',
      resolveImage: () => {
        calls += 1;
        return 'data:application/pdf;base64,AAAA';
      },
    });
    expect(calls).toBe(0);
  });

  it('keeps non-image file links as regular links', () => {
    const { markdown } = convert(
      'Read [[./report.pdf][report]] and [[./data.csv][data]].',
      { baseUri: 'file:///home/user/project/' }
    );
    expect(markdown).toContain('[report](file:///home/user/project/report.pdf)');
    expect(markdown).toContain('[data](file:///home/user/project/data.csv)');
  });

  it('keeps protocol links and anchors unchanged', () => {
    const { markdown } = convert(
      'See [[https://example.com][web]] and [[#heading][anchor]].',
      { baseUri: 'file:///home/user/project/' }
    );
    expect(markdown).toContain('[web](https://example.com)');
    expect(markdown).toContain('[anchor](#heading)');
  });

  it('emits the preview marker when requested', () => {
    const { markdown } = convert('* Headline', { previewMarker: true });
    expect(markdown.split('\n')[0]).toBe('<div id="orgdown-preview-marker"></div>');
  });

  it('tracks org line to markdown line mappings', () => {
    const { lineMap } = convert(
      [
        '* Headline',
        'first paragraph line',
        '',
        'another paragraph',
      ].join('\n')
    );
    expect(lineMap[0]).toBe(0);
    expect(lineMap[1]).toBe(1);
    expect(lineMap[3]).toBe(3);
  });

  it('renders repeated emphasis and timestamps on one line', () => {
    const { markdown } = convert(
      '*one* and *two* with <2024-01-01 Mon> and <2024-01-02 Tue>.'
    );
    expect(markdown).toContain(
      '<strong>one</strong> and <strong>two</strong> with ' +
        '<span class="org-timestamp"><2024-01-01 Mon></span> and ' +
        '<span class="org-timestamp"><2024-01-02 Tue></span>.'
    );
  });

  it('returns an empty document for an empty input', () => {
    const { markdown } = convert('');
    expect(markdown).toBe('');
  });
});
