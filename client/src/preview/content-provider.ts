import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import {
  ORGDOWN_PREVIEW_REQUEST,
  OrgdownPreviewResponse,
} from '../../../common/src/preview/protocol';

export const ORGDOWN_PREVIEW_SCHEME = 'orgdown-preview';

/**
 * Read-only in-memory file system for the `orgdown-preview` scheme.
 *
 * The built-in Markdown preview resolves the resource of the previewed
 * document through the file system service (for editor input bookkeeping,
 * relative link resolution, etc.) and fails with `ENOPRO` when no provider
 * exists for the scheme. This provider satisfies those lookups while the
 * actual Markdown content continues to flow through the
 * {@link OrgdownPreviewContentProvider} (which keeps live updates working).
 */
export class OrgdownPreviewFileSystemProvider implements vscode.FileSystemProvider {
  readonly onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>().event;

  constructor(
    private readonly resolveContent: (uri: vscode.Uri) => Thenable<string>,
  ) {}

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const content = await this.resolveContent(uri);
    return new TextEncoder().encode(content);
  }

  stat(): vscode.FileStat {
    return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: 0 };
  }

  readDirectory(): [string, vscode.FileType][] {
    return [];
  }

  createDirectory(): void {
    throw vscode.FileSystemError.NoPermissions('orgdown-preview is read-only');
  }

  writeFile(): void {
    throw vscode.FileSystemError.NoPermissions('orgdown-preview is read-only');
  }

  delete(): void {
    throw vscode.FileSystemError.NoPermissions('orgdown-preview is read-only');
  }

  rename(): void {
    throw vscode.FileSystemError.NoPermissions('orgdown-preview is read-only');
  }

  watch(): vscode.Disposable {
    return { dispose: () => undefined };
  }
}

/**
 * Virtual document provider that exposes converted Org content as Markdown.
 *
 * Every Org file that is being previewed gets a virtual document URI of the
 * form `orgdown-preview:<path>.md`. The Markdown text is produced by the
 * language server (Layer 3) via the custom `orgdown/preview` request and
 * cached here. On Org document changes the provider re-converts and fires
 * `onDidChange`, which makes the built-in Markdown preview refresh.
 */
export class OrgdownPreviewContentProvider implements vscode.TextDocumentContentProvider {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this.onDidChangeEmitter.event;

  private readonly orgToPreview = new Map<string, vscode.Uri>();
  private readonly previewToOrg = new Map<string, string>();
  private readonly cache = new Map<string, string>();

  constructor(private readonly client: LanguageClient) {}

  /** Get (and remember) the virtual preview URI for an Org document. */
  previewUriForOrg(orgUri: vscode.Uri): vscode.Uri {
    const orgKey = orgUri.toString();
    const existing = this.orgToPreview.get(orgKey);
    if (existing) {
      return existing;
    }
    const previewUri = vscode.Uri.from({
      scheme: ORGDOWN_PREVIEW_SCHEME,
      path: `${orgUri.path}.md`,
    });
    this.orgToPreview.set(orgKey, previewUri);
    this.previewToOrg.set(previewUri.toString(), orgKey);
    return previewUri;
  }

  hasPreview(orgUri: vscode.Uri): boolean {
    return this.orgToPreview.has(orgUri.toString());
  }

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const orgKey = this.previewToOrg.get(uri.toString());
    if (!orgKey) {
      return '';
    }
    const cached = this.cache.get(uri.toString());
    if (cached !== undefined) {
      return cached;
    }
    return this.fetchMarkdown(orgKey, uri);
  }

  /** Re-convert an Org document and notify the preview to re-render. */
  async update(orgUri: vscode.Uri): Promise<void> {
    const previewUri = this.orgToPreview.get(orgUri.toString());
    if (!previewUri) {
      return;
    }
    const markdown = await this.fetchMarkdown(orgUri.toString(), previewUri);
    if (markdown !== undefined) {
      this.onDidChangeEmitter.fire(previewUri);
    }
  }

  /** Forget a closed preview document and its Org -> preview mapping. */
  disposePreview(previewUri: vscode.Uri): string | undefined {
    const previewKey = previewUri.toString();
    const orgKey = this.previewToOrg.get(previewKey);
    if (orgKey !== undefined) {
      this.previewToOrg.delete(previewKey);
      this.cache.delete(previewKey);
      this.orgToPreview.delete(orgKey);
    }
    return orgKey;
  }

  private async fetchMarkdown(orgKey: string, previewUri: vscode.Uri): Promise<string> {
    try {
      const response = await this.client.sendRequest<OrgdownPreviewResponse>(
        ORGDOWN_PREVIEW_REQUEST,
        { textDocument: { uri: orgKey } }
      );
      const markdown = response.markdown ?? '';
      this.cache.set(previewUri.toString(), markdown);
      return markdown;
    } catch (error) {
      console.error(`[orgdown-preview] Failed to convert ${orgKey}:`, error);
      return this.cache.get(previewUri.toString()) ?? '';
    }
  }

  dispose(): void {
    this.onDidChangeEmitter.dispose();
    this.orgToPreview.clear();
    this.previewToOrg.clear();
    this.cache.clear();
  }
}
