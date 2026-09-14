import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { FakeGoogleTransport } from "./fake-google.js";
import { GoogleDocsError } from "./errors.js";
import { lifecycleAfterPublish, missingConfigPublishResult, publishForHumanReview } from "./publisher.js";
import { REVIEW_PERMISSION } from "./lifecycle.js";
import { buildWritingPackage, parseWritingPackage, type WritingPackage, type WritingPackagePage } from "../writing-package/index.js";
import type { GoogleDocsConfig } from "./config.js";

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures/google-docs/representative-writing-package.json");

function loadPackage(): WritingPackage {
  return parseWritingPackage(JSON.parse(readFileSync(fixturePath, "utf8")));
}

function withMachineRewrite(pkg: WritingPackage): WritingPackage {
  const home = pkg.pages[0];
  if (!home) return pkg;
  const nextHome: WritingPackagePage = {
    ...home,
    blocks: [...home.blocks, { type: "paragraph", spans: [{ text: "Machine rewrite" }] }],
  };
  return { ...pkg, pages: [nextHome, ...pkg.pages.slice(1)] };
}

const config: GoogleDocsConfig = {
  clientId: "client",
  clientSecret: "secret",
  refreshToken: "refresh",
  folderId: "folder_review",
  accountEmail: "factory-review@gmail.com",
};

test("publish creates a native Doc in the app folder and sets anyone-writer without discovery", async () => {
  const fake = new FakeGoogleTransport();
  const result = await publishForHumanReview(fake, loadPackage(), config, undefined);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const create = fake.calls.find((call) => call.method === "POST" && call.url.endsWith("/drive/v3/files"));
  assert.deepEqual(create?.body, {
    name: "Oak & Iron Plumbing — Website Copy — Human Review",
    mimeType: "application/vnd.google-apps.document",
    parents: ["folder_review"],
    description: "ff-content-factory website_copy website-copy-oak-iron-plumbing",
  });
  const permission = fake.calls.find((call) => call.url.includes("/permissions") && call.method === "POST");
  assert.deepEqual(permission?.body, REVIEW_PERMISSION);
  assert.equal(result.receipt.permission.allowFileDiscovery, false);
  assert.equal(result.receipt.publicationStatus, "published");
  assert.ok(result.receipt.documentUrl.includes(result.receipt.documentId));
  assert.equal(result.state, "human_review");
});

test("retry of the same publication reuses the document instead of creating a duplicate", async () => {
  const fake = new FakeGoogleTransport();
  const first = await publishForHumanReview(fake, loadPackage(), config, undefined);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const lifecycle = lifecycleAfterPublish(loadPackage(), first);
  const createsBefore = fake.calls.filter((call) => call.method === "POST" && call.url.endsWith("/drive/v3/files")).length;
  const second = await publishForHumanReview(fake, loadPackage(), config, lifecycle);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  const createsAfter = fake.calls.filter((call) => call.method === "POST" && call.url.endsWith("/drive/v3/files")).length;
  assert.equal(createsBefore, 1);
  assert.equal(createsAfter, 1);
  assert.equal(second.receipt.documentId, first.receipt.documentId);
  assert.equal(second.receipt.publicationStatus, "reused");
});

test("human edits are not overwritten when the machine draft changes", async () => {
  const fake = new FakeGoogleTransport();
  const original = loadPackage();
  const first = await publishForHumanReview(fake, original, config, undefined);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  fake.simulateHumanEdit(first.receipt.documentId);
  const lifecycle = lifecycleAfterPublish(original, first);
  await assert.rejects(
    () => publishForHumanReview(fake, withMachineRewrite(original), config, lifecycle),
    (error: unknown) => {
      assert.ok(error instanceof GoogleDocsError);
      assert.equal(error.code, "human_edits_protected");
      return true;
    },
  );
});

test("missing Google config fails publication without implying another writing run", () => {
  const result = missingConfigPublishResult(["GOOGLE_OAUTH_REFRESH_TOKEN"]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.writingPreserved, true);
  assert.equal(result.failure.status, "publication_failed");
  assert.match(result.failure.message, /without rerunning the writer/);
});

test("prescription packages publish through the same publisher without adding a gate", async () => {
  const pkg = buildWritingPackage({
    kind: "prescription",
    packageId: "prescription-oak-iron-plumbing",
    prospectId: "oak-iron-plumbing",
    runId: "run_fixture_001",
    businessName: "Oak & Iron Plumbing",
    pages: [
      {
        pageId: "prescription",
        role: "prescription",
        audience: "owner",
        readingOrder: 1,
        title: "Proposed page plan",
        blocks: [{ type: "paragraph", spans: [{ text: "Keep the existing prescription human gate." }] }],
      },
    ],
  });
  const fake = new FakeGoogleTransport();
  const result = await publishForHumanReview(fake, pkg, config, undefined);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.receipt.kind, "prescription");
  assert.equal(result.receipt.title, "Oak & Iron Plumbing — Prescription — Human Review");
});
