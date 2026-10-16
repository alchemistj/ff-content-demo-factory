import { WorkflowError } from "../workflow/types.js";
import { parseWritingPackage } from "../writing-package/index.js";
import type { WritingPackage } from "../writing-package/types.js";
import { operatorFacingText } from "./redact.js";
import { WRITER_RUNTIME_ERROR_CODES } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("empty output");
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1)) as unknown;
    }
    throw new Error("output is not JSON");
  }
}

export function parseClaudeAuthStatus(stdout: string, exitCode: number | null): {
  readonly loggedIn: boolean;
  readonly authMethod: string;
  readonly apiProvider: string;
  readonly raw: unknown;
} {
  let raw: unknown = stdout.trim();
  try {
    raw = extractJsonObject(stdout);
  } catch {
    raw = { text: stdout.trim() };
  }
  const record = isRecord(raw) ? raw : {};
  const authMethod =
    typeof record.authMethod === "string"
      ? record.authMethod
      : typeof record.auth_method === "string"
        ? record.auth_method
        : "unknown";
  const apiProvider =
    typeof record.apiProvider === "string"
      ? record.apiProvider
      : typeof record.api_provider === "string"
        ? record.api_provider
        : "unknown";
  const loggedInFlag = record.loggedIn === true || record.logged_in === true;
  const loggedIn = exitCode === 0 && loggedInFlag;
  return { loggedIn, authMethod, apiProvider, raw };
}

const API_AUTH_METHODS = new Set(["api_key", "apiKey", "api-key", "console", "none"]);
const API_PROVIDERS = new Set(["bedrock", "vertex", "foundry", "microsoftFoundry"]);

export function isSubscriptionAuth(status: {
  readonly loggedIn: boolean;
  readonly authMethod: string;
  readonly apiProvider: string;
}): boolean {
  if (!status.loggedIn) return false;
  if (API_AUTH_METHODS.has(status.authMethod)) return false;
  if (API_PROVIDERS.has(status.apiProvider)) return false;
  return true;
}

export function writingPackageFromClaudeOutput(stdout: string, stderr: string): WritingPackage {
  let parsed: unknown;
  try {
    parsed = extractJsonObject(stdout);
  } catch {
    throw new WorkflowError(
      WRITER_RUNTIME_ERROR_CODES.INVALID_OUTPUT,
      `Claude Code writer output was not JSON. ${operatorFacingText(stdout, stderr)}`,
    );
  }

  if (isRecord(parsed) && parsed.is_error === true) {
    const detail =
      typeof parsed.result === "string" ? parsed.result : operatorFacingText(stdout, stderr);
    const authLike = /not authenticated|logged out|sign in|auth/i.test(detail);
    throw new WorkflowError(
      authLike ? WRITER_RUNTIME_ERROR_CODES.UNAUTHENTICATED : WRITER_RUNTIME_ERROR_CODES.INVOCATION_FAILED,
      `Claude Code writer reported an error: ${detail}`,
    );
  }

  const payload = packagePayloadFromEnvelope(parsed);
  try {
    return parseWritingPackage(payload);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new WorkflowError(
      WRITER_RUNTIME_ERROR_CODES.INVALID_OUTPUT,
      `Claude Code writer output was not a writing-package/v1 document: ${reason}`,
    );
  }
}

function packagePayloadFromEnvelope(parsed: unknown): unknown {
  if (!isRecord(parsed)) return parsed;
  if (parsed.structured_output !== undefined) return parsed.structured_output;
  if (typeof parsed.result === "string") {
    try {
      return extractJsonObject(parsed.result);
    } catch {
      return parsed.result;
    }
  }
  if (isRecord(parsed.result)) return parsed.result;
  if (parsed.schemaVersion === "writing-package/v1") return parsed;
  return parsed;
}
