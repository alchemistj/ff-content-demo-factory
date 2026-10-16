import type { WriterAdapter } from "../workflow/types.js";

/** Explicit opt-in. Absent or empty means no writer runtime is selected. */
export const FACTORY_WRITER_RUNTIME_ENV = "FACTORY_WRITER_RUNTIME" as const;
export const FACTORY_WRITER_MODEL_ENV = "FACTORY_WRITER_MODEL" as const;
export const FACTORY_WRITER_CLAUDE_BIN_ENV = "FACTORY_WRITER_CLAUDE_BIN" as const;
export const FACTORY_WRITER_TIMEOUT_MS_ENV = "FACTORY_WRITER_TIMEOUT_MS" as const;

export const CLAUDE_CODE_RUNTIME = "claude-code" as const;
export const CLAUDE_CODE_PROVIDER = "claude-code" as const;
export const DEFAULT_CLAUDE_CODE_MODEL = "sonnet" as const;
export const DEFAULT_CLAUDE_CODE_TIMEOUT_MS = 10 * 60 * 1000;
export const DEFAULT_CLAUDE_CODE_MAX_TURNS = 8;

/**
 * Environment that would send Claude Code down Anthropic API, Console, or
 * third-party cloud billing instead of Josh's Claude subscription/OAuth.
 */
export const API_BILLING_ENV_KEYS = Object.freeze([
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_USE_VERTEX",
  "CLAUDE_CODE_USE_FOUNDRY",
] as const);

export const WRITER_RUNTIME_ERROR_CODES = Object.freeze({
  NOT_SELECTED: "WRITER_RUNTIME_NOT_SELECTED",
  UNKNOWN: "WRITER_RUNTIME_UNKNOWN",
  UNAVAILABLE: "CLAUDE_CODE_UNAVAILABLE",
  UNAUTHENTICATED: "CLAUDE_CODE_UNAUTHENTICATED",
  API_BILLING_FORBIDDEN: "CLAUDE_CODE_API_BILLING_FORBIDDEN",
  TIMEOUT: "CLAUDE_CODE_TIMEOUT",
  CANCELLED: "CLAUDE_CODE_CANCELLED",
  INVOCATION_FAILED: "CLAUDE_CODE_INVOCATION_FAILED",
  INVALID_OUTPUT: "CLAUDE_CODE_INVALID_OUTPUT",
} as const);

export type WriterRuntimeErrorCode =
  (typeof WRITER_RUNTIME_ERROR_CODES)[keyof typeof WRITER_RUNTIME_ERROR_CODES];

export const CLAUDE_SUBSCRIPTION_LOGIN_COMMAND = "claude auth login --claudeai" as const;

export interface ProcessResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly cancelled: boolean;
  readonly signal: NodeJS.Signals | string | null;
  readonly spawnError?: string;
}

export interface RunProcessInput {
  readonly command: string;
  readonly args: readonly string[];
  readonly env: NodeJS.ProcessEnv;
  readonly timeoutMs: number;
  readonly stdin?: string;
  readonly cwd?: string;
  readonly signal?: AbortSignal;
}

export type RunProcess = (input: RunProcessInput) => Promise<ProcessResult>;

export interface ClaudeCodeInvocation {
  readonly command: string;
  readonly args: readonly string[];
  readonly env: NodeJS.ProcessEnv;
  readonly stdin: string;
  readonly timeoutMs: number;
  readonly cwd: string;
}

export interface ClaudeAuthStatus {
  readonly loggedIn: boolean;
  readonly authMethod: string;
  readonly apiProvider: string;
  readonly raw: unknown;
}

export interface ClaudeCodeWriterOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly runProcess?: RunProcess;
  readonly resolveBin?: (env: NodeJS.ProcessEnv) => string;
  readonly now?: () => Date;
  readonly signal?: AbortSignal;
}

export interface SelectedWriterAdapter extends WriterAdapter {
  readonly runtime: typeof CLAUDE_CODE_RUNTIME;
}
