import type { ExampleLibraryReceipt } from "../examples/catalog.js";
import type { WriterAssignment } from "../workflow/types.js";
import { WorkflowError } from "../workflow/types.js";
import type { LoadedGuide, StageGuideSet, WritingAssignmentGuideSet } from "../writer-guides/loader.js";
import {
  CLAUDE_CODE_PROVIDER,
  CLAUDE_CODE_RUNTIME,
  CLAUDE_SUBSCRIPTION_LOGIN_COMMAND,
  DEFAULT_CLAUDE_CODE_MAX_TURNS,
  DEFAULT_CLAUDE_CODE_MODEL,
  DEFAULT_CLAUDE_CODE_TIMEOUT_MS,
  FACTORY_WRITER_MODEL_ENV,
  FACTORY_WRITER_TIMEOUT_MS_ENV,
  WRITER_RUNTIME_ERROR_CODES,
  type ClaudeAuthStatus,
  type ClaudeCodeInvocation,
  type ClaudeCodeWriterOptions,
  type ProcessResult,
  type RunProcess,
  type SelectedWriterAdapter,
} from "./types.js";
import {
  assertExplicitClaudeCodeRuntime,
  assertNoApiBillingEnv,
  configuredValue,
  envWithoutApiBilling,
  resolveClaudeBin,
} from "./env.js";
import { isSubscriptionAuth, parseClaudeAuthStatus, writingPackageFromClaudeOutput } from "./output.js";
import { runProcess as defaultRunProcess } from "./process.js";
import { operatorFacingText } from "./redact.js";

const WRITER_PROMPT = [
  "You are the Fluid Frame Content Demo Factory writer.",
  "Complete the writing assignment in one writer run. Internal order is recommended sequencing, not three sessions.",
  "Return only a writing-package/v1 JSON object. No markdown fences and no commentary.",
  "The assignment JSON is on stdin.",
].join(" ");

function parseTimeoutMs(env: NodeJS.ProcessEnv): number {
  const raw = configuredValue(env[FACTORY_WRITER_TIMEOUT_MS_ENV]);
  if (!raw) return DEFAULT_CLAUDE_CODE_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1000) {
    throw new WorkflowError(
      WRITER_RUNTIME_ERROR_CODES.INVOCATION_FAILED,
      `${FACTORY_WRITER_TIMEOUT_MS_ENV} must be a timeout in milliseconds >= 1000`,
    );
  }
  return parsed;
}

function serializeGuide(guide: LoadedGuide): Record<string, unknown> {
  return {
    id: guide.id,
    title: guide.title,
    relativePath: guide.relativePath,
    markdown: guide.markdown,
    sha256: guide.sha256,
  };
}

function serializePhase(set: StageGuideSet): Record<string, unknown> {
  return {
    stage: set.stage,
    catalogManifestHash: set.catalogManifestHash,
    setHash: set.setHash,
    sourceIds: set.sourceIds,
    guides: set.guides.map(serializeGuide),
  };
}

function serializeGuides(guides: WritingAssignmentGuideSet): Record<string, unknown> {
  return {
    assignment: guides.assignment,
    catalogManifestHash: guides.catalogManifestHash,
    setHash: guides.setHash,
    sourceIds: guides.sourceIds,
    guides: guides.guides.map(serializeGuide),
    phases: {
      servicePages: serializePhase(guides.phases.servicePages),
      siteChrome: serializePhase(guides.phases.siteChrome),
      strategyOverview: serializePhase(guides.phases.strategyOverview),
    },
  };
}

function serializeExamples(examples: ExampleLibraryReceipt): ExampleLibraryReceipt {
  return examples;
}

export function serializeWriterAssignment(assignment: WriterAssignment): Record<string, unknown> {
  return {
    writerRunId: assignment.writerRunId,
    runId: assignment.runId,
    context: assignment.context,
    instructions: assignment.instructions,
    authority: assignment.authority,
    internalOrder: assignment.internalOrder,
    guides: serializeGuides(assignment.guides),
    examples: serializeExamples(assignment.examples),
  };
}

export function buildClaudeCodeInvocation(input: {
  readonly bin: string;
  readonly assignment: WriterAssignment;
  readonly env: NodeJS.ProcessEnv;
  readonly cwd?: string;
}): ClaudeCodeInvocation {
  const model = configuredValue(input.env[FACTORY_WRITER_MODEL_ENV]) ?? DEFAULT_CLAUDE_CODE_MODEL;
  const childEnv = envWithoutApiBilling(input.env);
  return {
    command: input.bin,
    args: [
      "-p",
      WRITER_PROMPT,
      "--output-format",
      "json",
      "--permission-mode",
      "dontAsk",
      "--tools",
      "",
      "--max-turns",
      String(DEFAULT_CLAUDE_CODE_MAX_TURNS),
      "--no-session-persistence",
      "--safe-mode",
      "--model",
      model,
    ],
    env: childEnv,
    stdin: `${JSON.stringify(serializeWriterAssignment(input.assignment))}\n`,
    timeoutMs: parseTimeoutMs(input.env),
    cwd: input.cwd ?? input.assignment.guides.repoRoot,
  };
}

