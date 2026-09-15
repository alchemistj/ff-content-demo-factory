import { HandoffValidationError, type HandoffIssue, type HandoffIssueCode } from "./errors.js";
import {
  APPROVED_PLAN_VERSION,
  PROPOSED_PRESCRIPTION_VERSION,
  RESEARCH_RECORD_VERSION,
  WRITER_CONTEXT_VERSION,
  type ApprovedDecisions,
  type ApprovedPlan,
  type EvidencePacket,
  type ProposedPrescription,
  type Recommendation,
  type RecommendationSet,
  type ResearchRecord,
  type ReviewRecord,
  type SourceRef,
  type WriterContext,
} from "./types.js";

const ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ADVISORY_LANGUAGE =
  /\b(may|might|could|consider|useful direction|one option|optionally)\b/i;
const LOCKED_LANGUAGE =
  /\b(the writer must|must use|shall use|required to use|do not omit this review|locked decision)\b/i;
const FORBIDDEN_SUMMARY_KEYS = new Set(["themes", "topFive", "topFiveReviews", "themeSummary", "reviewSummary"]);
const PAGE_TYPES = new Set(["homepage", "service", "contact", "strategy", "chrome"]);
const FACT_STATUSES = new Set(["confirmed", "inference"]);
const RECOMMENDATION_KINDS = new Set([
  "observation",
  "differentiator",
  "customer_language",
  "review_use",
  "angle",
  "section",
  "emphasis",
]);

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function add(issues: HandoffIssue[], code: HandoffIssueCode, path: string, message: string): void {
  issues.push({ code, path, message });
}

function record(value: unknown, path: string, issues: HandoffIssue[]): AnyRecord {
  if (!isRecord(value)) {
    add(issues, "INVALID_OBJECT", path, "expected a non-null object");
    return {};
  }
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_SUMMARY_KEYS.has(key)) {
      add(
        issues,
        "INVALID_VALUE",
        `${path}.${key}`,
        "themes/top-five summaries are not part of the evidence contract; carry the original inventory",
      );
    }
  }
  return value;
}

function requiredString(obj: AnyRecord, key: string, path: string, issues: HandoffIssue[]): string {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    add(issues, "MISSING_REQUIRED_FIELD", `${path}.${key}`, "required non-empty string");
    return "";
  }
  return value;
}

function requiredArray(obj: AnyRecord, key: string, path: string, issues: HandoffIssue[]): unknown[] {
  const value = obj[key];
  if (!Array.isArray(value)) {
    add(issues, "MISSING_REQUIRED_FIELD", `${path}.${key}`, "required array");
    return [];
  }
  return value;
}

function validateDate(value: unknown, path: string, issues: HandoffIssue[]): void {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    add(issues, "INVALID_DATE", path, "expected an ISO calendar date (YYYY-MM-DD)");
    return;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    add(issues, "INVALID_DATE", path, "date is not a real calendar date");
  }
}

function validateUrl(value: unknown, path: string, issues: HandoffIssue[]): void {
  if (typeof value !== "string" || value.trim() === "") {
    add(issues, "INVALID_URL", path, "expected an absolute http(s) URL");
    return;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      add(issues, "INVALID_URL", path, "URL protocol must be http or https");
    }
  } catch {
    add(issues, "INVALID_URL", path, "expected an absolute http(s) URL");
  }
}

function registerId(value: unknown, path: string, registry: Map<string, string>, issues: HandoffIssue[]): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    add(issues, "MALFORMED_ID", path, "stable ID must be lowercase kebab-case");
    return "";
  }
  const previous = registry.get(value);
  if (previous) {
    add(issues, "DUPLICATE_ID", path, `ID ${value} was already declared at ${previous}`);
  } else {
    registry.set(value, path);
  }
  return value;
}

function collectEvidenceIds(evidence: EvidencePacket): Set<string> {
  const ids = new Set<string>([evidence.prospectId]);
  for (const fact of evidence.facts) ids.add(fact.id);
  for (const site of evidence.siteEvidence) ids.add(site.id);
  for (const image of evidence.imageRefs) ids.add(image.id);
  for (const review of evidence.reviews) ids.add(review.id);
  return ids;
}

