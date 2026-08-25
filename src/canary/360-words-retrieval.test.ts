import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildWriter1QuarantineMetadata, buildWriter1ValidationReport, collectWriter1ValidationDiagnostics, parseAndValidateFreshWriter1Output, parseAndValidateWriter1Output, readApprovedWriter1OutputForWriter2, quarantineWriter1Artifact, validateSealed, writer1Projection, Writer1OutputRecoveryError } from "../../scripts/360-words-canary.js";
import { buildWriter1PointerLedgerNormalization, normalizeWriter1PointerLedger, writer1OutputDigests, writer1ProvenanceMetadataDigest, writer1SemanticRenderedCopyDigest, writer1StableIdentityDigest, WRITER1_WORD_KEYS, type CursorArtifactBinding } from "../../src/pipeline/cursor-writer.js";

const sha256 = (bytes: Buffer) => "sha256:" + createHash("sha256").update(bytes).digest("hex");
const quarantinedWriter1Path = join(process.cwd(), "canary/runtime/quarantine/writer1-output.json");
const quarantinedWriter1MetadataPath = join(process.cwd(), "canary/runtime/quarantine/writer1-output.metadata.json");

const projection = {
  services: [
    { page: { url: "/garage-door-repair" }, prescriptionId: "prescription-repair", comparison: { canonicalServiceId: "garage-door-repair" }, reviewEvidence: [{ review: { id: "review-repair", text: "The repair was excellent." }, judgment: { authoritative: true, decision: "anchor", grade: "anchor", directCompletedService: true } }] },
    { page: { url: "/garage-door-installation" }, prescriptionId: "prescription-install", comparison: { canonicalServiceId: "garage-door-installation" }, reviewEvidence: [{ review: { id: "review-install", text: "The installation was excellent." }, judgment: { authoritative: true, decision: "anchor", grade: "anchor", directCompletedService: true } }] },
  ],
  sealedRefs: ["prescription-repair", "prescription-install", "review-repair", "review-install"],
};
const valid = JSON.stringify({
  schemaVersion: "words-writer1-output/v1",
  pages: [
    { type: "service", url: "/garage-door-repair", prescriptionId: "prescription-repair", primaryKeyword: "garage door repair", title: "Repair", seoTitle: "Repair", metaDescription: "Repair", h1: "Repair", body: "Repair body", sections: [{ id: "repair-section", heading: "Repair", body: "Repair copy" }], reviewPlacements: [{ reviewId: "review-repair", quote: "The repair was excellent.", attribution: "Chris", provenance: { type: "review", ref: "review-repair", placement: "repair testimonial", section: "repair-section" } }] },
    { type: "service", url: "/garage-door-installation", prescriptionId: "prescription-install", primaryKeyword: "garage door installation", title: "Installation", seoTitle: "Installation", metaDescription: "Installation", h1: "Installation", body: "Installation body", sections: [{ id: "installation-section", heading: "Installation", body: "Installation copy" }], reviewPlacements: [{ reviewId: "review-install", quote: "The installation was excellent.", attribution: "Marcie", provenance: { type: "review", ref: "review-install", placement: "installation testimonial", section: "installation-section" } }] },
  ],
});

const springReplacementReviewId = "Ci9DQUlRQUNvZENodHljRjlvT2taQlh6VlZabU5OWjFKc2JISklTa1pXUlVwVGVuYxAB";
const foldedProjection = {
  ...projection,
  sealedRefs: [...projection.sealedRefs, springReplacementReviewId],
  foldedSupport: [{
    status: "folded",
    canonicalServiceId: "garage-door-repair",
    foldedInto: "garage-door-repair",
    directEvidenceReviewIds: [springReplacementReviewId],
    supportingEvidence: { allowedParentCanonicalId: "garage-door-repair", reviewIds: [springReplacementReviewId] },
    reviewEvidence: [{ review: { id: springReplacementReviewId, text: "The spring replacement was excellent." }, judgment: { authoritative: true, decision: "anchor", grade: "anchor", directCompletedService: true } }],
  }],
};
const withSpringReplacementReview = (route = "/garage-door-repair") => {
  const parsed = JSON.parse(valid) as Record<string, any>;
  const page = parsed.pages.find((candidate: Record<string, any>) => candidate.url === route);
  page.reviewPlacements[0] = { reviewId: springReplacementReviewId, quote: "The spring replacement was excellent.", attribution: "Chris", provenance: { type: "review", ref: springReplacementReviewId, placement: "spring testimonial", section: page.sections[0].id } };
  return JSON.stringify(parsed);
};

