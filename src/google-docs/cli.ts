#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { authorizeDesktopUser, authorizationReceiptLog } from "./authorize.js";
import { importReviewedDocument, writeApprovedSnapshot } from "./approval.js";
import {
  createLabeledTestDocument,
  initializeReviewFolder,
  testGoogleConnection,
  trashLabeledTestDocument,
} from "./connection.js";
import { GoogleDocsError } from "./errors.js";
import { humanQaTaskFromReceipt, type LifecycleRecord, type PublicationReceipt } from "./lifecycle.js";
import { lifecycleAfterPublish, missingConfigPublishResult, publishForHumanReview } from "./publisher.js";
import { redactSecrets } from "./redaction.js";
import { createLiveTransport, loadGoogleDocsConfig } from "./runtime.js";
import { defaultSecretStorePath, readSecretStore } from "./secret-store.js";
import { validateWritingPackage, type WritingPackage } from "../writing-package/index.js";
import { requireGoogleConfig } from "./config.js";
import { assertRepoRelativeInputPath, assertTrustedGithubRef, resolveApprovedSnapshotDir } from "./trust.js";

const USAGE = `Usage:
  npm run google-docs:authorize
  npm run google-docs:init-folder
  npm run google-docs:test-connection
  npm run google-docs:publish -- --package <path> [--receipt-out <path>] [--lifecycle <path>] [--new-review-version]
  npm run google-docs:import -- --package <path> --receipt <path> --out <path>
  npm run google-docs:approve -- --package <path> --receipt <path> --prospect-id <slug> --actor <github-user>
  npm run google-docs:push-secrets
  npm run google-docs:live-verify

Credentials are never printed. Authorization writes ~/.config/ff-content-factory/google-oauth.json (mode 0600).
`;

async function main(argv: string[]): Promise<void> {
  assertTrustedGithubRef();
  const [command, ...rest] = argv;
  const flags = parseFlags(rest);
  switch (command) {
    case "authorize":
      await runAuthorize();
      return;
    case "init-folder":
      await runInitFolder();
      return;
    case "test-connection":
      await runTestConnection();
      return;
    case "publish":
      await runPublish(flags);
      return;
    case "import":
      await runImport(flags);
      return;
    case "approve":
      await runApprove(flags);
      return;
    case "push-secrets":
      runPushSecrets();
      return;
    case "live-verify":
      await runLiveVerify();
      return;
    case "help":
    case "--help":
    case undefined:
      process.stdout.write(USAGE);
      return;
    default:
      throw new GoogleDocsError("invalid_writing_package", `Unknown command: ${command}`);
  }
}

async function runAuthorize(): Promise<void> {
  const loaded = loadGoogleDocsConfig();
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? loaded.config.clientId;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? loaded.config.clientSecret;
  if (!clientId || !clientSecret) {
    throw new GoogleDocsError(
      "missing_google_config",
      "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET before running authorize.",
    );
  }
  const loginHint = process.env.GOOGLE_ACCOUNT_EMAIL;
  process.stderr.write(
    "Opening a browser for Google consent. The refresh token will be written to a local 0600 file and will not be printed.\n",
  );
  const result = await authorizeDesktopUser({
    clientId,
    clientSecret,
    ...(loginHint ? { loginHint } : {}),
  });
  process.stdout.write(`${JSON.stringify(authorizationReceiptLog(result), null, 2)}\n`);
}

async function runInitFolder(): Promise<void> {
  const transport = await liveTransport();
  const folder = await initializeReviewFolder(transport);
  process.stdout.write(
    `${JSON.stringify(
      {
        folderId: folder.folderId,
        name: folder.name,
        next: "Store GOOGLE_DRIVE_FOLDER_ID as a GitHub Actions variable (not a secret).",
      },
      null,
      2,
    )}\n`,
  );
}