function validateSourceRefs(
  value: unknown,
  path: string,
  knownIds: Set<string> | null,
  issues: HandoffIssue[],
): void {
  if (!Array.isArray(value)) {
    add(issues, "MISSING_REQUIRED_FIELD", path, "required array of source references");
    return;
  }
  value.forEach((raw, index) => {
    const itemPath = `${path}[${index}]`;
    const item = record(raw, itemPath, issues);
    requiredString(item, "kind", itemPath, issues);
    const refId = requiredString(item, "refId", itemPath, issues);
    if (knownIds && refId && !knownIds.has(refId)) {
      add(issues, "SOURCE_REF_NOT_FOUND", `${itemPath}.refId`, `source ID ${refId} is not in this evidence packet`);
    }
  });
}

function lockedDecisionKeys(obj: AnyRecord, path: string, issues: HandoffIssue[]): void {
  const leaked = [
    "recommendedFirstReview",
    "recommendedFirstReviewReason",
    "requiredReviews",
    "mandatoryAngle",
    "lockedSuggestions",
  ].filter((key) => key in obj);
  for (const key of leaked) {
    add(
      issues,
      "LOCKED_DECISION_LEAK",
      `${path}.${key}`,
      "page-plan approval must not absorb editorial recommendations as locked decisions",
    );
  }
}

export function assertAdvisoryRecommendationText(text: string, path: string, issues: HandoffIssue[]): void {
  if (!ADVISORY_LANGUAGE.test(text)) {
    add(
      issues,
      "ADVISORY_LANGUAGE_REQUIRED",
      path,
      'recommendations must use may-language such as "You may consider…", "This review may support…", or "One useful direction could be…"',
    );
  }
  if (LOCKED_LANGUAGE.test(text)) {
    add(
      issues,
      "ADVISORY_LANGUAGE_REQUIRED",
      path,
      "recommendations must not instruct a later stage that it must follow the suggestion",
    );
  }
}

function validateRecommendation(
  value: unknown,
  path: string,
  knownIds: Set<string>,
  issues: HandoffIssue[],
): void {
  const item = record(value, path, issues);
  registerId(item.id, `${path}.id`, new Map(), issues);
  const kind = requiredString(item, "kind", path, issues);
  if (kind && !RECOMMENDATION_KINDS.has(kind)) {
    add(issues, "INVALID_VALUE", `${path}.kind`, "unsupported recommendation kind");
  }
  if (item.stance !== "advisory") {
    add(issues, "INVALID_VALUE", `${path}.stance`, 'recommendations must declare stance "advisory"');
  }
  const text = requiredString(item, "text", path, issues);
  if (text) assertAdvisoryRecommendationText(text, `${path}.text`, issues);
  requiredString(item, "reason", path, issues);
  validateSourceRefs(item.sourceRefs, `${path}.sourceRefs`, knownIds, issues);
  if (item.reviewId !== undefined) {
    if (typeof item.reviewId !== "string" || !item.reviewId.trim()) {
      add(issues, "INVALID_VALUE", `${path}.reviewId`, "optional reviewId must be a non-empty string");
    } else if (!knownIds.has(item.reviewId)) {
      add(issues, "SOURCE_REF_NOT_FOUND", `${path}.reviewId`, `review ${item.reviewId} is not in this evidence packet`);
    }
  }
}

function validateRecommendationSet(
  value: unknown,
  path: string,
  expectedStage: "research" | "prescription",
  knownIds: Set<string>,
  issues: HandoffIssue[],
): void {
  const item = record(value, path, issues);
  if (item.stage !== expectedStage) {
    add(issues, "INVALID_VALUE", `${path}.stage`, `expected stage "${expectedStage}"`);
  }
  const items = requiredArray(item, "items", path, issues);
  items.forEach((raw, index) => validateRecommendation(raw, `${path}.items[${index}]`, knownIds, issues));
}