test("Writer1 output validator accepts complete bound JSON only", () => {
  const parsed = parseAndValidateWriter1Output(valid, projection);
  assert.equal(parsed.schemaVersion, "words-writer1-output/v1");
  assert.deepEqual(parsed.pages.map((page: any) => page.url), ["/garage-door-repair", "/garage-door-installation"]);
});

test("pointer-ledger normalization removes exactly the 62 duplicated words and preserves semantic copy, identity, and provenance", () => {
  const raw = JSON.parse(valid) as Record<string, any>;
  const entries = (count: number, route: string, section: string) => Array.from({ length: count }, (_, index) => ({ reviewId: `${route}-review-${index}`, reviewer: `Reviewer ${index}`, excerpt: `Duplicated excerpt ${index}`, provenance: { type: "evidence", ref: `${route}-review-${index}`, placement: "sealed pointer", section } }));
  raw.pages[0].reviewEvidence = entries(25, "repair", "repair-section");
  raw.pages[1].reviewEvidence = entries(6, "installation", "installation-section");
  const projectionWithRefs = structuredClone(projection) as Record<string, any>;
  projectionWithRefs.sealedRefs.push(...raw.pages.flatMap((page: any) => page.reviewEvidence.map((entry: any) => entry.reviewId)));
  const normalized = normalizeWriter1PointerLedger(raw);
  const normalizedOutput = normalized.output as Record<string, any>;
  assert.equal(normalized.removed.length, 62);
  assert.equal(normalized.removed.filter((entry) => entry.key === "reviewer").length, 31);
  assert.equal(normalized.removed.filter((entry) => entry.key === "excerpt").length, 31);
  assert.ok(normalized.removed.every((entry) => /^\/pages\/\d+\/reviewEvidence\/\d+\/(?:reviewer|excerpt)$/u.test(entry.path) && /^sha256:[0-9a-f]{64}$/u.test(entry.valueDigest)));
  assert.deepEqual(normalizedOutput.pages[0].reviewEvidence[0], { reviewId: "repair-review-0", provenance: { type: "evidence", ref: "repair-review-0", placement: "sealed pointer", section: "repair-section" } });
  assert.equal(writer1SemanticRenderedCopyDigest(raw), writer1SemanticRenderedCopyDigest(normalizedOutput));
  assert.equal(writer1StableIdentityDigest(raw), writer1StableIdentityDigest(normalizedOutput));
  assert.equal(writer1ProvenanceMetadataDigest(raw), writer1ProvenanceMetadataDigest(normalizedOutput));
  assert.doesNotThrow(() => parseAndValidateWriter1Output(JSON.stringify(normalizedOutput), projectionWithRefs));
  const artifact = { path: "artifacts/writer1-output.json", size: 127586, sha256: "sha256:" + "a".repeat(64), contentSize: 127586, byteDigest: "sha256:" + "a".repeat(64), updatedAt: "2026-08-25T01:33:20.000Z", downloadRequest: {} as any, requestShapeDigest: "sha256:" + "b".repeat(64), downloadRequestDigest: "sha256:" + "c".repeat(64), presignedUrlEvidence: {} as any, presignedUrlEvidenceDigest: "sha256:" + "d".repeat(64) } as CursorArtifactBinding;
  const normalization = buildWriter1PointerLedgerNormalization({ raw, normalized: normalizedOutput, removed: normalized.removed, artifact, prior: { actionRunId: "32797811881", artifactId: 9545486318, agentId: "bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8", runId: "run-47a109e2-4fd4-48df-a727-8a92a76cc472", threadUrl: "https://cursor.com/agents/bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8", requestedModel: "cursor-grok-4.6-high", resolvedModel: "grok-4.6", inputDigest: "sha256:" + "e".repeat(64), promptDigest: "sha256:" + "f".repeat(64), requestDigest: "sha256:" + "0".repeat(64), modelParams: [{ id: "fast", value: "false" }, { id: "effort", value: "high" }], registryDigest: "sha256:" + "1".repeat(64), effort: "high", effortAttestationSource: "named-model-default", fast: false, sourceBranch: "architect/360-words-canary", sourceSha: "9c5c6a0c19f52860ad22961090baa1387bb29507", sealedHandoffDigest: "sha256:" + "2".repeat(64) } });
  assert.equal(normalization.removed.length, 62);
  assert.deepEqual(normalization.finalDigests, writer1OutputDigests(normalizedOutput));
  const tampered = structuredClone(normalizedOutput) as Record<string, any>;
  tampered.pages[0].body = "tampered outside pointer ledger";
  assert.throws(() => buildWriter1PointerLedgerNormalization({ raw, normalized: tampered, removed: normalized.removed, artifact, prior: normalization as any }), /semantic copy/u);
  const invalid = structuredClone(normalizedOutput) as Record<string, any>;
  delete invalid.pages[0].body;
  assert.throws(() => parseAndValidateWriter1Output(JSON.stringify(invalid), projectionWithRefs), /full copy field body/u);
});

