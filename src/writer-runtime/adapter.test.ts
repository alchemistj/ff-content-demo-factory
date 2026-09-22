import assert from "node:assert/strict";
import test from "node:test";
import type { ExampleLibraryReceipt } from "../examples/catalog.js";
import { northlineWriterContext } from "../workflow/northline.fixture.js";
import { WorkflowError, type WriterAssignment } from "../workflow/types.js";
import type { GuideId } from "../writer-guides/catalog.js";
import type { LoadedGuide, StageGuideSet, WritingAssignmentGuideSet } from "../writer-guides/loader.js";
import { WRITER_INTERNAL_ORDER } from "../writing-package/types.js";
import { buildWritingPackage } from "../writing-package/index.js";
import { northlineWebsitePages } from "../workflow/northline.fixture.js";
import {
  buildClaudeCodeInvocation,
  createClaudeCodeWriterAdapter,
  createSelectedWriterAdapter,
} from "./adapter.js";
import {
  assertExplicitClaudeCodeRuntime,
  assertNoApiBillingEnv,
  envWithoutApiBilling,
  selectedWriterRuntime,
} from "./env.js";
import { writingPackageFromClaudeOutput } from "./output.js";
import { runProcess } from "./process.js";
import {
  CLAUDE_CODE_PROVIDER,
  CLAUDE_CODE_RUNTIME,
  DEFAULT_CLAUDE_CODE_MODEL,
  FACTORY_WRITER_RUNTIME_ENV,
  WRITER_RUNTIME_ERROR_CODES,
  type ProcessResult,
  type RunProcess,
  type RunProcessInput,
} from "./types.js";

function guide(id: GuideId): LoadedGuide {
  const markdown = `# ${id}\n`;
  return {
    id,
    title: id,
    relativePath: `docs/writer-guides/${id}.md`,
    absolutePath: `/tmp/${id}.md`,
    bytes: Buffer.from(markdown),
    markdown,
    sha256: "a".repeat(64),
    headings: [],
  };
}

function phase(stage: StageGuideSet["stage"], ids: readonly GuideId[]): StageGuideSet {
  const guides = ids.map(guide);
  return {
    stage,
    repoRoot: "/tmp/ff-content-demo-factory",
    catalogManifestHash: "catalog",
    setHash: `set-${stage}`,
    sourceIds: ids,
    guides,
  };
}

function fixtureGuides(): WritingAssignmentGuideSet {
  const ids = ["general", "service", "homepage", "contact", "headerFooter"] as const;
  return {
    assignment: "writing",
    repoRoot: "/tmp/ff-content-demo-factory",
    catalogManifestHash: "catalog",
    setHash: "writing-set",
    sourceIds: ids,
    guides: ids.map(guide),
    phases: {
      servicePages: phase("writer1", ["general", "service"]),
      siteChrome: phase("writer2", ["general", "homepage", "contact", "headerFooter"]),
      strategyOverview: phase("writer3", ["general"]),
    },
  };
}

function fixtureExamples(): ExampleLibraryReceipt {
  return {
    status: "available",
    expectedRoot: "examples/approved-copy",
    available: true,
    pages: [],
    chromePages: [],
    note: "fixture",
  };
}

function fixtureAssignment(): WriterAssignment {
  return {
    writerRunId: "run-1:writer",
    runId: "run-1",
    context: northlineWriterContext(),
    guides: fixtureGuides(),
    examples: fixtureExamples(),
    instructions: "Write the complete package.",
    authority: "docs/runtime/AUTHORITY.md",
    internalOrder: WRITER_INTERNAL_ORDER,
  };
}

function fixturePackage() {
  return buildWritingPackage({
    kind: "website_copy",
    packageId: "website-copy-prospect-northline",
    prospectId: "prospect-northline",
    runId: "run-1",
    businessName: "Northline Garage Doors",
    pages: northlineWebsitePages(),
  });
}

function ok(stdout: string): ProcessResult {
  return { exitCode: 0, stdout, stderr: "", timedOut: false, cancelled: false, signal: null };
}

function authOk(): ProcessResult {
  return ok(JSON.stringify({ loggedIn: true, authMethod: "claude.ai", apiProvider: "firstParty" }));
}

function recordingRun(handler: (input: RunProcessInput) => ProcessResult | Promise<ProcessResult>): {
  readonly calls: RunProcessInput[];
  readonly run: RunProcess;
} {
  const calls: RunProcessInput[] = [];
  return {
    calls,
    run: async (input) => {
      calls.push(input);
      return handler(input);
    },
  };
}

