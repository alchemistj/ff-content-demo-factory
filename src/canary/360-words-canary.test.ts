import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import { validateSealed, dispatchReceipt, run, writer1Projection } from "../../scripts/360-words-canary.js";
import { validateControl } from "../../scripts/360-words-control.mjs";

const root = path.resolve(process.cwd());
const routes = ["/", "/garage-door-repair", "/garage-door-installation", "/contact"];
const rawHandoff = () => readFileSync(path.join(root, "canary/sealed/360-four-page-reseal-handoff.json"));
const blobSha = (raw: Buffer) => createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`), raw])).digest("hex");

test("imports the exact PR3 handoff blob and preserves the four public routes", () => {
  const raw = rawHandoff();
  const handoff = JSON.parse(raw.toString("utf8")) as Record<string, any>;
  const sealed = validateSealed(root, { raw, value: handoff });
  assert.equal(blobSha(raw), sealed.manifest.importedFrom.blobSha);
  assert.equal(raw.length, sealed.manifest.importedFrom.byteLength);
  assert.equal(handoff.resealDigest, "sha256:715f651a53055444b8381dd8a276a2046d93776c61d88a2193cc2d42a1c83ad6");
  assert.deepEqual(handoff.writerProjection.routes, routes);
  assert.deepEqual(sealed.manifest.approvedRoutes, routes);
  assert.deepEqual(sealed.manifest.writer1Routes, routes.slice(1, 3));
  assert.deepEqual(sealed.ledger.services.map((service: Record<string, any>) => service.id), ["garage-door-repair", "garage-door-installation", "home-breadth"]);
  assert.equal(sealed.approval.approvedBy, "Josh Lenz");
});

test("lossless sealed bridge rejects omitted or mutated envelope bindings", () => {
  const raw = rawHandoff();
  const handoff = JSON.parse(raw.toString("utf8")) as Record<string, any>;
  const sealed = validateSealed(root, { raw, value: handoff });
  const mutatedFacts = structuredClone(sealed.bridge);
  mutatedFacts.reviewAnalysisFacts.value.retrievedWrittenReviewCount = 999;
  assert.throws(() => validateSealed(root, { raw, value: handoff }, mutatedFacts), /sealed envelope bridge/);
  const mutatedIds = structuredClone(sealed.bridge);
  mutatedIds.reviewInventory.stableReviewIds.pop();
  assert.throws(() => validateSealed(root, { raw, value: handoff }, mutatedIds), /sealed envelope bridge/);
});

test("Writer1 receives only two service projections, service evidence, and bounded folded support", () => {
  const raw = rawHandoff();
  const sealed = validateSealed(root, { raw, value: JSON.parse(raw.toString("utf8")) });
  const input = writer1Projection(sealed);
  assert.deepEqual(Object.keys(input).sort(), ["approvedRoutes", "bridgeDigest", "foldedSupport", "schemaVersion", "sealedRefs", "services", "sourceEnvelopeDigest", "stage"].sort());
  assert.equal(input.services.length, 2);
  assert.deepEqual(input.services.map((service: Record<string, any>) => service.page.url), ["/garage-door-repair", "/garage-door-installation"]);
  assert.ok(input.services.every((service: Record<string, any>) => service.reviewEvidence.length > 0));
  assert.ok(input.services.every((service: Record<string, any>) => typeof service.prescriptionId === "string" && input.sealedRefs.includes(service.prescriptionId)));
  assert.ok(input.foldedSupport.every((entry: Record<string, any>) => ["garage-door-repair", "garage-door-installation"].includes(entry.canonicalServiceId)));
  assert.equal(JSON.stringify(input).includes("reviewAnalysisFacts"), false);
  assert.equal(JSON.stringify(input).includes("reviewInventory"), false);
  assert.equal(JSON.stringify(input).includes("listingReviewCount"), false);
  assert.equal("source" in input, false);
  assert.equal("prospect" in input, false);
});

test("dormant control exits before provider validation or dispatch", async () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8")) as Record<string, any>;
  assert.equal(control.wakeNonce, "DORMANT");
  assert.equal(control.stage, "writer1");
  assert.equal(control.policy.fast, false);
  assert.deepEqual(control.policy.approvedRoutes, routes);
  const previous = { ...process.env };
  delete process.env.CURSOR_API_KEY;
  delete process.env.CURSOR_MODEL;
  delete process.env.CURSOR_FAST;
  try { assert.deepEqual(await run(root), { status: "dormant", stage: "writer1" }); } finally { process.env = previous; }
});

test("dormant setup commits ignore extra paths, while active wakes require a single authorized control-file path", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8")) as Record<string, any>;
  assert.deepEqual(validateControl(control, { changedPaths: ["README.md", "package.json", ".factory-wake/360-words-control.json"], actor: "untrusted", owner: "architect" }), { dormant: true, stage: "writer1" });
  const active = { ...control, wakeNonce: "W1-360-20260824-8K4M7Q2N" };
  assert.throws(() => validateControl(active, { changedPaths: [".factory-wake/360-words-control.json", "README.md"], actor: "architect", owner: "architect" }), /only the control file/);
  assert.throws(() => validateControl(active, { changedPaths: [".factory-wake/360-words-control.json"], actor: "other", owner: "architect" }), /repository owner/);
});

test("workflow is limited to the Architect control push and one dormant-safe Writer1 wake", () => {
  const workflow = readFileSync(path.join(root, ".github/workflows/architect-360-words-canary.yml"), "utf8");
  const controlScript = readFileSync(path.join(root, "scripts/360-words-control.mjs"), "utf8");
  assert.match(workflow, /branches:\s*\n\s*- architect\/360-words-canary/);
  assert.match(workflow, /paths:\s*\n\s*- \.factory-wake\/360-words-control\.json/);
  assert.match(controlScript, /repository owner Architect actor/);
  assert.match(workflow, /CURSOR_API_KEY: \$\{\{ secrets\.CURSOR_API_KEY \}\}/);
  assert.match(workflow, /CURSOR_MODEL: \$\{\{ secrets\.CURSOR_MODEL \}\}/);
  assert.match(workflow, /CURSOR_FAST: 'false'/);
  assert.match(workflow, /scripts\/360-words-control\.mjs/);
  assert.match(workflow, /Create fresh Writer1 agent and stop at Architect QA/);
  assert.match(workflow, /scripts\/360-words-canary\.ts --fresh/);
  assert.doesNotMatch(workflow, /prior-artifact|Retrieve Writer1 JSON/u);
  assert.match(workflow, /stop at Architect QA/);
  assert.match(workflow, /actions\/upload-artifact@/);
  assert.doesNotMatch(workflow.toLowerCase(), /apify|research|luna/);
  assert.doesNotMatch(workflow, /workflow_run|repository_dispatch|workflow_dispatch|workflow_call|actions:\s*write/);
  assert.doesNotMatch(workflow, /vercel|deploy|outreach|lemlist/iu);
  assert.ok(workflow.indexOf("scripts/360-words-control.mjs") < workflow.indexOf("Install locked dependencies"));
  assert.ok(workflow.indexOf("scripts/360-words-control.mjs") < workflow.indexOf("CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}"));
});

test("authenticated dispatch notice emits the direct server URL to a small receipt and summary", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ff-360-words-receipt-"));
  const summary = path.join(temp, "summary.md");
  const previous = process.env.GITHUB_STEP_SUMMARY;
  process.env.GITHUB_STEP_SUMMARY = summary;
  try {
    const url = "https://cursor.com/agents/bc-360-server-returned";
    await dispatchReceipt(temp, { stage: "writer1", provider: "cursor-sdk", requestedModel: "cursor-grok-4.6-high", officialModel: "grok-4.6", modelParams: [{ id: "fast", value: "false" }], registryDigest: "sha256:" + "3".repeat(64), effort: "high", effortAttestationSource: "named-model-default", fast: false, agentId: "bc-360-server-returned", jobId: "run-360-server-returned", threadUrl: url, inputDigest: "sha256:" + "1".repeat(64), promptDigest: "sha256:" + "2".repeat(64), requestDigest: "sha256:" + "3".repeat(64), dispatchedAt: "2026-08-24T00:00:00.000Z" });
    const receipt = JSON.parse(await fs.readFile(path.join(temp, "canary/runtime/dispatch-receipt.json"), "utf8")) as Record<string, any>;
    assert.equal(receipt.threadUrl, url);
    assert.equal(receipt.provider, "cursor-sdk");
    assert.equal(receipt.fast, false);
    assert.match(await fs.readFile(summary, "utf8"), /https:\/\/cursor\.com\/agents\/bc-360-server-returned/);
  } finally {
    if (previous === undefined) delete process.env.GITHUB_STEP_SUMMARY; else process.env.GITHUB_STEP_SUMMARY = previous;
  }
});
