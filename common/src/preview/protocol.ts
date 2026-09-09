/**
 * Shared protocol between the Orgdown client and language server for the
 * preview feature (custom LSP request).
 */

/** Custom LSP request name: Org document URI -> converted Markdown. */
export const ORGDOWN_PREVIEW_REQUEST = "orgdown/preview";

export interface OrgdownPreviewParams {
  textDocument: { uri: string };
}

export interface OrgdownPreviewResponse {
  markdown: string;
}