test("writer runtime is selected only when FACTORY_WRITER_RUNTIME=claude-code", () => {
  assert.equal(selectedWriterRuntime({}), undefined);
  assert.equal(selectedWriterRuntime({ [FACTORY_WRITER_RUNTIME_ENV]: "  " }), undefined);
  assert.equal(selectedWriterRuntime({ [FACTORY_WRITER_RUNTIME_ENV]: CLAUDE_CODE_RUNTIME }), CLAUDE_CODE_RUNTIME);
  assert.throws(
    () => assertExplicitClaudeCodeRuntime({}),
    (error: unknown) =>
      error instanceof WorkflowError && error.code === WRITER_RUNTIME_ERROR_CODES.NOT_SELECTED,
  );
  assert.throws(
    () => assertExplicitClaudeCodeRuntime({ [FACTORY_WRITER_RUNTIME_ENV]: "openai" }),
    (error: unknown) =>
      error instanceof WorkflowError && error.code === WRITER_RUNTIME_ERROR_CODES.UNKNOWN,
  );
  assert.throws(
    () => createSelectedWriterAdapter({ env: {} }),
    (error: unknown) =>
      error instanceof WorkflowError && error.code === WRITER_RUNTIME_ERROR_CODES.NOT_SELECTED,
  );
});

test("API billing env fails closed and is stripped from child env", () => {
  assert.throws(
    () => assertNoApiBillingEnv({ ANTHROPIC_API_KEY: "sk-ant-test" }),
    (error: unknown) =>
      error instanceof WorkflowError &&
      error.code === WRITER_RUNTIME_ERROR_CODES.API_BILLING_FORBIDDEN &&
      /ANTHROPIC_API_KEY/.test(error.message) &&
      !/sk-ant-test/.test(error.message),
  );
  const cleaned = envWithoutApiBilling({
    ANTHROPIC_API_KEY: "sk-ant-test",
    FACTORY_MODEL_API_KEY: "sk-openai-test",
    PATH: "/usr/bin",
    FACTORY_WRITER_RUNTIME: CLAUDE_CODE_RUNTIME,
  });
  assert.equal(cleaned.ANTHROPIC_API_KEY, undefined);
  assert.equal(cleaned.FACTORY_MODEL_API_KEY, undefined);
  assert.equal(cleaned.FACTORY_WRITER_RUNTIME, CLAUDE_CODE_RUNTIME);
});

test("invocation construction uses print/json, no tools, and never passes API keys", () => {
  const invocation = buildClaudeCodeInvocation({
    bin: "/home/fluidframe/.local/bin/claude",
    assignment: fixtureAssignment(),
    env: {
      PATH: "/usr/bin",
      FACTORY_WRITER_RUNTIME: CLAUDE_CODE_RUNTIME,
      FACTORY_WRITER_MODEL: "sonnet",
      FACTORY_MODEL_API_KEY: "sk-openai-must-not-leak",
      ANTHROPIC_API_KEY: "sk-ant-must-not-leak",
    },
  });
  assert.equal(invocation.command, "/home/fluidframe/.local/bin/claude");
  assert.equal(invocation.args[0], "-p");
  assert.ok(invocation.args.includes("--output-format"));
  assert.ok(invocation.args.includes("json"));
  assert.ok(invocation.args.includes("--safe-mode"));
  assert.ok(invocation.args.includes("--tools"));
  assert.equal(invocation.args[invocation.args.indexOf("--tools") + 1], "");
  assert.ok(invocation.args.includes("--model"));
  assert.equal(invocation.args[invocation.args.indexOf("--model") + 1], "sonnet");
  assert.equal(invocation.env.ANTHROPIC_API_KEY, undefined);
  assert.equal(invocation.env.FACTORY_MODEL_API_KEY, undefined);
  assert.equal(invocation.stdin.includes("run-1:writer"), true);
  assert.equal(invocation.stdin.includes("sk-ant-must-not-leak"), false);
});

test("writeCompletePackage captures writing-package/v1 from Claude JSON output", async () => {
  const pkg = fixturePackage();
  const recorder = recordingRun((input) => {
    if (input.args[0] === "auth") return authOk();
    return ok(JSON.stringify({ type: "result", result: JSON.stringify(pkg) }));
  });
  const writer = createSelectedWriterAdapter({
    env: { FACTORY_WRITER_RUNTIME: CLAUDE_CODE_RUNTIME, PATH: "/usr/bin" },
    resolveBin: () => "/home/fluidframe/.local/bin/claude",
    runProcess: recorder.run,
  });
  assert.equal(writer.provider, CLAUDE_CODE_PROVIDER);
  assert.equal(writer.model, DEFAULT_CLAUDE_CODE_MODEL);
  const result = await writer.writeCompletePackage(fixtureAssignment());
  assert.equal(result.schemaVersion, "writing-package/v1");
  assert.equal(result.kind, "website_copy");
  assert.equal(result.prospectId, "prospect-northline");
  assert.equal(recorder.calls.length, 2);
  assert.deepEqual(recorder.calls[0]?.args, ["auth", "status"]);
  assert.equal(recorder.calls[1]?.args[0], "-p");
});

