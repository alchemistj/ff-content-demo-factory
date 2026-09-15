import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { buildDesktopAuthorizationUrl, createPkcePair, exchangeAuthorizationCode } from "./oauth.js";
import { writeSecretStore } from "./secret-store.js";
import { GoogleDocsError } from "./errors.js";
import { redactSecrets } from "./redaction.js";

export interface AuthorizeOptions {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly loginHint?: string;
  readonly openBrowser?: (url: string) => Promise<void>;
  readonly waitForCode?: (input: {
    readonly redirectUri: string;
    readonly state: string;
  }) => Promise<string>;
  readonly timeoutMs?: number;
}

export interface AuthorizeResult {
  readonly secretStorePath: string;
  readonly authorizedEmail?: string;
  readonly refreshTokenCaptured: true;
  readonly refreshTokenExpiresIn?: number;
  readonly nextSteps: readonly string[];
}

export async function authorizeDesktopUser(options: AuthorizeOptions): Promise<AuthorizeResult> {
  const pkce = createPkcePair();
  const state = randomBytes(16).toString("hex");
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  const { redirectUri, code } = await startLoopbackAndAuthorize({
    clientId: options.clientId,
    state,
    challenge: pkce.challenge,
    timeoutMs,
    ...(options.loginHint ? { loginHint: options.loginHint } : {}),
    ...(options.openBrowser ? { openBrowser: options.openBrowser } : {}),
    ...(options.waitForCode ? { waitForCode: options.waitForCode } : {}),
  });
  const tokens = await exchangeAuthorizationCode({
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    redirectUri,
    code,
    codeVerifier: pkce.verifier,
  });

  const path = writeSecretStore({
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    refreshToken: tokens.refreshToken,
    obtainedAt: new Date().toISOString(),
  });

  const result: AuthorizeResult = {
    secretStorePath: path,
    refreshTokenCaptured: true,
    nextSteps: [
      "Store GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN as GitHub Secrets.",
      "Run npm run google-docs:init-folder, then set GOOGLE_DRIVE_FOLDER_ID as a GitHub variable.",
      "Set GOOGLE_ACCOUNT_EMAIL as a GitHub variable.",
      "Do not paste the refresh token into chat, PR bodies, or logs.",
    ],
  };
  if (tokens.refreshTokenExpiresIn !== undefined) {
    return { ...result, refreshTokenExpiresIn: tokens.refreshTokenExpiresIn };
  }
  return result;
}

async function startLoopbackAndAuthorize(input: {
  readonly clientId: string;
  readonly loginHint?: string;
  readonly state: string;
  readonly challenge: string;
  readonly timeoutMs: number;
  readonly openBrowser?: (url: string) => Promise<void>;
  readonly waitForCode?: AuthorizeOptions["waitForCode"];
}): Promise<{ redirectUri: string; code: string }> {
  if (input.waitForCode) {
    const redirectUri = "http://127.0.0.1:8734/";
    const url = buildDesktopAuthorizationUrl({
      clientId: input.clientId,
      redirectUri,
      state: input.state,
      challenge: input.challenge,
      ...(input.loginHint ? { loginHint: input.loginHint } : {}),
    });
    if (input.openBrowser) await input.openBrowser(url);
    const code = await input.waitForCode({ redirectUri, state: input.state });
    return { redirectUri, code };
  }

  return await new Promise((resolve, reject) => {
    const server = createServer();
    const timer = setTimeout(() => {
      server.close();
      reject(new GoogleDocsError("authorization_failed", "Timed out waiting for Google consent in the browser."));
    }, input.timeoutMs);

    server.on("error", (error) => {
      clearTimeout(timer);
      reject(new GoogleDocsError("authorization_failed", redactSecrets(error.message)));
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        clearTimeout(timer);
        server.close();
        reject(new GoogleDocsError("authorization_failed", "Failed to bind a loopback OAuth callback port."));
        return;
      }
      const redirectUri = `http://127.0.0.1:${address.port}/`;
      const url = buildDesktopAuthorizationUrl({
        clientId: input.clientId,
        redirectUri,
        state: input.state,
        challenge: input.challenge,
        ...(input.loginHint ? { loginHint: input.loginHint } : {}),
      });

      server.on("request", (req: IncomingMessage, res: ServerResponse) => {
        try {
          const host = req.headers.host ?? "";
          if (!host.startsWith("127.0.0.1")) {
            res.writeHead(400);
            res.end("Invalid host");
            return;
          }
          const requestUrl = new URL(req.url ?? "/", redirectUri);
          const returnedState = requestUrl.searchParams.get("state");
          const code = requestUrl.searchParams.get("code");
          const error = requestUrl.searchParams.get("error");
          if (error) {
            res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Authorization was denied. You can close this window.");
            clearTimeout(timer);
            server.close();
            reject(new GoogleDocsError("authorization_failed", `Google authorization error: ${error}`));
            return;
          }
          if (returnedState !== input.state || !code) {
            res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Invalid OAuth callback.");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<html><body><p>Authorization complete. You can close this window and return to the terminal.</p></body></html>");
          clearTimeout(timer);
          server.close();
          resolve({ redirectUri, code });
        } catch (error) {
          clearTimeout(timer);
          server.close();
          reject(error);
        }
      });

      const opener = input.openBrowser ?? openInBrowser;
      opener(url).catch(() => {
        process.stderr.write(`Open this URL in a browser to continue authorization:\n${url}\n`);
      });
    });
  });
}

export async function openInBrowser(url: string): Promise<void> {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.once("error", reject);
    child.unref();
    resolve();
  });
}

export function authorizationReceiptLog(result: AuthorizeResult): Record<string, unknown> {
  return {
    secretStorePath: result.secretStorePath,
    refreshTokenCaptured: true,
    refreshTokenPrinted: false,
    authorizedEmail: result.authorizedEmail,
    refreshTokenExpiresIn: result.refreshTokenExpiresIn ?? null,
    note:
      result.refreshTokenExpiresIn !== undefined
        ? "Google returned refresh_token_expires_in. Testing-status apps typically expire refresh tokens in 7 days."
        : "Google did not return refresh_token_expires_in. Tokens can still expire if revoked, unused, or if the consent screen remains in Testing.",
    nextSteps: result.nextSteps,
  };
}
