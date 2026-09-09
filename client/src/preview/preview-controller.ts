import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import {
  ORGDOWN_PREVIEW_SCHEME,
  OrgdownPreviewContentProvider,
  OrgdownPreviewFileSystemProvider,
} from './content-provider';

const PREVIEW_REFRESH_DELAY_MS = 300;

/**
 * Owns the Orgdown preview UI wiring: virtual document providers, commands,
 * debounced re-conversion and preview lifecycle cleanup.
 */
export class PreviewController implements vscode.Disposable {
  private readonly previewProvider: OrgdownPreviewContentProvider;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly refreshTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly client: LanguageClient,
    private readonly clientReady: Promise<void>,
  ) {
    this.previewProvider = new OrgdownPreviewContentProvider(client);
    this.registerContentProviders();
    this.registerCommandsAndLifecycle();
  }

  dispose(): void {
    for (const timer of this.refreshTimers.values()) {
      clearTimeout(timer);
    }
    this.refreshTimers.clear();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }

  private registerContentProviders(): void {
    const previewFileSystem = new OrgdownPreviewFileSystemProvider((uri) =>
      this.previewProvider.provideTextDocumentContent(uri),
    );
    this.disposables.push(
      vscode.workspace.registerTextDocumentContentProvider(
        ORGDOWN_PREVIEW_SCHEME,
        this.previewProvider,
      ),
      vscode.workspace.registerFileSystemProvider(
        ORGDOWN_PREVIEW_SCHEME,
        previewFileSystem,
        { isCaseSensitive: true },
      ),
      this.previewProvider,
    );
  }

  private registerCommandsAndLifecycle(): void {
    this.disposables.push(
      vscode.commands.registerCommand('orgdown.showPreviewToSide', (uri?: vscode.Uri) =>
        this.openPreview(uri, true),
      ),
      vscode.commands.registerCommand('orgdown.showPreview', (uri?: vscode.Uri) =>
        this.openPreview(uri, false),
      ),
      vscode.workspace.onDidOpenTextDocument((document) => {
        if (
          document.languageId === 'org' &&
          this.previewProvider.hasPreview(document.uri)
        ) {
          void this.previewProvider.update(document.uri);
        }
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        const document = event.document;
        if (
          document.languageId !== 'org' ||
          !this.previewProvider.hasPreview(document.uri)
        ) {
          return;
        }
        const key = document.uri.toString();
        this.clearRefreshTimer(key);
        this.refreshTimers.set(
          key,
          setTimeout(() => {
            this.refreshTimers.delete(key);
            void this.previewProvider.update(document.uri);
          }, PREVIEW_REFRESH_DELAY_MS),
        );
      }),
      vscode.workspace.onDidCloseTextDocument((document) => {
        if (document.uri.scheme === ORGDOWN_PREVIEW_SCHEME) {
          const orgKey = this.previewProvider.disposePreview(document.uri);
          if (orgKey !== undefined) {
            this.clearRefreshTimer(orgKey);
          }
          return;
        }
        if (document.languageId === 'org') {
          this.clearRefreshTimer(document.uri.toString());
        }
      }),
    );
  }

  private async openPreview(uri?: vscode.Uri, toSide?: boolean): Promise<void> {
    let document: vscode.TextDocument | undefined;
    if (uri) {
      // Explorer/context-menu commands pass the selected resource as the first
      // argument. Opening it (without focusing it) also makes the language
      // server aware of the file, so the preview works for non-active Org files.
      try {
        document = await vscode.workspace.openTextDocument(uri);
      } catch (error) {
        console.error(`[orgdown-preview] Failed to open ${uri.toString()}:`, error);
      }
    } else {
      document = vscode.window.activeTextEditor?.document;
    }

    if (!document || document.languageId !== 'org') {
      vscode.window.showWarningMessage(
        'Orgdown preview requires an Org file.',
      );
      return;
    }

    // The parser is initialized inside the server's initialize handler, so
    // wait for the language client before converting to avoid an empty first
    // preview.
    try {
      await this.clientReady;
    } catch (error) {
      console.error('[orgdown-preview] Language server failed to start:', error);
      vscode.window.showWarningMessage(
        'Orgdown preview could not start the language server.',
      );
      return;
    }

    const previewUri = this.previewProvider.previewUriForOrg(document.uri);
    // Make sure the latest content is available before the preview opens.
    await this.previewProvider.update(document.uri);
    if (toSide) {
      await vscode.commands.executeCommand(
        'markdown.showPreviewToSide',
        previewUri,
        vscode.ViewColumn.Two,
      );
    } else {
      await vscode.commands.executeCommand('markdown.showPreview', previewUri);
    }
  }

  private clearRefreshTimer(key: string): void {
    const existing = this.refreshTimers.get(key);
    if (existing) {
      clearTimeout(existing);
      this.refreshTimers.delete(key);
    }
  }
}
