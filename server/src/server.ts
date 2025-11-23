import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  DocumentSymbolParams,
  FoldingRangeParams,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Parser, Language } from 'web-tree-sitter';
import * as path from 'path';
import { provideFoldingRanges } from './features/folding';
import { provideDocumentSymbols } from './features/symbols';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let parser: Parser | undefined;

connection.onInitialize(async (_params: InitializeParams) => {
  // Initialize Tree-sitter
  try {
    connection.console.log('Initializing Tree-sitter...');

    // Simple Node.js approach as per web-tree-sitter documentation
    await Parser.init();
    connection.console.log('Parser.init() completed');

    parser = new Parser();
    connection.console.log('Parser instance created');

    const orgWasmPath = path.join(__dirname, 'tree-sitter-org.wasm');
    connection.console.log(`Loading Org language from: ${orgWasmPath}`);

    const lang = await Language.load(orgWasmPath);
    connection.console.log('Language loaded');

    parser.setLanguage(lang as any);
    connection.console.log('Tree-sitter initialized successfully.');
  } catch (e) {
    connection.console.error(`Failed to initialize Tree-sitter: ${e}`);
  }

  // Capture workspace folders if provided
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      documentSymbolProvider: true,
      foldingRangeProvider: true,
    },
  };
  return result;
});

documents.listen(connection);
connection.listen();

connection.onDocumentSymbol((params: DocumentSymbolParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc || !parser) {
    return [];
  }

  const tree = parser.parse(doc.getText());
  if (!tree) {
    return [];
  }
  return provideDocumentSymbols(tree);
});

connection.onFoldingRanges((params: FoldingRangeParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc || !parser) {
    return [];
  }

  const tree = parser.parse(doc.getText());
  if (!tree) {
    return [];
  }
  return provideFoldingRanges(tree);
});