export async function readClaudeAuthStatus(
  bin: string,
  env: NodeJS.ProcessEnv,
  run: RunProcess,
): Promise<ClaudeAuthStatus> {
  const result = await run({
    command: bin,
    args: ["auth", "status"],
    env: envWithoutApiBilling(env),
    timeoutMs: 15_000,
  });
  if (result.spawnError === "ENOENT") {
    throw new WorkflowError(
      WRITER_RUNTIME_ERROR_CODES.UNAVAILABLE,
      `Claude Code binary was not found: ${bin}`,
    );
  }
  return parseClaudeAuthStatus(result.stdout, result.exitCode);
}

function mapProcessFailure(result: ProcessResult, stdout: string, stderr: string): never {
  if (result.spawnError === "ENOENT") {
    throw new WorkflowError(
      WRITER_RUNTIME_ERROR_CODES.UNAVAILABLE,
      "Claude Code binary was not found on this machine.",
    );
  }
  if (result.timedOut) {
    throw new WorkflowError(
      WRITER_RUNTIME_ERROR_CODES.TIMEOUT,
      `Claude Code writer run timed out. ${operatorFacingText(stdout, stderr)}`,
    );
  }
  if (result.cancelled) {
    throw new WorkflowError(
      WRITER_RUNTIME_ERROR_CODES.CANCELLED,
      "Claude Code writer run was cancelled.",
    );
  }
  const detail = operatorFacingText(stdout, stderr);
  if (/not authenticated|please run \/login|auth login/i.test(detail)) {
    throw new WorkflowError(
      WRITER_RUNTIME_ERROR_CODES.UNAUTHENTICATED,
      `Claude Code is not signed in with a Claude subscription. On this Droplet run: ${CLAUDE_SUBSCRIPTION_LOGIN_COMMAND}. Open the printed URL, sign in with Josh's existing Claude subscription (not Console/API), then paste the code back. ${detail}`,
    );
  }
  throw new WorkflowError(
    WRITER_RUNTIME_ERROR_CODES.INVOCATION_FAILED,
    `Claude Code writer exited ${result.exitCode ?? "without a code"}${result.signal ? ` (signal ${result.signal})` : ""}. ${detail}`,
  );
}

export function createClaudeCodeWriterAdapter(options: ClaudeCodeWriterOptions = {}): SelectedWriterAdapter {
  const env = options.env ?? process.env;
  const run = options.runProcess ?? defaultRunProcess;
  const resolveBin = options.resolveBin ?? resolveClaudeBin;

  return {
    provider: CLAUDE_CODE_PROVIDER,
    model: configuredValue(env[FACTORY_WRITER_MODEL_ENV]) ?? DEFAULT_CLAUDE_CODE_MODEL,
    runtime: CLAUDE_CODE_RUNTIME,
    async writeCompletePackage(assignment) {
      assertNoApiBillingEnv(env);
      const bin = resolveBin(env);
      const auth = await readClaudeAuthStatus(bin, env, run);
      if (!auth.loggedIn) {
        throw new WorkflowError(
          WRITER_RUNTIME_ERROR_CODES.UNAUTHENTICATED,
          `Claude Code is not signed in with a Claude subscription (authMethod=${auth.authMethod}). On this Droplet run: ${CLAUDE_SUBSCRIPTION_LOGIN_COMMAND}. Open the printed URL on a phone or laptop, sign in with Josh's existing Claude Pro/Max subscription — not Console/API billing — then paste the code at the Droplet prompt.`,
        );
      }
      if (!isSubscriptionAuth(auth)) {
        throw new WorkflowError(
          WRITER_RUNTIME_ERROR_CODES.API_BILLING_FORBIDDEN,
          `Claude Code authMethod=${auth.authMethod} apiProvider=${auth.apiProvider} is not subscription/OAuth. Log out and run ${CLAUDE_SUBSCRIPTION_LOGIN_COMMAND}. Do not use --console or ANTHROPIC_API_KEY.`,
        );
      }
      const invocation = buildClaudeCodeInvocation({
        bin,
        assignment,
        env,
      });
      const result = await run({
        command: invocation.command,
        args: invocation.args,
        env: invocation.env,
        stdin: invocation.stdin,
        timeoutMs: invocation.timeoutMs,
        cwd: invocation.cwd,
        ...(options.signal ? { signal: options.signal } : {}),
      });
      if (result.timedOut || result.cancelled || result.spawnError || result.exitCode !== 0) {
        mapProcessFailure(result, result.stdout, result.stderr);
      }
      return writingPackageFromClaudeOutput(result.stdout, result.stderr);
    },
  };
}

export function createSelectedWriterAdapter(options: ClaudeCodeWriterOptions = {}): SelectedWriterAdapter {
  const env = options.env ?? process.env;
  assertExplicitClaudeCodeRuntime(env);
  return createClaudeCodeWriterAdapter(options);
}
