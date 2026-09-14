import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createGoogleDocsPublisher } from "./publisher-adapter.js";
import { FakeGoogleTransport } from "./fake-google.js";
import { buildWritingPackage, parseWritingPackage } from "../writing-package/index.js";
import type { GoogleDocsConfig } from "./config.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/google-docs/representative-writing-package.json",
);

const config: GoogleDocsConfig = {
  clientId: "client",
  clientSecret: "secret",
  refreshToken: "refresh",
  folderId: "folder_review",
};

test("missing Google config is setup-required and does not imply a writer rerun", async () => {
  const pkg = parseWritingPackage(JSON.parse(readFileSync(fixturePath, "utf8")));
  const result = await createGoogleDocsPublisher({
    loadConfig: () => ({
      config: { clientId: "", clientSecret: "", refreshToken: "" },
      missing: ["GOOGLE_OAUTH_REFRESH_TOKEN"],
      source: "env",
    }),
  }).publishReviewPackage(pkg);
  assert.equal(result.status, "setup-required");
  assert.equal(result.kind, "website_copy");
  assert.equal(result.prospectId, pkg.prospectId);
  assert.equal(result.runId, pkg.runId);
  assert.equal(result.packageIdentity.packageId, pkg.packageId);
  assert.equal(result.packageIdentity.packageHash, pkg.packageHash);
  assert.equal(result.error?.code, "missing_google_config");
  assert.match(result.error?.message ?? "", /without rerunning the writer/);
});

test("prescription packages publish through the same publisher implementation", async () => {
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
        blocks: [{ type: "paragraph", spans: [{ text: "Two service pages: leak repair and water heaters." }] }],
      },
    ],
  });
  const fake = new FakeGoogleTransport();
  const result = await createGoogleDocsPublisher({
    loadConfig: () => ({ config, missing: [], source: "env" }),
    createTransport: async () => fake,
  }).publishReviewPackage(pkg);
  assert.equal(result.status, "published");
  assert.equal(result.kind, "prescription");
  assert.equal(result.packageIdentity.packageId, "prescription-oak-iron-plumbing");
  assert.ok(result.url?.includes(result.documentId ?? ""));
  const create = fake.calls.find((call) => call.method === "POST" && call.url.endsWith("/drive/v3/files"));
  assert.equal(create?.body && (create.body as { name: string }).name, "Oak & Iron Plumbing — Prescription — Human Review");
});
