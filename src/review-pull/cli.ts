#!/usr/bin/env node
import { resolve } from "node:path";
import { executeReviewPull, rebuildIndex, type ReviewPullReceipt } from "./output.js";
import { loadRequestFile, type ReviewPullTrigger } from "./request.js";

const USAGE = `Usage:
  npm run reviews:pull -- --maps-url <url> [--slug x] [--max-reviews 75] [--expected-phone 4175551234] [--expected-name "kode"] [--out reviews]
`;

async function main(argv: string[]): Promise<void> {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    if (argv.length === 0) process.exitCode = 1;
    return;
  }
  const flags = parseFlags(argv);
  if (flags["rebuild-index"] === true) {
    const index = rebuildIndex(resolve(typeof flags.out === "string" ? flags.out : "reviews"));
    process.stdout.write(`${JSON.stringify({ rebuiltIndex: index.places.length })}\n`);
    return;
  }
  const trigger = parseTrigger(flags.trigger);
  const outDir = resolve(typeof flags.out === "string" ? flags.out : "reviews");
  let raw: unknown = {};
  let invalidDetail: string | undefined;
  if (!trigger) {
    invalidDetail = "trigger must be workflow_dispatch, push, or cli.";
  } else if (typeof flags.request === "string") {
    try {
      raw = loadRequestFile(resolve(flags.request));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      invalidDetail = `Could not read the request file. ${message}`;
    }
  }
  raw = applyFlags(raw, flags);
  const token = process.env.APIFY_API_TOKEN;
  const receipt = await executeReviewPull({
    rawRequest: raw,
    trigger: trigger ?? "cli",
    outDir,
    ...(token !== undefined ? { token } : {}),
    ...(process.env.GITHUB_RUN_ID ? { githubRunId: process.env.GITHUB_RUN_ID } : {}),
    githubRunUrl: githubActionsRunUrl(process.env),
    ...(invalidDetail ? { invalidDetail } : {}),
  });
  writeReceipt(receipt);
}

function writeReceipt(receipt: ReviewPullReceipt): void {
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (receipt.status !== "ok") {
    if (receipt.detail) process.stderr.write(`${receipt.detail}\n`);
    process.exitCode = 1;
  }
}

function applyFlags(raw: unknown, flags: Record<string, string | true>): unknown {
  const base = isRecord(raw) ? { ...raw } : {};
  assign(base, "mapsUrl", flags["maps-url"]);
  assign(base, "slug", flags.slug);
  assign(base, "maxReviews", flags["max-reviews"]);
  assign(base, "expectedPhone", flags["expected-phone"]);
  assign(base, "expectedName", flags["expected-name"]);
  return base;
}

function assign(target: Record<string, unknown>, key: string, value: string | true | undefined): void {
  if (value === undefined) return;
  if (value === true) {
    target[key] = key === "slug" ? "Not a slug" : "not-a-number";
    return;
  }
  target[key] = value;
}

function parseTrigger(value: string | true | undefined): ReviewPullTrigger | null {
  if (value === undefined || value === "cli") return "cli";
  if (value === "workflow_dispatch" || value === "push") return value;
  return null;
}

export function githubActionsRunUrl(env: NodeJS.ProcessEnv): string | null {
  const server = env.GITHUB_SERVER_URL;
  const repository = env.GITHUB_REPOSITORY;
  const runId = env.GITHUB_RUN_ID;
  if (!server || !repository || !runId) return null;
  return `${server}/${repository}/actions/runs/${runId}`;
}

function parseFlags(argv: string[]): Record<string, string | true> {
  const flags: Record<string, string | true> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      index += 1;
    }
  }
  return flags;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