async function runTestConnection(): Promise<void> {
  const loaded = loadGoogleDocsConfig();
  const config = requireGoogleConfig(loaded);
  const transport = await createLiveTransport(config);
  const result = await testGoogleConnection(transport, config);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function runPublish(flags: Record<string, string | true>): Promise<void> {
  const pkg = loadPackage(requireFlag(flags, "package"));
  const loaded = loadGoogleDocsConfig();
  if (loaded.missing.length > 0) {
    const result = missingConfigPublishResult(loaded.missing);
    writeJson(optionalFlag(flags, "receipt-out"), result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const lifecycle = loadLifecycle(optionalFlag(flags, "lifecycle"));
  const transport = await createLiveTransport(loaded.config);
  const result = await publishForHumanReview(transport, pkg, loaded.config, lifecycle, {
    newReviewVersion: flags["new-review-version"] === true,
  });
  const nextLifecycle = lifecycleAfterPublish(pkg, result);
  const lifecycleOut = optionalFlag(flags, "lifecycle-out") ?? optionalFlag(flags, "lifecycle");
  if (lifecycleOut) writeJson(lifecycleOut, nextLifecycle);
  if (result.ok) {
    const receiptOut = optionalFlag(flags, "receipt-out");
    if (receiptOut) writeJson(receiptOut, result.receipt);
    process.stdout.write(
      `${JSON.stringify({ ok: true, state: result.state, task: humanQaTaskFromReceipt(result.receipt), receipt: publicReceipt(result.receipt) }, null, 2)}\n`,
    );
    return;
  }
  writeJson(optionalFlag(flags, "receipt-out"), result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function runImport(flags: Record<string, string | true>): Promise<void> {
  const pkg = loadPackage(requireFlag(flags, "package"));
  const receipt = loadReceipt(requireFlag(flags, "receipt"));
  const transport = await liveTransport();
  const imported = await importReviewedDocument(transport, pkg, receipt);
  const out = {
    documentId: imported.documentId,
    sourceRevisionId: imported.sourceRevisionId ?? null,
    importedContentHash: imported.importedContentHash,
    package: imported.package,
  };
  writeJson(requireFlag(flags, "out"), out);
  process.stdout.write(
    `${JSON.stringify({ documentId: imported.documentId, importedContentHash: imported.importedContentHash }, null, 2)}\n`,
  );
}

async function runApprove(flags: Record<string, string | true>): Promise<void> {
  const actor = requireFlag(flags, "actor");
  if (actor === "anyone" || actor === "anonymous") {
    throw new GoogleDocsError("authorization_failed", "Anonymous or in-document phrases cannot approve copy.");
  }
  const pkg = loadPackage(requireFlag(flags, "package"));
  const receipt = loadReceipt(requireFlag(flags, "receipt"));
  const snapshot = resolveApprovedSnapshotDir(requireFlag(flags, "prospect-id"));
  const transport = await liveTransport();
  const imported = await importReviewedDocument(transport, pkg, receipt);
  const record = writeApprovedSnapshot({
    snapshotDir: snapshot.absoluteDir,
    imported,
    actor,
    receipt,
    relativeDir: snapshot.relativeDir,
  });
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

async function runLiveVerify(): Promise<void> {
  const loaded = loadGoogleDocsConfig();
  if (loaded.missing.length > 0 || !loaded.config.folderId) {
    process.stdout.write(
      `${JSON.stringify(
        {
          liveVerification: "pending",
          reason: "Google OAuth credentials or GOOGLE_DRIVE_FOLDER_ID are not configured in this environment.",
          missing: [...loaded.missing, ...(loaded.config.folderId ? [] : ["GOOGLE_DRIVE_FOLDER_ID"])],
        },
        null,
        2,
      )}\n`,
    );
    return;
  }
  const transport = await createLiveTransport(loaded.config);
  const connection = await testGoogleConnection(transport, loaded.config);
  const created = await createLabeledTestDocument(transport, loaded.config.folderId ?? "");
  await trashLabeledTestDocument(transport, created.documentId);
  process.stdout.write(
    `${JSON.stringify(
      {
        liveVerification: "connection-ok",
        email: connection.email,
        folderId: connection.folderId,
        createdThenTrashed: created.name,
        note: "Publish/readback/edit/import of a prospect Doc still requires operator consent and a real review package.",
      },
      null,
      2,
    )}\n`,
  );
}

function runPushSecrets(): void {
  const stored = readSecretStore();
  if (!stored) {
    throw new GoogleDocsError("secret_store_error", "No local secret store. Run google-docs:authorize first.");
  }
  const pairs: Array<[string, string]> = [
    ["GOOGLE_OAUTH_CLIENT_ID", stored.clientId],
    ["GOOGLE_OAUTH_CLIENT_SECRET", stored.clientSecret],
    ["GOOGLE_OAUTH_REFRESH_TOKEN", stored.refreshToken],
  ];
  for (const [name, value] of pairs) {
    const result = spawnSync("gh", ["secret", "set", name], {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
    });
    if (result.status !== 0) {
      throw new GoogleDocsError(
        "secret_store_error",
        `Failed to set ${name} via gh. Run the command locally; the value was not printed.`,
      );
    }
  }
  process.stdout.write(
    `${JSON.stringify({ ok: true, secretsSet: pairs.map(([name]) => name), valuesPrinted: false }, null, 2)}\n`,
  );
}

async function liveTransport() {
  const loaded = loadGoogleDocsConfig();
  return createLiveTransport(requireGoogleConfig(loaded));
}

function loadPackage(path: string): WritingPackage {
  return validateWritingPackage(JSON.parse(readFileSync(resolve(assertRepoRelativeInputPath(path, "package")), "utf8")));
}

function loadReceipt(path: string): PublicationReceipt {
  return JSON.parse(readFileSync(resolve(assertRepoRelativeInputPath(path, "receipt")), "utf8")) as PublicationReceipt;
}

function loadLifecycle(path: string | undefined): LifecycleRecord | undefined {
  if (!path) return undefined;
  return JSON.parse(
    readFileSync(resolve(assertRepoRelativeInputPath(path, "lifecycle")), "utf8"),
  ) as LifecycleRecord;
}

function publicReceipt(receipt: PublicationReceipt): PublicationReceipt {
  return receipt;
}

function writeJson(path: string | undefined, value: unknown): void {
  if (!path) return;
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`);
}

function parseFlags(argv: string[]): Record<string, string | true> {
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return flags;
}

function requireFlag(flags: Record<string, string | true>, name: string): string {
  const value = flags[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new GoogleDocsError("invalid_writing_package", `Missing --${name}`);
  }
  return value;
}

function optionalFlag(flags: Record<string, string | true>, name: string): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

main(process.argv.slice(2)).catch((error) => {
  const message = redactSecrets(error instanceof Error ? error.message : error);
  process.stderr.write(`${message}\n`);
  if (error instanceof GoogleDocsError && error.code === "missing_google_config") {
    process.stderr.write(`Secret store path: ${defaultSecretStorePath()}\n`);
  }
  process.exitCode = 1;
});
