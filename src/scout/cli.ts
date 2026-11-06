#!/usr/bin/env node
import { resolve } from "node:path";
import { executeScout, type ScoutReceipt } from "./output.js";
import { loadRequestFile, type ScoutTrigger } from "./request.js";

const USAGE = `Usage:
  npm run prospects:scout -- --query "window installation" --location "Indianapolis, IN" [--max-places 60] [--slug x] [--out scout]
`;

async function main(argv: string[]): Promise<void> {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    if (argv.length === 0) process.exitCode = 1;
    return;
  }
  const flags = parseFlags(argv);
  const trigger = parseTrigger(flags.trigger);
  const outDir = resolve(typeof flags.out === "string" ? flags.out : "scout");
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
  const receipt = await executeScout({
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

function writeReceipt(receipt: ScoutReceipt): void {
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (receipt.status !== "ok") {
    if (receipt.detail) process.stderr.write(`${receipt.detail}\n`);
    process.exitCode = 1;
  }
}

function applyFlags(raw: unknown, flags: Record<string, string | true>): unknown {
  const base = isRecord(raw) ? { ...raw } : {};
  assign(base, "query", flags.query);
  assign(base, "location", flags.location);
  assign(base, "slug", flags.slug);
  assign(base, "maxPlaces", flags["max-places"]);
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

function parseTrigger(value: string | true | undefined): ScoutTrigger | null {
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
