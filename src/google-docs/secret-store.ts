import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { GoogleDocsError } from "./errors.js";
import type { SecretStorePayload } from "./config.js";
import { isRecord } from "../writing-package/types.js";

export const SECRET_STORE_RELATIVE = join(".config", "ff-content-factory", "google-oauth.json");

export function defaultSecretStorePath(home = homedir()): string {
  return join(home, SECRET_STORE_RELATIVE);
}

export function writeSecretStore(payload: SecretStorePayload, path = defaultSecretStorePath()): string {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

export function readSecretStore(path = defaultSecretStorePath()): SecretStorePayload | undefined {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return undefined;
    throw new GoogleDocsError("secret_store_error", "Unable to read the local Google OAuth secret store.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GoogleDocsError("secret_store_error", "Local Google OAuth secret store is not valid JSON.");
  }
  if (!isRecord(parsed)) {
    throw new GoogleDocsError("secret_store_error", "Local Google OAuth secret store is invalid.");
  }
  if (
    typeof parsed.clientId !== "string" ||
    typeof parsed.clientSecret !== "string" ||
    typeof parsed.refreshToken !== "string" ||
    typeof parsed.obtainedAt !== "string"
  ) {
    throw new GoogleDocsError("secret_store_error", "Local Google OAuth secret store is missing required fields.");
  }
  const payload: SecretStorePayload = {
    clientId: parsed.clientId,
    clientSecret: parsed.clientSecret,
    refreshToken: parsed.refreshToken,
    obtainedAt: parsed.obtainedAt,
  };
  if (typeof parsed.authorizedEmail === "string") {
    return { ...payload, authorizedEmail: parsed.authorizedEmail };
  }
  return payload;
}

export function loadConfigFromEnvAndStore(
  env: NodeJS.ProcessEnv = process.env,
  storePath = defaultSecretStorePath(),
): {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  folderId?: string;
  accountEmail?: string;
  source: "env" | "secret_store" | "mixed";
} {
  const stored = readSecretStore(storePath);
  const clientId = first(env.GOOGLE_OAUTH_CLIENT_ID, stored?.clientId);
  const clientSecret = first(env.GOOGLE_OAUTH_CLIENT_SECRET, stored?.clientSecret);
  const refreshToken = first(env.GOOGLE_OAUTH_REFRESH_TOKEN, stored?.refreshToken);
  const folderId = first(env.GOOGLE_DRIVE_FOLDER_ID);
  const accountEmail = first(env.GOOGLE_ACCOUNT_EMAIL, stored?.authorizedEmail);
  const usedEnv = Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID || env.GOOGLE_OAUTH_CLIENT_SECRET || env.GOOGLE_OAUTH_REFRESH_TOKEN,
  );
  const usedStore = Boolean(stored);
  const source = usedEnv && usedStore ? "mixed" : usedStore && !usedEnv ? "secret_store" : "env";
  const result: {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    folderId?: string;
    accountEmail?: string;
    source: "env" | "secret_store" | "mixed";
  } = { source };
  if (clientId) result.clientId = clientId;
  if (clientSecret) result.clientSecret = clientSecret;
  if (refreshToken) result.refreshToken = refreshToken;
  if (folderId) result.folderId = folderId;
  if (accountEmail) result.accountEmail = accountEmail;
  return result;
}

function first(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
}