function validateReview(value: unknown, path: string, registry: Map<string, string>, issues: HandoffIssue[]): void {
  const item = record(value, path, issues);
  registerId(item.id, `${path}.id`, registry, issues);
  requiredString(item, "reviewer", path, issues);
  requiredString(item, "exactText", path, issues);
  const provenance = record(item.provenance, `${path}.provenance`, issues);
  requiredString(provenance, "sourceType", `${path}.provenance`, issues);
  validateUrl(provenance.sourceUrl, `${path}.provenance.sourceUrl`, issues);
  validateDate(provenance.capturedAt, `${path}.provenance.capturedAt`, issues);
  requiredString(provenance, "sourceLabel", `${path}.provenance`, issues);
  if (item.rating !== undefined && (typeof item.rating !== "number" || !Number.isInteger(item.rating))) {
    add(issues, "INVALID_VALUE", `${path}.rating`, "optional rating must be an integer");
  }
  if (item.classification !== undefined) {
    if (!["positive", "negative", "mixed", "neutral"].includes(String(item.classification))) {
      add(issues, "INVALID_VALUE", `${path}.classification`, "unsupported classification");
    }
  }
}

export function validateEvidencePacket(value: unknown, path: string, issues: HandoffIssue[]): EvidencePacket | null {
  const item = record(value, path, issues);
  const registry = new Map<string, string>();
  registerId(item.prospectId, `${path}.prospectId`, registry, issues);
  const business = record(item.business, `${path}.business`, issues);
  for (const field of ["name", "trade", "serviceArea"] as const) {
    requiredString(business, field, `${path}.business`, issues);
  }
  const nap = record(item.nap, `${path}.nap`, issues);
  requiredString(nap, "name", `${path}.nap`, issues);
  const address = record(nap.address, `${path}.nap.address`, issues);
  for (const field of ["street", "city", "region", "postalCode", "country"] as const) {
    requiredString(address, field, `${path}.nap.address`, issues);
  }
  requiredString(nap, "phone", `${path}.nap`, issues);
  validateUrl(nap.website, `${path}.nap.website`, issues);

  const facts = requiredArray(item, "facts", path, issues);
  facts.forEach((raw, index) => {
    const factPath = `${path}.facts[${index}]`;
    const fact = record(raw, factPath, issues);
    registerId(fact.id, `${factPath}.id`, registry, issues);
    requiredString(fact, "statement", factPath, issues);
    const status = requiredString(fact, "status", factPath, issues);
    if (status && !FACT_STATUSES.has(status)) {
      add(issues, "INVALID_VALUE", `${factPath}.status`, 'status must be "confirmed" or "inference"');
    }
    validateDate(fact.capturedAt, `${factPath}.capturedAt`, issues);
    validateSourceRefs(fact.sourceRefs, `${factPath}.sourceRefs`, null, issues);
  });

  const siteEvidence = requiredArray(item, "siteEvidence", path, issues);
  siteEvidence.forEach((raw, index) => {
    const sitePath = `${path}.siteEvidence[${index}]`;
    const site = record(raw, sitePath, issues);
    registerId(site.id, `${sitePath}.id`, registry, issues);
    validateUrl(site.url, `${sitePath}.url`, issues);
    requiredString(site, "pageType", sitePath, issues);
    requiredString(site, "observation", sitePath, issues);
    validateDate(site.capturedAt, `${sitePath}.capturedAt`, issues);
    requiredString(site, "source", sitePath, issues);
  });

  const imageRefs = requiredArray(item, "imageRefs", path, issues);
  imageRefs.forEach((raw, index) => {
    const imagePath = `${path}.imageRefs[${index}]`;
    const image = record(raw, imagePath, issues);
    registerId(image.id, `${imagePath}.id`, registry, issues);
    validateUrl(image.url, `${imagePath}.url`, issues);
    requiredString(image, "altText", imagePath, issues);
    requiredString(image, "source", imagePath, issues);
    requiredString(image, "evidenceUse", imagePath, issues);
  });

  const reviews = requiredArray(item, "reviews", path, issues);
  reviews.forEach((raw, index) => validateReview(raw, `${path}.reviews[${index}]`, registry, issues));

  if (issues.length) return null;
  return item as unknown as EvidencePacket & { prospectId: string };
}

