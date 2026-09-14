import { GoogleDocsError } from "./errors.js";
import { redactSecrets } from "./redaction.js";

export const DRIVE_API = "https://www.googleapis.com/drive/v3";
export const DOCS_API = "https://docs.googleapis.com/v1";

export interface GoogleRequest {
  readonly method: "GET" | "POST" | "PATCH" | "DELETE";
  readonly url: string;
  readonly query?: Readonly<Record<string, string | boolean | number | undefined>>;
  readonly body?: unknown;
}

export interface GoogleTransport {
  request<T>(request: GoogleRequest): Promise<T>;
}

export interface DriveUser {
  readonly emailAddress?: string;
  readonly displayName?: string;
}

export interface DriveFile {
  readonly id: string;
  readonly name: string;
  readonly mimeType?: string;
  readonly parents?: readonly string[];
  readonly webViewLink?: string;
  readonly description?: string;
}

export interface DrivePermission {
  readonly id?: string;
  readonly type: string;
  readonly role: string;
  readonly allowFileDiscovery?: boolean;
}

export interface DocsRange {
  readonly startIndex: number;
  readonly endIndex: number;
}

export interface DocsTextStyle {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly weightedFontFamily?: { readonly fontFamily: string; readonly weight: number };
  readonly link?: { readonly url: string };
}

export interface DocsParagraphStyle {
  readonly namedStyleType?: string;
}

export interface DocsTextRun {
  readonly content?: string;
  readonly textStyle?: DocsTextStyle;
  readonly suggestedInsertionIds?: readonly string[];
  readonly suggestedDeletionIds?: readonly string[];
}

export interface DocsParagraphElement {
  readonly startIndex?: number;
  readonly endIndex?: number;
  readonly textRun?: DocsTextRun;
}

export interface DocsBullet {
  readonly listId?: string;
  readonly nestingLevel?: number;
}

export interface DocsParagraph {
  readonly elements?: readonly DocsParagraphElement[];
  readonly paragraphStyle?: DocsParagraphStyle;
  readonly bullet?: DocsBullet;
}

export interface DocsStructuralElement {
  readonly startIndex?: number;
  readonly endIndex?: number;
  readonly paragraph?: DocsParagraph;
  readonly sectionBreak?: Record<string, unknown>;
}

export interface DocsBody {
  readonly content?: readonly DocsStructuralElement[];
}

export interface DocsNamedRange {
  readonly namedRangeId?: string;
  readonly name?: string;
  readonly ranges?: readonly DocsRange[];
}

export interface DocsNamedRanges {
  readonly name?: string;
  readonly namedRanges?: readonly DocsNamedRange[];
}

export interface DocsTab {
  readonly tabProperties?: { readonly tabId?: string; readonly title?: string };
  readonly documentTab?: { readonly body?: DocsBody };
  readonly childTabs?: readonly DocsTab[];
}

export interface DocsList {
  readonly listProperties?: {
    readonly nestingLevels?: readonly { readonly glyphType?: string }[];
  };
}

export interface DocsDocument {
  readonly documentId?: string;
  readonly title?: string;
  readonly revisionId?: string;
  readonly body?: DocsBody;
  readonly tabs?: readonly DocsTab[];
  readonly namedRanges?: Record<string, DocsNamedRanges>;
  readonly lists?: Record<string, DocsList>;
  readonly suggestionsViewMode?: string;
}

export interface DocsRequest {
  insertText?: { readonly location: { readonly index: number }; readonly text: string };
  deleteContentRange?: { readonly range: DocsRange };
  updateParagraphStyle?: {
    readonly range: DocsRange;
    readonly paragraphStyle: DocsParagraphStyle;
    readonly fields: string;
  };
  updateTextStyle?: {
    readonly range: DocsRange;
    readonly textStyle: DocsTextStyle;
    readonly fields: string;
  };
  createParagraphBullets?: {
    readonly range: DocsRange;
    readonly bulletPreset: string;
  };
  createNamedRange?: {
    readonly name: string;
    readonly range: DocsRange;
  };
  deleteNamedRange?: {
    readonly name: string;
  };
}

export interface BatchUpdateRequest {
  readonly requests: readonly DocsRequest[];
  readonly writeControl?: { readonly requiredRevisionId: string };
}

export interface BatchUpdateResponse {
  readonly documentId?: string;
  readonly writeControl?: { readonly requiredRevisionId?: string };
  readonly replies?: readonly unknown[];
}

export function createAuthorizedTransport(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): GoogleTransport {
  return {
    async request<T>(request: GoogleRequest): Promise<T> {
      const url = withQuery(request.url, request.query);
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      };
      const init: RequestInit = { method: request.method, headers };
      if (request.body !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(request.body);
      }
      let response: Response;
      try {
        response = await fetchImpl(url, init);
      } catch (error) {
        throw new GoogleDocsError("google_api_error", redactSecrets(error instanceof Error ? error.message : error));
      }
      const raw = await response.text();
      let parsed: unknown = undefined;
      if (raw.length > 0) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
      }
      if (!response.ok) {
        throw mapGoogleHttpError(response.status, parsed, raw);
      }
      return parsed as T;
    },
  };
}

