import { hostname } from "node:os";
import {
  CLAUDE_SUBSCRIPTION_LOGIN_COMMAND,
  type ClaudeAuthStatus,
  type RunProcess,
} from "./types.js";
import { envWithoutApiBilling, presentApiBillingEnvKeys, resolveClaudeBin } from "./env.js";
import { isSubscriptionAuth, parseClaudeAuthStatus } from "./output.js";
import { runProcess as defaultRunProcess } from "./process.js";

export interface ClaudeCodeStatusReport {
  readonly hostname: string;
  readonly bin: string | null;
  readonly version: string | null;
  readonly loggedIn: boolean;
  readonly authMethod: string;
  readonly apiProvider: string;
  readonly subscriptionAuth: boolean;
  readonly apiBillingEnv: readonly string[];
  readonly durableCommand: string;
  readonly remainingAuthAction: string | null;
}

async function readVersion(bin: string, env: NodeJS.ProcessEnv, run: RunProcess): Promise<string | null> {
  const result = await run({
    command: bin,
    args: ["--version"],
    env: envWithoutApiBilling(env),
    timeoutMs: 15_000,
  });
  const text = result.stdout.trim() || result.stderr.trim();
  return text.length > 0 ? text.split("\n")[0] ?? text : null;
}

export async function inspectClaudeCodeStatus(
  env: NodeJS.ProcessEnv = process.env,
  run: RunProcess = defaultRunProcess,
): Promise<ClaudeCodeStatusReport> {
  const apiBillingEnv = presentApiBillingEnvKeys(env);
  let bin: string | null = null;
  try {
    bin = resolveClaudeBin(env);
  } catch {
    return {
      hostname: hostname(),
      bin: null,
      version: null,
      loggedIn: false,
      authMethod: "none",
      apiProvider: "unknown",
      subscriptionAuth: false,
      apiBillingEnv,
      durableCommand: "claude",
      remainingAuthAction: `Install Claude Code user-locally, then run ${CLAUDE_SUBSCRIPTION_LOGIN_COMMAND}`,
    };
  }

  const version = await readVersion(bin, env, run);
  const authResult = await run({
    command: bin,
    args: ["auth", "status"],
    env: envWithoutApiBilling(env),
    timeoutMs: 15_000,
  });
  const auth: ClaudeAuthStatus = parseClaudeAuthStatus(authResult.stdout, authResult.exitCode);
  const subscriptionAuth = isSubscriptionAuth(auth) && apiBillingEnv.length === 0;
  return {
    hostname: hostname(),
    bin,
    version,
    loggedIn: auth.loggedIn,
    authMethod: auth.authMethod,
    apiProvider: auth.apiProvider,
    subscriptionAuth,
    apiBillingEnv,
    durableCommand: "claude",
    remainingAuthAction: subscriptionAuth
      ? null
      : `On fluid-frame-dev-1 as fluidframe run: ${CLAUDE_SUBSCRIPTION_LOGIN_COMMAND}. Open the printed URL, sign in with Josh's existing Claude subscription (not Console/API), paste the code at the prompt, then confirm with: claude auth status`,
  };
}
