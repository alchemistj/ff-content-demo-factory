import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { WorkflowError } from "../workflow/types.js";
import {
  API_BILLING_ENV_KEYS,
  CLAUDE_CODE_RUNTIME,
  CLAUDE_SUBSCRIPTION_LOGIN_COMMAND,
  FACTORY_WRITER_CLAUDE_BIN_ENV,
  FACTORY_WRITER_RUNTIME_ENV,
  WRITER_RUNTIME_ERROR_CODES,
} from "./types.js";

export function configuredValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function presentApiBillingEnvKeys(env: NodeJS.ProcessEnv): readonly string[] {
  return API_BILLING_ENV_KEYS.filter((key) => Boolean(configuredValue(env[key])));
}

export function selectedWriterRuntime(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return configuredValue(env[FACTORY_WRITER_RUNTIME_ENV]);
}

export function assertExplicitClaudeCodeRuntime(env: NodeJS.ProcessEnv = process.env): void {
  const runtime = selectedWriterRuntime(env);
  if (!runtime) {
    throw new WorkflowError(
      WRITER_RUNTIME_ERROR_CODES.NOT_SELECTED,
      `${FACTORY_WRITER_RUNTIME_ENV}=${CLAUDE_CODE_RUNTIME} is required to use the local Claude Code writer backend. D2D intake still forbids the writer before Human Gate 1.`,
    );
  }
  if (runtime !== CLAUDE_CODE_RUNTIME) {
    throw new WorkflowError(
      WRITER_RUNTIME_ERROR_CODES.UNKNOWN,
      `Unknown ${FACTORY_WRITER_RUNTIME_ENV} "${runtime}". The only local writer runtime is "${CLAUDE_CODE_RUNTIME}".`,
    );
  }
}

export function assertNoApiBillingEnv(env: NodeJS.ProcessEnv = process.env): void {
  const present = presentApiBillingEnvKeys(env);
  if (present.length === 0) return;
  throw new WorkflowError(
    WRITER_RUNTIME_ERROR_CODES.API_BILLING_FORBIDDEN,
    `Claude Code writer runtime refuses API/cloud billing credentials (${present.join(", ")}). Use ${CLAUDE_SUBSCRIPTION_LOGIN_COMMAND} with Josh's Claude subscription. Do not set ANTHROPIC_API_KEY.`,
  );
}

export function envWithoutApiBilling(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next: NodeJS.ProcessEnv = { ...env };
  for (const key of API_BILLING_ENV_KEYS) {
    delete next[key];
  }
  delete next.FACTORY_MODEL_API_KEY;
  return next;
}

function isExecutableFile(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveClaudeBin(env: NodeJS.ProcessEnv = process.env): string {
  const override = configuredValue(env[FACTORY_WRITER_CLAUDE_BIN_ENV]);
  if (override) {
    if (!isExecutableFile(override)) {
      throw new WorkflowError(
        WRITER_RUNTIME_ERROR_CODES.UNAVAILABLE,
        `FACTORY_WRITER_CLAUDE_BIN is not an executable Claude Code binary: ${override}`,
      );
    }
    return override;
  }

  const pathValue = env.PATH ?? process.env.PATH ?? "";
  for (const dir of pathValue.split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, "claude");
    if (isExecutableFile(candidate)) return candidate;
  }

  const home = configuredValue(env.HOME) ?? homedir();
  const userLocal = join(home, ".local", "bin", "claude");
  if (isExecutableFile(userLocal)) return userLocal;

  throw new WorkflowError(
    WRITER_RUNTIME_ERROR_CODES.UNAVAILABLE,
    "Claude Code is not installed or not on PATH. Expected user-local binary at ~/.local/bin/claude.",
  );
}