test("unauthenticated Claude Code fails closed before the writer prompt", async () => {
  const recorder = recordingRun((input) => {
    if (input.args[0] === "auth") {
      return {
        exitCode: 1,
        stdout: JSON.stringify({ loggedIn: false, authMethod: "none", apiProvider: "firstParty" }),
        stderr: "",
        timedOut: false,
        cancelled: false,
        signal: null,
      };
    }
    throw new Error("writer prompt must not run while unauthenticated");
  });
  const writer = createClaudeCodeWriterAdapter({
    env: { FACTORY_WRITER_RUNTIME: CLAUDE_CODE_RUNTIME },
    resolveBin: () => "/home/fluidframe/.local/bin/claude",
    runProcess: recorder.run,
  });
  await assert.rejects(
    () => writer.writeCompletePackage(fixtureAssignment()),
    (error: unknown) =>
      error instanceof WorkflowError &&
      error.code === WRITER_RUNTIME_ERROR_CODES.UNAUTHENTICATED &&
      /claude auth login --claudeai/.test(error.message),
  );
  assert.equal(recorder.calls.length, 1);
});

test("missing binary fails closed as unavailable", async () => {
  const writer = createClaudeCodeWriterAdapter({
    env: {},
    resolveBin: () => {
      throw new WorkflowError(WRITER_RUNTIME_ERROR_CODES.UNAVAILABLE, "Claude Code is not installed");
    },
  });
  await assert.rejects(
    () => writer.writeCompletePackage(fixtureAssignment()),
    (error: unknown) =>
      error instanceof WorkflowError && error.code === WRITER_RUNTIME_ERROR_CODES.UNAVAILABLE,
  );
});

test("ANTHROPIC_API_KEY does not fall back to API billing", async () => {
  const recorder = recordingRun(() => {
    throw new Error("Claude Code must not be invoked when an API key is present");
  });
  const writer = createClaudeCodeWriterAdapter({
    env: { ANTHROPIC_API_KEY: "sk-ant-forbidden" },
    resolveBin: () => "/home/fluidframe/.local/bin/claude",
    runProcess: recorder.run,
  });
  await assert.rejects(
    () => writer.writeCompletePackage(fixtureAssignment()),
    (error: unknown) =>
      error instanceof WorkflowError && error.code === WRITER_RUNTIME_ERROR_CODES.API_BILLING_FORBIDDEN,
  );
  assert.equal(recorder.calls.length, 0);
});

test("timeout and nonzero exit are observable operator failures", async () => {
  const timeoutWriter = createClaudeCodeWriterAdapter({
    env: {},
    resolveBin: () => "/home/fluidframe/.local/bin/claude",
    runProcess: recordingRun((input) => {
      if (input.args[0] === "auth") return authOk();
      return { exitCode: null, stdout: "", stderr: "still running", timedOut: true, cancelled: false, signal: "SIGTERM" };
    }).run,
  });
  await assert.rejects(
    () => timeoutWriter.writeCompletePackage(fixtureAssignment()),
    (error: unknown) =>
      error instanceof WorkflowError && error.code === WRITER_RUNTIME_ERROR_CODES.TIMEOUT,
  );

  const failedWriter = createClaudeCodeWriterAdapter({
    env: {},
    resolveBin: () => "/home/fluidframe/.local/bin/claude",
    runProcess: recordingRun((input) => {
      if (input.args[0] === "auth") return authOk();
      return { exitCode: 2, stdout: "", stderr: "boom", timedOut: false, cancelled: false, signal: null };
    }).run,
  });
  await assert.rejects(
    () => failedWriter.writeCompletePackage(fixtureAssignment()),
    (error: unknown) =>
      error instanceof WorkflowError && error.code === WRITER_RUNTIME_ERROR_CODES.INVOCATION_FAILED,
  );
});

test("console/API auth method is not treated as subscription OAuth", async () => {
  const writer = createClaudeCodeWriterAdapter({
    env: {},
    resolveBin: () => "/home/fluidframe/.local/bin/claude",
    runProcess: recordingRun(() =>
      ok(JSON.stringify({ loggedIn: true, authMethod: "api_key", apiProvider: "firstParty" })),
    ).run,
  });
  await assert.rejects(
    () => writer.writeCompletePackage(fixtureAssignment()),
    (error: unknown) =>
      error instanceof WorkflowError && error.code === WRITER_RUNTIME_ERROR_CODES.API_BILLING_FORBIDDEN,
  );
});

test("output parser accepts fenced JSON and result envelopes", () => {
  const pkg = fixturePackage();
  const fromFence = writingPackageFromClaudeOutput(`\`\`\`json\n${JSON.stringify(pkg)}\n\`\`\``, "");
  assert.equal(fromFence.packageId, pkg.packageId);
  const fromEnvelope = writingPackageFromClaudeOutput(JSON.stringify({ type: "result", result: pkg }), "");
  assert.equal(fromEnvelope.kind, "website_copy");
  assert.throws(
    () => writingPackageFromClaudeOutput("not-json", "secret sk-ant-abc123shouldgo"),
    (error: unknown) =>
      error instanceof WorkflowError &&
      error.code === WRITER_RUNTIME_ERROR_CODES.INVALID_OUTPUT &&
      !/sk-ant-abc123shouldgo/.test(error.message),
  );
});

test("runProcess times out and kills a child", async () => {
  const result = await runProcess({
    command: process.execPath,
    args: ["-e", "setTimeout(() => {}, 30_000)"],
    env: process.env,
    timeoutMs: 250,
  });
  assert.equal(result.timedOut, true);
  assert.notEqual(result.exitCode, 0);
});
