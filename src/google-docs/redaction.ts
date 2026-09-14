const SECRET_ENV_NAMES = [
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REFRESH_TOKEN",
  "GOOGLE_OAUTH_CLIENT_ID",
] as const;

const SECRET_JSON_KEYS = [
  "client_secret",
  "clientSecret",
  "refresh_token",
  "refreshToken",
  "access_token",
  "accessToken",
  "id_token",
  "idToken",
  "code_verifier",
  "codeVerifier",
] as const;

const BEARER_RE = /Bearer\s+[A-Za-z0-9._\-+/=]+/gi;
const TOKENISH_RE = /(?:ya29\.|1\/\/)[A-Za-z0-9._\-~]+/g;

function replaceSecretJsonKeys(input: string): string {
  let next = input;
  for (const key of SECRET_JSON_KEYS) {
    const pattern = new RegExp(`("${key}"\\s*:\\s*")([^"]*)(")`, "gi");
    next = next.replace(pattern, `$1[redacted]$3`);
    const bare = new RegExp(`(${key}\\s*=\\s*)[^\\s&]+`, "gi");
    next = next.replace(bare, `$1[redacted]`);
  }
  return next;
}

export function redactSecrets(value: unknown): string {
  let text = typeof value === "string" ? value : stringifyUnknown(value);
  for (const name of SECRET_ENV_NAMES) {
    const envValue = process.env[name];
    if (envValue && envValue.length > 0) {
      text = text.split(envValue).join("[redacted]");
    }
  }
  text = replaceSecretJsonKeys(text);
  text = text.replace(BEARER_RE, "Bearer [redacted]");
  text = text.replace(TOKENISH_RE, "[redacted]");
  return text;
}

export function redactError(error: unknown): Error {
  if (error instanceof Error) {
    const copy = new Error(redactSecrets(error.message));
    copy.name = error.name;
    return copy;
  }
  return new Error(redactSecrets(error));
}

function stringifyUnknown(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
