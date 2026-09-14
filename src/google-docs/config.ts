import { GoogleDocsError } from "./errors.js";

export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export const GOOGLE_SECRET_ENV = Object.freeze({
  clientId: "GOOGLE_OAUTH_CLIENT_ID",
  clientSecret: "GOOGLE_OAUTH_CLIENT_SECRET",
  refreshToken: "GOOGLE_OAUTH_REFRESH_TOKEN",
} as const);

export const GOOGLE_PUBLIC_ENV = Object.freeze({
  folderId: "GOOGLE_DRIVE_FOLDER_ID",
  accountEmail: "GOOGLE_ACCOUNT_EMAIL",
} as const);

export interface GoogleOAuthSecrets {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
}

export interface GoogleDocsConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly folderId?: string;
  readonly accountEmail?: string;
}

export interface GoogleDocsConfigLoad {
  readonly config: GoogleDocsConfig;
  readonly missing: readonly string[];
  readonly source: "env" | "secret_store" | "mixed";
}

export interface SecretStorePayload {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly authorizedEmail?: string;
  readonly obtainedAt: string;
}

export function missingGoogleConfigNames(input: {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}): string[] {
  const missing: string[] = [];
  if (!present(input.clientId)) missing.push(GOOGLE_SECRET_ENV.clientId);
  if (!present(input.clientSecret)) missing.push(GOOGLE_SECRET_ENV.clientSecret);
  if (!present(input.refreshToken)) missing.push(GOOGLE_SECRET_ENV.refreshToken);
  return missing;
}

export function requireGoogleConfig(load: GoogleDocsConfigLoad): GoogleDocsConfig {
  if (load.missing.length > 0) {
    throw new GoogleDocsError(
      "missing_google_config",
      `Google OAuth is not configured (${load.missing.join(", ")}). See docs/google-docs/OPERATOR_SETUP.md.`,
    );
  }
  return load.config;
}

export function publicationFailureFromConfig(missing: readonly string[]): {
  readonly status: "publication_failed";
  readonly code: "missing_google_config";
  readonly missing: readonly string[];
  readonly message: string;
} {
  return {
    status: "publication_failed",
    code: "missing_google_config",
    missing,
    message:
      "Writing package is preserved. Configure Google OAuth and retry publication without rerunning the writer.",
  };
}

function present(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
