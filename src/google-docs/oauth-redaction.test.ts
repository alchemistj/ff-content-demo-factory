import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildDesktopAuthorizationUrl, createPkcePair } from "./oauth.js";
import { redactSecrets } from "./redaction.js";
import { writeSecretStore } from "./secret-store.js";
import { authorizationReceiptLog } from "./authorize.js";
import { DRIVE_FILE_SCOPE } from "./config.js";

test("authorization URL is desktop loopback with drive.file, offline access, and PKCE", () => {
  const pkce = createPkcePair();
  const url = new URL(
    buildDesktopAuthorizationUrl({
      clientId: "abc.apps.googleusercontent.com",
      redirectUri: "http://127.0.0.1:43111/",
      state: "csrf-token",
      challenge: pkce.challenge,
      loginHint: "factory-review@gmail.com",
    }),
  );
  assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("scope"), DRIVE_FILE_SCOPE);
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("prompt"), "consent");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("redirect_uri"), "http://127.0.0.1:43111/");
  assert.equal(url.searchParams.get("login_hint"), "factory-review@gmail.com");
});

test("secret store writes 0600 and authorization receipts never include tokens", () => {
  const dir = mkdtempSync(join(tmpdir(), "ff-secrets-"));
  const path = join(dir, "google-oauth.json");
  writeSecretStore(
    {
      clientId: "client",
      clientSecret: "super-secret-value",
      refreshToken: "1//refresh-token-value",
      obtainedAt: "2026-09-14T00:00:00.000Z",
    },
    path,
  );
  assert.equal(statSync(path).mode & 0o777, 0o600);
  const receipt = authorizationReceiptLog({
    secretStorePath: path,
    refreshTokenCaptured: true,
    nextSteps: ["set GitHub secrets"],
  });
  const serialized = JSON.stringify(receipt);
  assert.equal(serialized.includes("1//refresh-token-value"), false);
  assert.equal(serialized.includes("super-secret-value"), false);
  const stored = readFileSync(path, "utf8");
  assert.ok(stored.includes("1//refresh-token-value"));
});

test("redaction strips bearer tokens, refresh tokens, and env secrets", () => {
  process.env.GOOGLE_OAUTH_REFRESH_TOKEN = "env-refresh-secret";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "env-client-secret";
  const redacted = redactSecrets(
    'Authorization: Bearer ya29.a0token {"refresh_token":"1//abc","client_secret":"shh"} env-refresh-secret env-client-secret',
  );
  assert.equal(redacted.includes("env-refresh-secret"), false);
  assert.equal(redacted.includes("ya29.a0token"), false);
  assert.equal(redacted.includes("1//abc"), false);
  assert.equal(redacted.includes("shh"), false);
  assert.match(redacted, /\[redacted\]/);
});
