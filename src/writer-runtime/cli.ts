#!/usr/bin/env node
import { inspectClaudeCodeStatus } from "./status.js";

async function main(): Promise<void> {
  const report = await inspectClaudeCodeStatus();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.bin || report.apiBillingEnv.length > 0 || !report.subscriptionAuth) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