export function mapGoogleHttpError(status: number, parsed: unknown, raw: string): GoogleDocsError {
  const text = redactSecrets(typeof parsed === "string" ? parsed : JSON.stringify(parsed ?? raw));
  if (status === 400 && /revision/i.test(text)) {
    return new GoogleDocsError(
      "human_edits_protected",
      "Google Doc revision no longer matches the published snapshot. Human edits were not overwritten.",
      status,
    );
  }
  if (status === 401 || /invalid_grant/i.test(text)) {
    return new GoogleDocsError("reauthorization_required", "Google rejected the stored OAuth credentials. Reauthorize.", status);
  }
  if (status === 404) {
    return new GoogleDocsError(
      "folder_inaccessible",
      "Drive file or folder is not accessible under drive.file. Recreate the review folder with the factory command rather than pasting an unrelated folder ID.",
      status,
    );
  }
  return new GoogleDocsError("google_api_error", `Google API request failed (${status}): ${text}`, status);
}

export function withQuery(
  url: string,
  query?: Readonly<Record<string, string | boolean | number | undefined>>,
): string {
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `${url}?${encoded}` : url;
}

export async function driveAboutUser(transport: GoogleTransport): Promise<DriveUser> {
  const about = await transport.request<{ user?: DriveUser }>({
    method: "GET",
    url: `${DRIVE_API}/about`,
    query: { fields: "user(emailAddress,displayName)" },
  });
  return about.user ?? {};
}

export async function driveCreateFile(
  transport: GoogleTransport,
  body: { name: string; mimeType: string; parents?: readonly string[]; description?: string },
): Promise<DriveFile> {
  return transport.request<DriveFile>({
    method: "POST",
    url: `${DRIVE_API}/files`,
    query: { fields: "id,name,mimeType,parents,webViewLink,description" },
    body,
  });
}

export async function driveGetFile(transport: GoogleTransport, fileId: string): Promise<DriveFile> {
  return transport.request<DriveFile>({
    method: "GET",
    url: `${DRIVE_API}/files/${encodeURIComponent(fileId)}`,
    query: { fields: "id,name,mimeType,parents,webViewLink,description", supportsAllDrives: false },
  });
}

export async function driveUpdateFile(
  transport: GoogleTransport,
  fileId: string,
  body: { name?: string; description?: string },
): Promise<DriveFile> {
  return transport.request<DriveFile>({
    method: "PATCH",
    url: `${DRIVE_API}/files/${encodeURIComponent(fileId)}`,
    query: { fields: "id,name,mimeType,parents,webViewLink,description" },
    body,
  });
}

export async function driveTrashFile(transport: GoogleTransport, fileId: string): Promise<void> {
  await transport.request({
    method: "PATCH",
    url: `${DRIVE_API}/files/${encodeURIComponent(fileId)}`,
    body: { trashed: true },
  });
}

export async function driveCreatePermission(
  transport: GoogleTransport,
  fileId: string,
  permission: { type: "anyone"; role: "writer"; allowFileDiscovery: false },
): Promise<DrivePermission> {
  return transport.request<DrivePermission>({
    method: "POST",
    url: `${DRIVE_API}/files/${encodeURIComponent(fileId)}/permissions`,
    query: { fields: "id,type,role,allowFileDiscovery" },
    body: {
      type: permission.type,
      role: permission.role,
      allowFileDiscovery: permission.allowFileDiscovery,
    },
  });
}

export async function driveListPermissions(
  transport: GoogleTransport,
  fileId: string,
): Promise<readonly DrivePermission[]> {
  const result = await transport.request<{ permissions?: DrivePermission[] }>({
    method: "GET",
    url: `${DRIVE_API}/files/${encodeURIComponent(fileId)}/permissions`,
    query: { fields: "permissions(id,type,role,allowFileDiscovery)" },
  });
  return result.permissions ?? [];
}

export async function docsGet(
  transport: GoogleTransport,
  documentId: string,
): Promise<DocsDocument> {
  return transport.request<DocsDocument>({
    method: "GET",
    url: `${DOCS_API}/documents/${encodeURIComponent(documentId)}`,
    query: {
      includeTabsContent: true,
      suggestionsViewMode: "SUGGESTIONS_INLINE",
    },
  });
}

export async function docsBatchUpdate(
  transport: GoogleTransport,
  documentId: string,
  body: BatchUpdateRequest,
): Promise<BatchUpdateResponse> {
  return transport.request<BatchUpdateResponse>({
    method: "POST",
    url: `${DOCS_API}/documents/${encodeURIComponent(documentId)}:batchUpdate`,
    body,
  });
}
