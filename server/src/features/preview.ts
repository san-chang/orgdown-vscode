import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Parser } from 'web-tree-sitter';
import { convertOrgToMarkdown } from '../../../common/src/preview/org-to-markdown';
import type {
  OrgdownPreviewParams,
  OrgdownPreviewResponse,
} from '../../../common/src/preview/protocol';

/**
 * Maximum size of a local image that is inlined into the preview as a
 * `data:` URI. Larger images keep their `file:` URL (which the preview webview
 * may not be able to load) instead of bloating the Markdown payload.
 */
const MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
};

interface CachedImage {
  mtimeMs: number;
  size: number;
  dataUri: string;
}

const imageCache = new Map<string, CachedImage>();

/**
 * Convert an open Org document into Markdown for the preview.
 *
 * The conversion itself lives in `common/src/preview/org-to-markdown.ts`;
 * this layer only supplies the parsed tree and the source document location
 * (used to resolve relative links against the Org file's directory).
 */
export function providePreviewMarkdown(
  params: OrgdownPreviewParams,
  documents: TextDocuments<TextDocument>,
  parser: Parser | undefined
): OrgdownPreviewResponse {
  const document = documents.get(params.textDocument.uri);
  if (!document || !parser) {
    return { markdown: '' };
  }

  try {
    const tree = parser.parse(document.getText());
    if (!tree) {
      return { markdown: '' };
    }
    const baseUri = baseDirectoryUri(params.textDocument.uri);
    const { markdown } = convertOrgToMarkdown(tree, {
      baseUri,
      previewMarker: true,
      resolveImage: inlineLocalImage,
    });
    return { markdown };
  } catch (error) {
    console.error(`[orgdown/preview] Failed to convert ${params.textDocument.uri}:`, error);
    return { markdown: '' };
  }
}

/**
 * Compute the directory part of a document URI (e.g. `file:///a/b/foo.org`
 * -> `file:///a/b/`). Used as the base for resolving relative Org links.
 */
export function baseDirectoryUri(uri: string): string | undefined {
  const slash = uri.lastIndexOf('/');
  if (slash <= 0) {
    return undefined;
  }
  return uri.slice(0, slash + 1);
}

/**
 * Inline a local image as a `data:` URI.
 *
 * The built-in Markdown preview loads `file:` images through its webview, and
 * the webview's `localResourceRoots` are derived from the previewed document
 * URI. Because the preview is a virtual `orgdown-preview:` document, those
 * roots never include the Org file's directory, so `file:` images referenced
 * from an Org document are blocked. Inlining the bytes sidesteps the resource
 * root check entirely (the preview CSP already allows `data:` images).
 *
 * Returns `undefined` for non-`file:` targets, unreadable files and images
 * above {@link MAX_INLINE_IMAGE_BYTES}; callers then keep the original URL.
 */
export function inlineLocalImage(target: string): string | undefined {
  if (!target.startsWith('file:')) {
    return undefined;
  }

  let filePath: string;
  try {
    filePath = fileURLToPath(target);
  } catch {
    return undefined;
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return undefined;
  }
  if (!stat.isFile() || stat.size === 0 || stat.size > MAX_INLINE_IMAGE_BYTES) {
    return undefined;
  }

  const cached = imageCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.dataUri;
  }

  const mime = mimeTypeForPath(filePath);
  if (!mime) {
    return undefined;
  }

  try {
    const encoded = fs.readFileSync(filePath).toString('base64');
    const dataUri = `data:${mime};base64,${encoded}`;
    imageCache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, dataUri });
    return dataUri;
  } catch {
    return undefined;
  }
}

function mimeTypeForPath(filePath: string): string | undefined {
  const dot = filePath.lastIndexOf('.');
  if (dot < 0) {
    return undefined;
  }
  return MIME_BY_EXTENSION[filePath.slice(dot).toLowerCase()];
}