test("production reviewer+excerpt reviewEvidence fails the exact word-bearing gate, then normalizes losslessly", () => {
  const seeded = JSON.parse(valid) as Record<string, any>;
  seeded.pages[0].reviewEvidence = [{ reviewId: "review-repair", reviewer: "Chris", excerpt: "The repair was excellent.", provenance: { type: "evidence", ref: "review-repair", placement: "pointer", section: "repair-section" } }];
  const errors = collectWriter1ValidationDiagnostics(JSON.stringify(seeded), projection);
  assert.ok(errors.some((error) => error.code === "REVIEW_EVIDENCE_CLAIM_TEXT_DUPLICATE" && error.path === "/pages/0/reviewEvidence/0/reviewer"));
  assert.equal(errors[0]?.expectedRule, "reviewEvidence must not contain any accepted word-bearing key; it is a typed pointer ledger");
  assert.throws(() => parseAndValidateWriter1Output(JSON.stringify(seeded), projection), /word-bearing|typed pointer ledger/u);
  assert.throws(() => parseAndValidateFreshWriter1Output(seeded, projection), /word-bearing|typed pointer ledger/u);
  const normalized = normalizeWriter1PointerLedger(seeded);
  assert.equal("excerpt" in (normalized.output as Record<string, any>).pages[0].reviewEvidence[0], false);
  assert.equal("reviewer" in (normalized.output as Record<string, any>).pages[0].reviewEvidence[0], false);
  assert.equal((normalized.output as Record<string, any>).pages[0].reviewPlacements[0].quote, "The repair was excellent.");
  assert.equal((normalized.output as Record<string, any>).pages[0].reviewPlacements[0].attribution, "Chris");
  assert.doesNotThrow(() => parseAndValidateWriter1Output(JSON.stringify(normalized.output), projection));
});

test("Writer1 output validator rejects prose, missing copy, unbound quotes, and prohibited public topology", () => {
  for (const raw of [
    "Writer1 is done",
    JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: [] }),
    valid.replace('"type":"service",', ""),
    valid.replace('"metaDescription":"Repair"', '"metaDescription":""'),
    valid.replace('"primaryKeyword":"garage door repair"', '"primaryKeyword":""'),
    valid.replace('"provenance":{"type":"review"', '"provenance":{"type":""'),
    valid.replace('"provenance":{"type":"review"', '"provenance":{}'),
    valid.replace('"prescriptionId":"prescription-repair"', '"prescriptionId":"wrong-prescription"'),
    valid.replace('"provenance":{"type":"review"', '"provenance":null'),
    valid.replace('"reviewId":"review-repair"', '"reviewId":"unknown"'),
    valid.replace('"url":"/garage-door-installation"', '"url":"/garage-door-spring-repair"'),
    valid.replace('"reviewId":"review-install"', '"reviewId":"review-install","cta":"Garage door opener installation"'),
    JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: JSON.parse(valid).pages, contact: {} }),
  ]) assert.throws(() => parseAndValidateWriter1Output(raw, projection), /Writer1|JSON|copy|binding|topology|route|Contact/u);
});