export function validatePagePlan(value: unknown, path: string, issues: HandoffIssue[]): ApprovedDecisions | null {
  const item = record(value, path, issues);
  lockedDecisionKeys(item, path, issues);
  const pageJobs = requiredArray(item, "pageJobs", path, issues);
  const jobIds = new Map<string, string>();
  const routes = new Set<string>();
  pageJobs.forEach((raw, index) => {
    const jobPath = `${path}.pageJobs[${index}]`;
    const job = record(raw, jobPath, issues);
    lockedDecisionKeys(job, jobPath, issues);
    registerId(job.pageId, `${jobPath}.pageId`, jobIds, issues);
    const pageType = requiredString(job, "pageType", jobPath, issues);
    if (pageType && !PAGE_TYPES.has(pageType)) {
      add(issues, "INVALID_VALUE", `${jobPath}.pageType`, "unsupported page type");
    }
    const route = requiredString(job, "route", jobPath, issues);
    if (route) {
      if (!route.startsWith("/")) add(issues, "INVALID_VALUE", `${jobPath}.route`, "route must be a path starting with /");
      if (pageType !== "chrome") {
        if (routes.has(route)) add(issues, "DUPLICATE_ID", `${jobPath}.route`, `duplicate route ${route}`);
        routes.add(route);
      }
    }
    requiredString(job, "job", jobPath, issues);
    requiredString(job, "targetIntent", jobPath, issues);
  });
  const routeMap = requiredArray(item, "routeMap", path, issues);
  routeMap.forEach((raw, index) => {
    const mapPath = `${path}.routeMap[${index}]`;
    const entry = record(raw, mapPath, issues);
    requiredString(entry, "pageId", mapPath, issues);
    requiredString(entry, "route", mapPath, issues);
    requiredString(entry, "pageType", mapPath, issues);
  });
  requiredString(item, "businessScope", path, issues);
  requiredArray(item, "reservedHumanDecisions", path, issues);

  const types = pageJobs
    .filter(isRecord)
    .map((job) => String(job.pageType));
  for (const required of ["homepage", "service", "contact", "strategy", "chrome"]) {
    if (!types.includes(required)) {
      add(issues, "MISSING_REQUIRED_FIELD", `${path}.pageJobs`, `page plan must include a ${required} job`);
    }
  }
  if (types.filter((type) => type === "service").length !== 2) {
    add(issues, "INVALID_VALUE", `${path}.pageJobs`, "page plan must include exactly two service page jobs");
  }

  if (issues.length) return null;
  return item as unknown as ApprovedDecisions;
}

export function parseResearchRecord(input: unknown): ResearchRecord {
  const issues: HandoffIssue[] = [];
  const root = record(input, "$", issues);
  if (root.version !== RESEARCH_RECORD_VERSION) {
    add(issues, "INVALID_VALUE", "$.version", `version must be ${RESEARCH_RECORD_VERSION}`);
  }
  requiredString(root, "prospectId", "$", issues);
  validateDate(root.completedAt, "$.completedAt", issues);
  const researcher = record(root.researcher, "$.researcher", issues);
  requiredString(researcher, "provider", "$.researcher", issues);
  requiredString(researcher, "model", "$.researcher", issues);
  const evidence = validateEvidencePacket(root.evidence, "$.evidence", issues);
  if (evidence && root.prospectId !== evidence.prospectId) {
    add(issues, "INVALID_VALUE", "$.prospectId", "research prospectId must match evidence.prospectId");
  }
  const knownIds = evidence ? collectEvidenceIds(evidence) : new Set<string>();
  validateRecommendationSet(root.recommendations, "$.recommendations", "research", knownIds, issues);
  if (issues.length) throw new HandoffValidationError(issues);
  return input as ResearchRecord;
}

