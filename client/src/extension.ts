// The module 'vscode' contains the VS Code extensibility API.
// The preview feature is registered through PreviewController so this file
// only owns the language client lifecycle.
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import * as path from 'path';
import { PreviewController } from './preview/preview-controller';

let client: LanguageClient;

// This method is called when your extension is activated.
export function activate(context: vscode.ExtensionContext) {
  const serverModule = context.asAbsolutePath(
    path.join('server', 'dist', 'server.js'),
  );
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'org' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc'),
    },
  };

  client = new LanguageClient(
    'orgdown',
    'Orgdown Language Server',
    serverOptions,
    clientOptions,
  );

  const clientReady = client.start();
  clientReady.catch((error) => {
    console.error('[orgdown] Language server failed to start:', error);
  });

  context.subscriptions.push(new PreviewController(client, clientReady));
}

// This method is called when your extension is deactivated.
export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