test("Writer1 retrieval sentinel is explicit and never accepted as completed JSON", () => {
  assert.throws(() => parseAndValidateWriter1Output("OUTPUT_NOT_RECOVERABLE", projection), (error: unknown) => error instanceof Writer1OutputRecoveryError && error.code === "OUTPUT_NOT_RECOVERABLE");
});

test("Writer1 output rejects a service page with missing type", () => {
  const missingType = JSON.stringify({ ...JSON.parse(valid), pages: JSON.parse(valid).pages.map((page: Record<string, unknown>, index: number) => index === 0 ? Object.fromEntries(Object.entries(page).filter(([key]) => key !== "type")) : page) });
  assert.throws(() => parseAndValidateWriter1Output(missingType, projection), /page\.type.*exactly service/u);
});

test("collect-all Writer1 diagnostics shares strict parity, reports every seeded violation, and cannot authorize completion", () => {
  const strictPasses = (() => { try { parseAndValidateWriter1Output(valid, projection); return true; } catch { return false; } })();
  assert.equal(collectWriter1ValidationDiagnostics(valid, projection).length === 0, strictPasses);
  const seeded = JSON.parse(valid) as Record<string, any>;
  delete seeded.pages[0].body;
  seeded.pages[0].claims = [
    { provenance: { type: "claim", ref: "review-repair", placement: "claim one", section: "repair-section" } },
    { provenance: { type: "evidence", ref: "review-repair", placement: "claim two", section: "repair-section" } },
  ];
  delete seeded.pages[1].reviewPlacements[0].provenance;
  seeded.pages[1].type = "landing";
  const errors = collectWriter1ValidationDiagnostics(JSON.stringify(seeded), projection);
  assert.ok(errors.length >= 5);
  assert.ok(errors.filter((error) => error.code === "CLAIM_TEXT_MISSING").length >= 2);
  assert.ok(errors.some((error) => error.code === "COPY_FIELD_MISSING"));
  assert.ok(errors.some((error) => error.code === "PROVENANCE_MISSING"));
  assert.ok(errors.some((error) => error.code === "PAGE_TYPE_INVALID"));
  const report = buildWriter1ValidationReport({
    artifactPath: "artifacts/writer1-output.json",
    artifactByteDigest: "sha256:" + "a".repeat(64),
    artifactSize: 123,
    artifactUpdatedAt: "2026-08-24T00:00:00.000Z",
    copyProjectionDigest: "sha256:" + "b".repeat(64),
    frozenCopyProjectionDigest: "sha256:" + "c".repeat(64),
    projectionDigest: "sha256:" + "d".repeat(64),
    errors,
  });
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /Repair body|Installation body|The repair was excellent|The installation was excellent|Chris|Marcie/u);
  assert.equal(report.status, "diagnostic-failure");
  assert.equal(report.completionAuthorized, false);
  assert.equal(report.writer2Blocked, true);
  assert.equal("output" in report, false);
  assert.equal("receipt" in report, false);
});