export function parseProposedPrescription(input: unknown, evidence?: EvidencePacket): ProposedPrescription {
  const issues: HandoffIssue[] = [];
  const root = record(input, "$", issues);
  if (root.version !== PROPOSED_PRESCRIPTION_VERSION) {
    add(issues, "INVALID_VALUE", "$.version", `version must be ${PROPOSED_PRESCRIPTION_VERSION}`);
  }
  requiredString(root, "prospectId", "$", issues);
  requiredString(root, "rationale", "$", issues);
  requiredString(root, "evidenceFingerprint", "$", issues);
  validateDate(root.completedAt, "$.completedAt", issues);
  const prescriber = record(root.prescriber, "$.prescriber", issues);
  requiredString(prescriber, "provider", "$.prescriber", issues);
  requiredString(prescriber, "model", "$.prescriber", issues);
  validatePagePlan(root.proposedPagePlan, "$.proposedPagePlan", issues);
  const knownIds = evidence ? collectEvidenceIds(evidence) : new Set<string>();
  validateRecommendationSet(root.recommendations, "$.recommendations", "prescription", knownIds, issues);
  if (issues.length) throw new HandoffValidationError(issues);
  return input as ProposedPrescription;
}

export function parseApprovedPlan(input: unknown): ApprovedPlan {
  const issues: HandoffIssue[] = [];
  const root = record(input, "$", issues);
  if (root.version !== APPROVED_PLAN_VERSION) {
    add(issues, "INVALID_VALUE", "$.version", `version must be ${APPROVED_PLAN_VERSION}`);
  }
  requiredString(root, "prospectId", "$", issues);
  const approval = record(root.approval, "$.approval", issues);
  if (approval.status !== "approved") {
    add(issues, "INVALID_VALUE", "$.approval.status", "only an approved page plan may enter the writing assignment");
  }
  validateDate(approval.approvedAt, "$.approval.approvedAt", issues);
  requiredString(approval, "approvedBy", "$.approval", issues);
  const evidence = validateEvidencePacket(root.evidence, "$.evidence", issues);
  validatePagePlan(root.decisions, "$.decisions", issues);
  const knownIds = evidence ? collectEvidenceIds(evidence) : new Set<string>();
  validateRecommendationSet(root.researchRecommendations, "$.researchRecommendations", "research", knownIds, issues);
  validateRecommendationSet(
    root.prescriptionRecommendations,
    "$.prescriptionRecommendations",
    "prescription",
    knownIds,
    issues,
  );
  if (issues.length) throw new HandoffValidationError(issues);
  return input as ApprovedPlan;
}

export function parseWriterContext(input: unknown): WriterContext {
  const issues: HandoffIssue[] = [];
  const root = record(input, "$", issues);
  if (root.version !== WRITER_CONTEXT_VERSION) {
    add(issues, "INVALID_VALUE", "$.version", `version must be ${WRITER_CONTEXT_VERSION}`);
  }
  requiredString(root, "prospectId", "$", issues);
  const evidence = validateEvidencePacket(root.evidence, "$.evidence", issues);
  validatePagePlan(root.decisions, "$.decisions", issues);
  const knownIds = evidence ? collectEvidenceIds(evidence) : new Set<string>();
  validateRecommendationSet(root.researchRecommendations, "$.researchRecommendations", "research", knownIds, issues);
  validateRecommendationSet(
    root.prescriptionRecommendations,
    "$.prescriptionRecommendations",
    "prescription",
    knownIds,
    issues,
  );
  if (issues.length) throw new HandoffValidationError(issues);
  return input as WriterContext;
}

export function writerContextFromApprovedPlan(plan: ApprovedPlan): WriterContext {
  return {
    version: WRITER_CONTEXT_VERSION,
    prospectId: plan.prospectId,
    evidence: plan.evidence,
    decisions: plan.decisions,
    researchRecommendations: plan.researchRecommendations,
    prescriptionRecommendations: plan.prescriptionRecommendations,
  };
}

export function unclassifiedReviewsRemainAvailable(evidence: EvidencePacket): readonly ReviewRecord[] {
  return evidence.reviews;
}

export function recommendationIds(set: RecommendationSet): readonly string[] {
  return set.items.map((item) => item.id);
}

export function isAdvisoryRecommendation(item: Recommendation): boolean {
  return item.stance === "advisory";
}

export type { SourceRef };
