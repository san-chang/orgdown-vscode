// End-to-end tests for the Orgdown preview feature.
//
// These tests exercise the Phase-0 spike assumption directly: the built-in
// Markdown preview can render a virtual document whose content is provided by
// a TextDocumentContentProvider. They also verify the extension wiring
// (command -> virtual document -> built-in preview tab).
import * as assert from 'assert';
import * as vscode from 'vscode';
import { join } from 'path';
import * as fs from 'fs';

const PREVIEW_SCHEME = 'orgdown-preview';

async function waitFor(
  predicate: () => boolean | PromiseLike<boolean>,
  timeoutMs: number,
  message: string,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.fail(message);
}

function previewTabs(): vscode.Tab[] {
  return vscode.window.tabGroups.all.flatMap((group) =>
    group.tabs.filter((tab) => String(tab.label).startsWith('Preview')),
  );
}

suite('orgdown preview', () => {
  test('renders an Org file through the built-in Markdown preview', async function () {
    this.timeout(60000);

    const orgPath = join(process.cwd(), 'test', 'fixtures', 'F22-preview.org');
    const document = await vscode.workspace.openTextDocument(orgPath);
    await vscode.window.showTextDocument(document);

    // Allow the extension (language client + commands) to activate.
    await waitFor(
      () => vscode.commands.getCommands(true).then((commands) => commands.includes('orgdown.showPreviewToSide')),
      20000,
      'orgdown.showPreviewToSide command was not registered',
    );

    try {
      await vscode.commands.executeCommand('orgdown.showPreviewToSide');
    } catch (error) {
      assert.fail(`orgdown.showPreviewToSide failed: ${String(error)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 4000));

    const virtualDocs = vscode.workspace.textDocuments
      .filter((doc) => doc.uri.scheme === PREVIEW_SCHEME)
      .map((doc) => ({ uri: doc.uri.toString(), languageId: doc.languageId, length: doc.getText().length }));

    // The built-in Markdown preview opens as a webview editor; its tab input
    // is identified by the internal markdown preview viewType.
    await waitFor(
      () =>
        previewTabs().some((tab) => {
          const input = tab.input as { viewType?: string };
          return input.viewType !== undefined && input.viewType.includes('markdown.preview');
        }),
      30000,
      'expected a built-in Markdown preview tab for the virtual orgdown-preview document',
    );

    assert.strictEqual(virtualDocs.length, 1, 'expected one virtual orgdown-preview document');
    assert.strictEqual(virtualDocs[0].languageId, 'markdown');
    assert.ok(virtualDocs[0].uri.endsWith('.md'), 'virtual document should look like Markdown');
    assert.ok(virtualDocs[0].length > 100, 'virtual document should contain converted Markdown');
    const content = vscode.workspace.textDocuments.find(
      (doc) => doc.uri.scheme === PREVIEW_SCHEME,
    )?.getText();
    assert.ok(
      content?.includes('<div id="orgdown-preview-marker"></div>'),
      'converted Markdown should carry the Orgdown preview marker',
    );
  });

  test('renders Org image links as Markdown images with loadable file URIs', async function () {
    this.timeout(60000);

    const orgPath = join(process.cwd(), 'test', 'fixtures', 'F24-preview-image.org');
    const imagePath = join(process.cwd(), 'test', 'fixtures', 'assets', 'orgdown.png');
    assert.ok(fs.existsSync(imagePath), 'expected the referenced image file to exist on disk');

    const document = await vscode.workspace.openTextDocument(orgPath);
    await vscode.window.showTextDocument(document);

    await waitFor(
      () => vscode.commands.getCommands(true).then((commands) => commands.includes('orgdown.showPreviewToSide')),
      20000,
      'orgdown.showPreviewToSide command was not registered',
    );

    try {
      await vscode.commands.executeCommand('orgdown.showPreviewToSide');
    } catch (error) {
      assert.fail(`orgdown.showPreviewToSide failed: ${String(error)}`);
    }

    // The image link lives at the top level of the Org document. The server
    // inlines local images as `data:` URIs because the built-in Markdown
    // preview's webview cannot load `file:` images outside its
    // `localResourceRoots` (the previewed document is a virtual
    // `orgdown-preview:` document). Wait for the virtual document to arrive
    // instead of sampling a fixed delay: the preview tab opens immediately,
    // but the converted content is streamed in asynchronously.
    let content: string | undefined;
    await waitFor(
      () => {
        // Pick the virtual document for this Org file specifically: other
        // previews (e.g. F22's) may also contain the "OrgDown logo" text
        // inside fixture blocks, so matching by content alone is ambiguous.
        const virtualDoc = vscode.workspace.textDocuments.find(
          (doc) =>
            doc.uri.scheme === PREVIEW_SCHEME &&
            doc.uri.path.endsWith('F24-preview-image.org.md'),
        );
        content = virtualDoc?.getText();
        return content !== undefined;
      },
      30000,
      'expected the converted preview content to contain the Org image link',
    );
    assert.ok(
      content?.includes('![OrgDown logo](data:image/png;base64,'),
      'converted Markdown should inline the Org image as a data URI',
    );
  });
});
