export type GoogleDocsErrorCode =
  | "invalid_writing_package"
  | "missing_google_config"
  | "reauthorization_required"
  | "google_api_error"
  | "folder_inaccessible"
  | "human_edits_protected"
  | "unresolved_suggestions"
  | "multiple_content_tabs"
  | "import_identity_mismatch"
  | "permission_mismatch"
  | "authorization_failed"
  | "secret_store_error";

export class GoogleDocsError extends Error {
  readonly code: GoogleDocsErrorCode;
  readonly status?: number;

  constructor(code: GoogleDocsErrorCode, message: string, status?: number) {
    super(message);
    this.name = "GoogleDocsError";
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

export function isGoogleDocsError(value: unknown): value is GoogleDocsError {
  return value instanceof GoogleDocsError;
}