test("invalid Writer1 bytes are quarantined with safe current-artifact authorship and never become an approved receipt", async () => {
  const root = await mkdtemp(join(tmpdir(), "ff-writer1-quarantine-"));
  try {
    const rawBytes = Buffer.from(JSON.stringify({ summary: "invalid" }), "utf8");
    const artifact = {
      path: "artifacts/writer1-output.json" as const,
      size: rawBytes.length,
      sha256: "sha256:" + "a".repeat(64),
      contentSize: rawBytes.length,
      byteDigest: "sha256:" + "a".repeat(64),
      updatedAt: "2026-08-25T01:33:20.000Z",
      downloadRequest: { agentId: "bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8", logicalPath: "artifacts/writer1-output.json" as const, cursorEndpoint: "https://api.cursor.com/v1/agents/bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8/artifacts/download?path=artifacts%2Fwriter1-output.json", method: "GET" as const, apiVersion: "cloud-agent-api-v1" as const },
      requestShapeDigest: "sha256:" + "b".repeat(64), downloadRequestDigest: "sha256:" + "c".repeat(64),
      presignedUrlEvidence: { scheme: "https" as const, host: "s3.us-east-1.amazonaws.com", pathname: "/opaque/object", queryParameterNames: ["X-Amz-Algorithm", "X-Amz-Signature"] },
      presignedUrlEvidenceDigest: "sha256:" + "d".repeat(64),
    } as CursorArtifactBinding;
    const errors = [{ code: "REVIEW_EVIDENCE_CLAIM_TEXT_DUPLICATE", path: "/pages/0/reviewEvidence/0/text", objectKind: "reviewEvidence", expectedRule: "typed pointer ledger" }, { code: "CLAIM_TEXT_MISSING", path: "/pages/0/claims/0", objectKind: "claims", expectedRule: "claim text required" }];
    const prior = { agentId: artifact.downloadRequest.agentId, runId: "run-47a109e2-4fd4-48df-a727-8a92a76cc472", threadUrl: `https://cursor.com/agents/${artifact.downloadRequest.agentId}` } as any;
    const metadata = buildWriter1QuarantineMetadata({ prior, artifact, errors });
    await quarantineWriter1Artifact(root, rawBytes, metadata);
    await mkdir(join(root, "canary/runtime"), { recursive: true });
    await writeFile(join(root, "canary/runtime/state.json"), JSON.stringify({ status: metadata.status, writer2Blocked: true }));
    const quarantined = await import("node:fs/promises").then((fs) => fs.readFile(join(root, metadata.quarantinedOutputPath)));
    assert.deepEqual(quarantined, rawBytes);
    assert.equal(metadata.consumable, false);
    assert.equal(metadata.approved, false);
    assert.equal(metadata.writer2Blocked, true);
    assert.deepEqual(metadata.errors, errors);
    assert.doesNotMatch(JSON.stringify(metadata), /CURSOR_API_KEY|X-Amz-Signature=|X-Amz-Credential=|signature=[^"&]/u);
    assert.throws(() => readApprovedWriter1OutputForWriter2(root), /cannot consume|approval/u);
    assert.equal(metadata.quarantinedOutputPath, "canary/runtime/quarantine/writer1-output.json");
    const binding = metadata.artifactBinding as CursorArtifactBinding;
    assert.equal(binding.downloadRequest.logicalPath, "artifacts/writer1-output.json");
    assert.equal(binding.downloadRequest.cursorEndpoint.startsWith("https://api.cursor.com/"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fresh Writer1 rejects summaries, absent copy, route leakage, and missing provenance before completion", () => {
  assert.throws(() => parseAndValidateFreshWriter1Output("Writer1 is done", projection), /JSON object.*summary|string/u);
  const absentCopy = structuredClone(JSON.parse(valid)); delete absentCopy.pages[0].body;
  assert.throws(() => parseAndValidateFreshWriter1Output(absentCopy, projection), /full copy field body/u);
  const leakedRoute = structuredClone(JSON.parse(valid)); leakedRoute.pages[0].cta = { href: "/strategy-overview" };
  assert.throws(() => parseAndValidateFreshWriter1Output(leakedRoute, projection), /Home|Contact|route|topology/u);
  const missingProvenance = structuredClone(JSON.parse(valid)); delete missingProvenance.pages[0].reviewPlacements[0].provenance;
  assert.throws(() => parseAndValidateFreshWriter1Output(missingProvenance, projection), /provenance/u);
  assert.doesNotThrow(() => parseAndValidateFreshWriter1Output(JSON.parse(valid), projection));
});

test("reviewEvidence is a pure typed pointer ledger and rejects every accepted word-bearing alias", () => {
  for (const key of WRITER1_WORD_KEYS) {
    const seeded = JSON.parse(valid) as Record<string, any>;
    seeded.pages[0].reviewEvidence = [{ evidenceId: "review-repair", [key]: "duplicated copy", provenance: { type: "evidence", ref: "review-repair", placement: "pointer", section: "repair-section" } }];
    assert.throws(() => parseAndValidateWriter1Output(JSON.stringify(seeded), projection), /word-bearing|duplicate|reviewEvidence/u, key);
  }
});

test("claims reject sealed review IDs and accept only explicitly typed claim/evidence references", () => {
  const invalid = JSON.parse(valid) as Record<string, any>;
  invalid.pages[0].claims = [{ claim: "A bounded claim", provenance: { type: "claim", ref: "review-repair", placement: "claim", section: "repair-section" } }];
  assert.throws(() => parseAndValidateWriter1Output(JSON.stringify(invalid), projection), /CLAIM_REFERENCE|typed claim|review ID/u);
  const validProjection = { ...projection, sealedRefs: [...projection.sealedRefs, "evidence-repair"], claimEvidenceRefs: { evidence: ["evidence-repair"] } };
  const accepted = JSON.parse(valid) as Record<string, any>;
  accepted.pages[0].claims = [{ claim: "A bounded claim", provenance: { type: "claim", ref: "evidence-repair", placement: "claim", section: "repair-section" } }];
  assert.doesNotThrow(() => parseAndValidateWriter1Output(JSON.stringify(accepted), validProjection));
});

test("folded spring-replacement evidence is authorized only on the repair page", () => {
  assert.doesNotThrow(() => parseAndValidateWriter1Output(withSpringReplacementReview(), foldedProjection));
  assert.throws(() => parseAndValidateWriter1Output(withSpringReplacementReview("/garage-door-installation"), foldedProjection), /Spring-replacement|unapproved/u);
  assert.throws(() => parseAndValidateWriter1Output(withSpringReplacementReview(), { ...foldedProjection, foldedSupport: [{ ...foldedProjection.foldedSupport[0], canonicalServiceId: "garage-door-installation" }] }), /unapproved/u);
  assert.throws(() => parseAndValidateWriter1Output(withSpringReplacementReview(), { ...foldedProjection, foldedSupport: [{ ...foldedProjection.foldedSupport[0], supportingEvidence: { allowedParentCanonicalId: "garage-door-installation", reviewIds: [springReplacementReviewId] } }] }), /unapproved/u);
  assert.throws(() => parseAndValidateWriter1Output(withSpringReplacementReview(), { ...foldedProjection, foldedSupport: [{ ...foldedProjection.foldedSupport[0], supportingEvidence: { allowedParentCanonicalId: "garage-door-repair", reviewIds: ["sealed-but-not-approved"] } }] }), /unapproved/u);
});

test("sealed but non-authoritative direct reviews remain rejected", () => {
  const nonAuthoritative = structuredClone(projection) as Record<string, any>;
  nonAuthoritative.services[0].reviewEvidence[0].judgment.authoritative = false;
  assert.throws(() => parseAndValidateWriter1Output(valid, nonAuthoritative), /non-authoritative/u);
});

const realSealed = validateSealed(process.cwd());
const realProjection = writer1Projection(realSealed);
const realSpring = realProjection.foldedSupport.find((entry: Record<string, any>) => entry.id === "garage-door-spring-replacement");
const realSpringReview = realSpring.reviewEvidence.find((entry: Record<string, any>) => entry.review.id === springReplacementReviewId);
const realInstallationFolded = realProjection.foldedSupport.find((entry: Record<string, any>) => entry.id === "garage-door-replacement");
const realInstallationReview = realInstallationFolded.reviewEvidence[0];

function realWriter1Output(projection: Record<string, any>, repairReview: Record<string, any> = realProjection.services[0].reviewEvidence[0], installationReview: Record<string, any> = realProjection.services[1].reviewEvidence[0]): string {
  return JSON.stringify({
    schemaVersion: "words-writer1-output/v1",
    pages: projection.services.map((service: Record<string, any>, index: number) => {
      const entry = index === 0 ? repairReview : installationReview;
      const section = `${service.page.url.slice(1)}-test-section`;
      return { type: "service", url: service.page.url, prescriptionId: service.prescriptionId, primaryKeyword: `${service.page.url.slice(1)} test`, title: "Test title", seoTitle: "Test SEO title", metaDescription: "Test meta description", h1: "Test heading", body: "Test body", sections: [{ id: section, heading: "Test section", body: "Test section body" }], reviewPlacements: [{ reviewId: entry.review.id, quote: entry.review.text.slice(0, 32), attribution: entry.review.author, provenance: { type: "review", ref: entry.review.id, placement: "test quotation", section } }] };
    }),
  });
}

test("real 360 projection preserves folded authority ledgers and only authorizes spring replacement on repair", () => {
  assert.equal(realSpring.status, "folded");
  assert.equal(realSpring.canonicalServiceId, "garage-door-repair");
  assert.equal(realSpring.foldedInto, "garage-door-repair");
  assert.equal(realSpring.supportingEvidence.allowedParentCanonicalId, "garage-door-repair");
  assert.ok(realSpring.directEvidenceReviewIds.includes(springReplacementReviewId));
  assert.ok(realSpring.supportingEvidence.reviewIds.includes(springReplacementReviewId));
  assert.deepEqual(realSpringReview.judgment, { id: springReplacementReviewId, decision: "anchor", authoritative: true, grade: "anchor", directCompletedService: true });
  assert.doesNotThrow(() => parseAndValidateWriter1Output(realWriter1Output(realProjection, realSpringReview), realProjection));
  assert.throws(() => parseAndValidateWriter1Output(realWriter1Output(realProjection, realSpringReview, realSpringReview), realProjection), /Spring-replacement|unapproved/u);
  assert.doesNotThrow(() => parseAndValidateWriter1Output(realWriter1Output(realProjection, realProjection.services[0].reviewEvidence[0], realInstallationReview), realProjection));
  assert.throws(() => parseAndValidateWriter1Output(realWriter1Output(realProjection, realInstallationReview, realInstallationReview), realProjection), /unapproved|wrong route/u);
});

test("a folded entry may authorize direct evidence without supportingEvidence, but never a passed-over home-breadth entry", () => {
  const directOnly = structuredClone(realProjection) as Record<string, any>;
  delete directOnly.foldedSupport.find((entry: Record<string, any>) => entry.id === realSpring.id).supportingEvidence;
  assert.doesNotThrow(() => parseAndValidateWriter1Output(realWriter1Output(directOnly, realSpringReview), directOnly));
  const passedOver = structuredClone(realProjection) as Record<string, any>;
  const openerReview = { ...realSpringReview, review: { ...realSpringReview.review, id: "opener-passed-over-review" } };
  passedOver.sealedRefs.push("opener-passed-over-review");
  passedOver.foldedSupport.push({ ...realSpring, id: "garage-door-opener-installation", status: "passed-over", canonicalServiceId: "home-breadth", foldedInto: "home-breadth", directEvidenceReviewIds: ["opener-passed-over-review"], reviewEvidence: [openerReview] });
  assert.throws(() => parseAndValidateWriter1Output(realWriter1Output(passedOver, realProjection.services[0].reviewEvidence[0], openerReview), passedOver), /unapproved|wrong route/u);
});

test("real folded guards reject status, folded target, parent, ledger, and arbitrary sealed mismatches", () => {
  for (const mutation of [
    { status: "passed-over" },
    { foldedInto: "garage-door-installation" },
    { supportingEvidence: { ...realSpring.supportingEvidence, allowedParentCanonicalId: "garage-door-installation" } },
    { supportingEvidence: { ...realSpring.supportingEvidence, reviewIds: [] } },
  ]) {
    const mutated = structuredClone(realProjection) as Record<string, any>;
    Object.assign(mutated.foldedSupport.find((entry: Record<string, any>) => entry.id === realSpring.id), mutation);
    assert.throws(() => parseAndValidateWriter1Output(realWriter1Output(mutated, realSpringReview), mutated), /unapproved/u);
  }
  assert.throws(() => parseAndValidateWriter1Output(realWriter1Output(realProjection, realInstallationReview), realProjection), /unapproved/u);
});

test("real supporting and not-applicable reviews cannot become quoted proof", () => {
  const handoff = realSealed.handoff as Record<string, any>;
  const rejected = (handoff.reviewInventory.classification.reviews as Record<string, any>[]).filter((entry) => ["supporting", "not-applicable"].includes(entry.grade)).slice(0, 2);
  assert.equal(rejected.length, 2);
  for (const candidate of rejected) {
    const evidence = { review: { id: candidate.id, author: candidate.sourceReview.author, text: candidate.sourceReview.text }, judgment: { id: candidate.id, decision: candidate.authoritativeJudgment.decision, authoritative: candidate.authoritativeJudgment.authoritative, grade: candidate.grade, directCompletedService: candidate.authoritativeJudgment.directCompletedService } };
    const injected = structuredClone(realProjection) as Record<string, any>;
    injected.services[0].reviewEvidence.push(evidence);
    injected.sealedRefs.push(candidate.id);
    assert.throws(() => parseAndValidateWriter1Output(realWriter1Output(injected, evidence), injected), /unapproved|non-authoritative|non-direct/u);
  }
});

test("quarantined 360 Writer1 bytes fail only the reviewEvidence pointer-ledger gate, then normalize losslessly", () => {
  const rawBytes = readFileSync(quarantinedWriter1Path);
  const metadata = JSON.parse(readFileSync(quarantinedWriter1MetadataPath, "utf8")) as Record<string, any>;
  assert.equal(sha256(rawBytes), metadata.artifactByteDigest);
  assert.equal(metadata.consumable, false);
  assert.equal(metadata.approved, false);
  const raw = rawBytes.toString("utf8");
  const errors = collectWriter1ValidationDiagnostics(raw, realProjection);
  assert.ok(errors.length > 0);
  assert.ok(errors.every((error) => error.code === "REVIEW_EVIDENCE_CLAIM_TEXT_DUPLICATE"));
  assert.equal(errors[0]?.expectedRule, "reviewEvidence must not contain any accepted word-bearing key; it is a typed pointer ledger");
  assert.equal(errors[0]?.path, "/pages/0/reviewEvidence/0/reviewer");
  assert.throws(() => parseAndValidateWriter1Output(raw, realProjection), /word-bearing|typed pointer ledger/u);
  assert.throws(() => parseAndValidateFreshWriter1Output(JSON.parse(raw), realProjection), /word-bearing|typed pointer ledger/u);
  const parsed = JSON.parse(raw) as Record<string, any>;
  const repairQuote = parsed.pages[0].reviewPlacements[0].quote;
  const installQuote = parsed.pages[1].reviewPlacements[0].quote;
  const normalized = normalizeWriter1PointerLedger(parsed);
  assert.equal(normalized.removed.length, 62);
  assert.equal(normalized.removed.filter((entry) => entry.key === "reviewer").length, 31);
  assert.equal(normalized.removed.filter((entry) => entry.key === "excerpt").length, 31);
  assert.equal(writer1SemanticRenderedCopyDigest(parsed), writer1SemanticRenderedCopyDigest(normalized.output));
  assert.equal(writer1StableIdentityDigest(parsed), writer1StableIdentityDigest(normalized.output));
  assert.equal(writer1ProvenanceMetadataDigest(parsed), writer1ProvenanceMetadataDigest(normalized.output));
  const validated = parseAndValidateWriter1Output(JSON.stringify(normalized.output), realProjection);
  assert.equal(validated.pages[0].reviewPlacements[0].quote, repairQuote);
  assert.equal(validated.pages[1].reviewPlacements[0].quote, installQuote);
  for (const page of validated.pages) {
    for (const item of page.reviewEvidence) {
      assert.equal("excerpt" in item, false);
      assert.equal("reviewer" in item, false);
      assert.equal("quote" in item, false);
    }
  }
  assert.deepEqual(validated.pages.map((page: Record<string, any>) => page.url), ["/garage-door-repair", "/garage-door-installation"]);
  assert.equal(sha256(readFileSync(quarantinedWriter1Path)), metadata.artifactByteDigest);
});
