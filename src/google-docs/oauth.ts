import { randomBytes, createHash } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { DRIVE_FILE_SCOPE } from "./config.js";
import { GoogleDocsError } from "./errors.js";
import { redactSecrets } from "./redaction.js";

export const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export interface PkcePair {
  readonly verifier: string;
  readonly challenge: string;
  readonly method: "S256";
}

export function createPkcePair(): PkcePair {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, method: "S256" };
}

export function createOAuth2Client(clientId: string, clientSecret: string, redirectUri?: string): OAuth2Client {
  if (redirectUri) {
    return new OAuth2Client({ clientId, clientSecret, redirectUri });
  }
  return new OAuth2Client({ clientId, clientSecret });
}

export function buildDesktopAuthorizationUrl(input: {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly state: string;
  readonly challenge: string;
  readonly loginHint?: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: DRIVE_FILE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    code_challenge: input.challenge,
    code_challenge_method: "S256",
    state: input.state,
  });
  if (input.loginHint) params.set("login_hint", input.loginHint);
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export interface TokenSet {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn?: number;
  readonly refreshTokenExpiresIn?: number;
  readonly scope?: string;
  readonly tokenType?: string;
}

export async function exchangeAuthorizationCode(input: {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly code: string;
  readonly codeVerifier: string;
}): Promise<TokenSet> {
  const client = createOAuth2Client(input.clientId, input.clientSecret, input.redirectUri);
  try {
    const result = await client.getToken({
      code: input.code,
      codeVerifier: input.codeVerifier,
      redirect_uri: input.redirectUri,
    });
    const tokens = result.tokens;
    if (!tokens.refresh_token) {
      throw new GoogleDocsError(
        "authorization_failed",
        "Google did not return a refresh token. Revoke the app at https://myaccount.google.com/permissions and rerun authorization with consent.",
      );
    }
    if (!tokens.access_token) {
      throw new GoogleDocsError("authorization_failed", "Google did not return an access token.");
    }
    const set: TokenSet = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
    if (typeof tokens.expiry_date === "number") {
      const expiresIn = Math.max(0, Math.round((tokens.expiry_date - Date.now()) / 1000));
      return finishTokenSet(set, expiresIn, tokens.scope ?? undefined, tokens.token_type ?? undefined);
    }
    return finishTokenSet(set, undefined, tokens.scope ?? undefined, tokens.token_type ?? undefined);
  } catch (error) {
    if (error instanceof GoogleDocsError) throw error;
    throw new GoogleDocsError("authorization_failed", redactSecrets(error instanceof Error ? error.message : error));
  }
}

export async function refreshAccessToken(input: {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
}): Promise<{ accessToken: string }> {
  const client = createOAuth2Client(input.clientId, input.clientSecret);
  client.setCredentials({ refresh_token: input.refreshToken });
  try {
    const response = await client.getAccessToken();
    if (!response.token) {
      throw new GoogleDocsError("reauthorization_required", "Google did not return an access token from the refresh token.");
    }
    return { accessToken: response.token };
  } catch (error) {
    const message = redactSecrets(error instanceof Error ? error.message : error);
    if (/invalid_grant/i.test(message) || /token has been expired or revoked/i.test(message)) {
      throw new GoogleDocsError(
        "reauthorization_required",
        "Google refresh token is invalid, revoked, or expired. Rerun npm run google-docs:authorize and update GOOGLE_OAUTH_REFRESH_TOKEN. See docs/google-docs/OPERATOR_SETUP.md.",
      );
    }
    throw new GoogleDocsError("google_api_error", message);
  }
}

function finishTokenSet(
  set: TokenSet,
  expiresIn: number | undefined,
  scope: string | undefined,
  tokenType: string | undefined,
): TokenSet {
  const next: TokenSet = { ...set };
  if (expiresIn !== undefined) {
    return Object.assign(next, {
      expiresIn,
      ...(scope ? { scope } : {}),
      ...(tokenType ? { tokenType } : {}),
    });
  }
  if (scope && tokenType) return { ...next, scope, tokenType };
  if (scope) return { ...next, scope };
  if (tokenType) return { ...next, tokenType };
  return next;
}
