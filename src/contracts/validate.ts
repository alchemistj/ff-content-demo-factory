import {
  LANE_A_HANDOFF_VERSION,
  type ApprovedProspectHandoff,
  type EvidenceKind,
  type EvidenceRef,
  type ProspectContract,
  type ReviewRecord,
} from "./types.js";
import { ContractValidationError, type ContractIssue } from "./errors.js";

const ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FORBIDDEN_SUMMARY_KEYS = new Set([
  "themes",
  "topFive",
  "topFiveReviews",
  "themeSummary",
  "reviewSummary",
]);

type AnyRecord = Record<string, unknown>;
type IdRegistry = Map<string, string>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function add(issues: ContractIssue[], code: ContractIssue["code"], path: string, message: string): void {
  issues.push({ code, path, message });
}

function record(value: unknown, path: string, issues: ContractIssue[]): AnyRecord {
  if (!isRecord(value)) {
    add(issues, "INVALID_OBJECT", path, "expected a non-null object");
    return {};
  }
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_SUMMARY_KEYS.has(key)) {
      add(issues, "SUMMARY_FORBIDDEN", `${path}.${key}`, "themes/top-five review summaries are not part of the complete inventory contract");
    }
  }
  return value;
}

function requiredString(obj: AnyRecord, key: string, path: string, issues: ContractIssue[]): string {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    add(issues, "MISSING_REQUIRED_FIELD", `${path}.${key}`, "required non-empty string");
    return "";
  }
  return value;
}

function rejectUnknownPlaceholder(value: string, path: string, issues: ContractIssue[]): void {
  if (/^(?:not supplied|unknown|n\/?a|tbd|to be supplied|placeholder)(?:\b|\s)/i.test(value.trim())) {
    add(issues, "INVALID_VALUE", path, "unknown NAP values must be omitted so the handoff fails closed; placeholders are not accepted");
  }
}

function requiredArray(obj: AnyRecord, key: string, path: string, issues: ContractIssue[]): unknown[] {
  const value = obj[key];
  if (!Array.isArray(value)) {
    add(issues, "MISSING_REQUIRED_FIELD", `${path}.${key}`, "required array");
    return [];
  }
  return value;
}

function nonEmptyArray(obj: AnyRecord, key: string, path: string, issues: ContractIssue[]): unknown[] {
  const value = requiredArray(obj, key, path, issues);
  if (value.length === 0) {
    add(issues, "MISSING_REQUIRED_FIELD", `${path}.${key}`, "must contain at least one item");
  }
  return value;
}

function validateDate(value: unknown, path: string, issues: ContractIssue[]): void {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    add(issues, "INVALID_DATE", path, "expected an ISO calendar date (YYYY-MM-DD)");
    return;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    add(issues, "INVALID_DATE", path, "date is not a real calendar date");
  }
}

function validateUrl(value: unknown, path: string, issues: ContractIssue[]): void {
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

function registerId(value: unknown, path: string, registry: IdRegistry, issues: ContractIssue[]): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    add(issues, "MALFORMED_ID", path, "stable ID must be lowercase kebab-case (for example, review-001)");
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

function validateStringArray(value: unknown, path: string, issues: ContractIssue[]): void {
  if (!Array.isArray(value)) {
    add(issues, "MISSING_REQUIRED_FIELD", path, "required array of strings");
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== "string" || item.trim() === "") {
      add(issues, "INVALID_VALUE", `${path}[${index}]`, "must be a non-empty string");
    }
  });
}

function validatePageSuitability(value: unknown, path: string, issues: ContractIssue[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    add(issues, "MISSING_REQUIRED_FIELD", path, "every review requires page-specific suitability records");
    return;
  }
  value.forEach((raw, index) => {
    const itemPath = `${path}[${index}]`;
    const item = record(raw, itemPath, issues);
    requiredString(item, "pageId", itemPath, issues);
    const suitability = requiredString(item, "suitability", itemPath, issues);
    if (!["high", "medium", "low", "not_suitable"].includes(suitability)) {
      add(issues, "INVALID_VALUE", `${itemPath}.suitability`, "unsupported page-specific suitability");
    }
    requiredString(item, "reason", itemPath, issues);
  });
}

function validateEvidenceRef(value: unknown, path: string, issues: ContractIssue[]): EvidenceRef | null {
  const item = record(value, path, issues);
  const kind = requiredString(item, "kind", path, issues);
  const refId = requiredString(item, "refId", path, issues);
  if (!["confirmed_fact", "site_evidence", "image", "review"].includes(kind)) {
    add(issues, "INVALID_VALUE", `${path}.kind`, "unsupported evidence kind");
  }
  return { kind: kind as EvidenceKind, refId };
}

function validateEvidenceRefs(value: unknown, path: string, issues: ContractIssue[]): EvidenceRef[] {
  if (!Array.isArray(value)) {
    add(issues, "MISSING_REQUIRED_FIELD", path, "required array of evidence references");
    return [];
  }
  return value.map((item, index) => validateEvidenceRef(item, `${path}[${index}]`, issues)).filter((item): item is EvidenceRef => item !== null);
}

function validateAddress(value: unknown, path: string, issues: ContractIssue[]): void {
  const item = record(value, path, issues);
  for (const field of ["street", "city", "region", "postalCode", "country"]) {
    const fieldValue = requiredString(item, field, path, issues);
    if (fieldValue) rejectUnknownPlaceholder(fieldValue, `${path}.${field}`, issues);
  }
}

function validateBusiness(value: unknown, path: string, issues: ContractIssue[]): void {
  const item = record(value, path, issues);
  for (const field of ["name", "trade", "serviceArea"]) requiredString(item, field, path, issues);
  if (item.legalName !== undefined && (typeof item.legalName !== "string" || item.legalName.trim() === "")) {
    add(issues, "INVALID_VALUE", `${path}.legalName`, "optional legalName must be a non-empty string when present");
  }
}

function validateNap(value: unknown, path: string, issues: ContractIssue[]): void {
  const item = record(value, path, issues);
  const name = requiredString(item, "name", path, issues);
  if (name) rejectUnknownPlaceholder(name, `${path}.name`, issues);
  validateAddress(item.address, `${path}.address`, issues);
  const phone = requiredString(item, "phone", path, issues);
  if (phone) rejectUnknownPlaceholder(phone, `${path}.phone`, issues);
  const website = requiredString(item, "website", path, issues);
  if (website) rejectUnknownPlaceholder(website, `${path}.website`, issues);
  validateUrl(website, `${path}.website`, issues);
}

function validateConfirmedFacts(value: unknown, path: string, registry: IdRegistry, issues: ContractIssue[]): void {
  const facts = nonEmptyArray({ facts: value }, "facts", path, issues);
  facts.forEach((raw, index) => {
    const itemPath = `${path}[${index}]`;
    const item = record(raw, itemPath, issues);
    registerId(item.id, `${itemPath}.id`, registry, issues);
    requiredString(item, "fact", itemPath, issues);
    validateEvidenceRefs(item.evidence, `${itemPath}.evidence`, issues);
    validateDate(item.confirmedAt, `${itemPath}.confirmedAt`, issues);
  });
}

function validateSiteEvidence(value: unknown, path: string, registry: IdRegistry, issues: ContractIssue[]): void {
  const entries = nonEmptyArray({ entries: value }, "entries", path, issues);
  entries.forEach((raw, index) => {
    const itemPath = `${path}[${index}]`;
    const item = record(raw, itemPath, issues);
    registerId(item.id, `${itemPath}.id`, registry, issues);
    const url = requiredString(item, "url", itemPath, issues);
    validateUrl(url, `${itemPath}.url`, issues);
    requiredString(item, "pageType", itemPath, issues);
    requiredString(item, "observation", itemPath, issues);
    validateDate(item.capturedAt, `${itemPath}.capturedAt`, issues);
    requiredString(item, "source", itemPath, issues);
  });
}

function validateImageRefs(value: unknown, path: string, registry: IdRegistry, issues: ContractIssue[]): void {
  const entries = requiredArray({ entries: value }, "entries", path, issues);
  entries.forEach((raw, index) => {
    const itemPath = `${path}[${index}]`;
    const item = record(raw, itemPath, issues);
    registerId(item.id, `${itemPath}.id`, registry, issues);
    const url = requiredString(item, "url", itemPath, issues);
    validateUrl(url, `${itemPath}.url`, issues);
    requiredString(item, "altText", itemPath, issues);
    requiredString(item, "source", itemPath, issues);
    requiredString(item, "evidenceUse", itemPath, issues);
  });
}

function validateReview(value: unknown, path: string, registry: IdRegistry, issues: ContractIssue[]): ReviewRecord | null {
  const item = record(value, path, issues);
  const id = registerId(item.id, `${path}.id`, registry, issues);
  requiredString(item, "reviewer", path, issues);
  requiredString(item, "exactText", path, issues);
  if (typeof item.rating !== "number" || !Number.isInteger(item.rating) || item.rating < 1 || item.rating > 5) {
    add(issues, "INVALID_VALUE", `${path}.rating`, "rating must be an integer from 1 through 5");
  }
  if (item.date !== undefined) validateDate(item.date, `${path}.date`, issues);

  const provenance = record(item.provenance, `${path}.provenance`, issues);
  const sourceType = requiredString(provenance, "sourceType", `${path}.provenance`, issues);
  if (!["customer_review", "company_testimonial", "business_profile", "user_brief", "other"].includes(sourceType)) {
    add(issues, "INVALID_VALUE", `${path}.provenance.sourceType`, "unsupported review provenance source type");
  }
  const sourceUrl = requiredString(provenance, "sourceUrl", `${path}.provenance`, issues);
  validateUrl(sourceUrl, `${path}.provenance.sourceUrl`, issues);
  validateDate(provenance.capturedAt, `${path}.provenance.capturedAt`, issues);
  requiredString(provenance, "sourceLabel", `${path}.provenance`, issues);

  const classification = requiredString(item, "classification", path, issues);
  if (!["positive", "negative", "mixed", "neutral"].includes(classification)) {
    add(issues, "INVALID_VALUE", `${path}.classification`, "unsupported review classification");
  }
  validateStringArray(item.serviceTopicSignals, `${path}.serviceTopicSignals`, issues);
  validateStringArray(item.concreteWorkSignals, `${path}.concreteWorkSignals`, issues);
  validateStringArray(item.negatives, `${path}.negatives`, issues);
  validatePageSuitability(item.pageSuitability, `${path}.pageSuitability`, issues);
  const suitability = requiredString(item, "suitability", path, issues);
  if (!["high", "medium", "low", "not_suitable"].includes(suitability)) {
    add(issues, "INVALID_VALUE", `${path}.suitability`, "unsupported review suitability");
  }
  const authority = requiredString(item, "upstreamAuthorityJudgment", path, issues);
  if (!["authoritative", "partially_authoritative", "not_authoritative", "unknown"].includes(authority)) {
    add(issues, "INVALID_VALUE", `${path}.upstreamAuthorityJudgment`, "unsupported upstream authority judgment");
  }

  const negatives = Array.isArray(item.negatives) ? item.negatives : [];
  if (classification === "positive" && (negatives.length > 0 || item.rating === 1 || item.rating === 2)) {
    add(issues, "NEGATIVE_AS_POSITIVE", path, "positive classification conflicts with explicit negatives or a 1–2 rating");
  }
  return {
    ...(item as unknown as ReviewRecord),
    id,
  };
}

function validateReviewInventory(value: unknown, path: string, registry: IdRegistry, issues: ContractIssue[]): Map<string, ReviewRecord> {
  const entries = nonEmptyArray({ entries: value }, "entries", path, issues);
  const reviews = new Map<string, ReviewRecord>();
  entries.forEach((raw, index) => {
    const review = validateReview(raw, `${path}[${index}]`, registry, issues);
    if (review && review.id) reviews.set(review.id, review);
  });
  return reviews;
}

function validateDestination(value: unknown, path: string, registry: IdRegistry, issues: ContractIssue[], requireLabelPurpose = true): void {
  const item = record(value, path, issues);
  registerId(item.id, `${path}.id`, registry, issues);
  const url = requiredString(item, "url", path, issues);
  validateUrl(url, `${path}.url`, issues);
  if (requireLabelPurpose) {
    requiredString(item, "label", path, issues);
    requiredString(item, "purpose", path, issues);
  }
}

function validatePagePrescription(value: unknown, path: string, registry: IdRegistry, reviewInventory: Map<string, ReviewRecord>, knownIds: Set<string>, issues: ContractIssue[], gradeRequired: boolean, labelPurposeRequired = true): void {
  const item = record(value, path, issues);
  validateDestination(item, path, registry, issues, labelPurposeRequired);
  const pageId = typeof item.id === "string" ? item.id : "";
  for (const field of ["keyword", "titleH1Direction", "angleCustomerDecision", "inclusionReason", "recommendedFirstReviewReason"]) {
    requiredString(item, field, path, issues);
  }
  const evidence = validateEvidenceRefs(item.majorEvidence, `${path}.majorEvidence`, issues);
  if (evidence.length === 0) add(issues, "MISSING_REQUIRED_FIELD", `${path}.majorEvidence`, "must contain at least one evidence reference");
  const recommended = requiredString(item, "recommendedFirstReview", path, issues);
  if (recommended && !reviewInventory.has(recommended)) {
    add(issues, "RECOMMENDED_REVIEW_NOT_FOUND", `${path}.recommendedFirstReview`, `review ID ${recommended} is not present in the complete review inventory`);
  }
  if (recommended) {
    const review = reviewInventory.get(recommended);
    if (review && (review.classification === "negative" || review.rating <= 2 || review.suitability === "not_suitable")) {
      add(issues, "RECOMMENDED_REVIEW_INCONSISTENT", `${path}.recommendedFirstReview`, "first-review recommendation points to evidence that cannot be presented as positive service proof");
      add(issues, "NEGATIVE_AS_POSITIVE", `${path}.recommendedFirstReview`, "negative or unsuitable review cannot be the recommended first review");
    }
    const pageSuitability = review?.pageSuitability?.find((entry) => entry.pageId === pageId);
    if (review && pageSuitability?.suitability === "not_suitable") {
      add(issues, "RECOMMENDED_REVIEW_INCONSISTENT", `${path}.recommendedFirstReview`, `review ${recommended} is marked not_suitable for page ${pageId}`);
      add(issues, "NEGATIVE_AS_POSITIVE", `${path}.recommendedFirstReview`, "a review marked not_suitable for this page cannot be recommended as its first review");
    }
  }
  validateStringArray(item.traps, `${path}.traps`, issues);
  validateStringArray(item.siblingOverlapBoundaries, `${path}.siblingOverlapBoundaries`, issues);
  if (gradeRequired && (typeof item.reviewGrade !== "string" || !["A", "B", "C"].includes(item.reviewGrade))) {
    add(issues, "UNSUPPORTED_REVIEW_GRADE", `${path}.reviewGrade`, "review grade must be exactly A, B, or C");
  } else if (!gradeRequired && item.reviewGrade !== undefined && (typeof item.reviewGrade !== "string" || !["A", "B", "C"].includes(item.reviewGrade))) {
    add(issues, "UNSUPPORTED_REVIEW_GRADE", `${path}.reviewGrade`, "optional contact review grade must be A, B, or C when present");
  }
  for (const ref of evidence) {
    if (ref.refId && !knownIds.has(ref.refId)) {
      add(issues, "EVIDENCE_REF_NOT_FOUND", `${path}.majorEvidence`, `evidence ID ${ref.refId} is not declared in this handoff`);
    } else if (ref.refId && ref.kind === "review" && !reviewInventory.has(ref.refId)) {
      add(issues, "EVIDENCE_KIND_MISMATCH", `${path}.majorEvidence`, `review evidence ID ${ref.refId} is not a review record`);
    }
  }
}

function validatePageSuitabilityAgainstPages(value: unknown, path: string, reviewInventory: Map<string, ReviewRecord>, servicePageIds: readonly string[], issues: ContractIssue[]): void {
  if (!Array.isArray(value)) return;
  value.forEach((raw, index) => {
    if (!isRecord(raw) || typeof raw.id !== "string") return;
    const review = reviewInventory.get(raw.id);
    if (!review) return;
    const entries = Array.isArray(raw.pageSuitability) ? raw.pageSuitability : [];
    const seen = new Set<string>();
    entries.forEach((entry, entryIndex) => {
      if (!isRecord(entry) || typeof entry.pageId !== "string") return;
      if (seen.has(entry.pageId)) add(issues, "PAGE_SUITABILITY_INCONSISTENT", `${path}[${index}].pageSuitability[${entryIndex}].pageId`, `duplicate page suitability for ${entry.pageId}`);
      seen.add(entry.pageId);
      if (!servicePageIds.includes(entry.pageId)) add(issues, "PAGE_SUITABILITY_INCONSISTENT", `${path}[${index}].pageSuitability[${entryIndex}].pageId`, `page ${entry.pageId} is not one of the prescribed service pages`);
    });
    for (const pageId of servicePageIds) {
      if (!seen.has(pageId)) add(issues, "PAGE_SUITABILITY_INCONSISTENT", `${path}[${index}].pageSuitability`, `review ${raw.id} is missing suitability for page ${pageId}`);
    }
  });
}

function validateDestinations(value: unknown, path: string, registry: IdRegistry, reviewInventory: Map<string, ReviewRecord>, knownIds: Set<string>, issues: ContractIssue[]): void {
  const item = record(value, path, issues);
  validatePagePrescription(item.homepage, `${path}.homepage`, registry, reviewInventory, knownIds, issues, true);
  validatePagePrescription(item.contact, `${path}.contact`, registry, reviewInventory, knownIds, issues, false);
  const homepageUrl = isRecord(item.homepage) && typeof item.homepage.url === "string" ? item.homepage.url : "";
  if (homepageUrl) {
    try {
      if (new URL(homepageUrl).pathname !== "/home") add(issues, "ROUTING_BOUNDARY", `${path}.homepage.url`, "business Home/logo must use the /home route");
    } catch { /* validateDestination reports the URL error */ }
  }
  for (const key of ["header", "footer"]) {
    const entries = nonEmptyArray(item, key, path, issues);
    entries.forEach((entry, index) => {
      validateDestination(entry, `${path}.${key}[${index}]`, registry, issues);
      if (isRecord(entry) && typeof entry.url === "string") {
        try {
          if (new URL(entry.url).pathname === "/") add(issues, "ROUTING_BOUNDARY", `${path}.${key}[${index}].url`, "ordinary header/footer navigation must not use the Strategy Overview / route as business Home");
        } catch { /* validateDestination reports the URL error */ }
      }
    });
  }
  const strategy = record(item.strategy, `${path}.strategy`, issues);
  const strategyUrl = requiredString(strategy, "url", `${path}.strategy`, issues);
  validateUrl(strategyUrl, `${path}.strategy.url`, issues);
  if (strategyUrl) {
    try {
      if (new URL(strategyUrl).pathname !== "/") add(issues, "ROUTING_BOUNDARY", `${path}.strategy.url`, "Strategy Overview must use the / route");
    } catch { /* validateDestination reports the URL error */ }
  }
  for (const field of ["label", "decisionPath", "rationale"]) requiredString(strategy, field, `${path}.strategy`, issues);

  const pages = item.servicePages;
  if (!Array.isArray(pages) || pages.length !== 2) {
    add(issues, "SERVICE_PAGE_COUNT", `${path}.servicePages`, "exactly two prescribed service pages are required");
  }
  const pageUrls = new Set<string>();
  (Array.isArray(pages) ? pages : []).forEach((page, index) => {
    validatePagePrescription(page, `${path}.servicePages[${index}]`, registry, reviewInventory, knownIds, issues, true, false);
    if (isRecord(page) && typeof page.url === "string") {
      if (pageUrls.has(page.url)) add(issues, "INVALID_VALUE", `${path}.servicePages[${index}].url`, "service page URLs must be distinct");
      pageUrls.add(page.url);
    }
  });
  const prescribedPageIds = [
    isRecord(item.homepage) && typeof item.homepage.id === "string" ? item.homepage.id : "",
    isRecord(item.contact) && typeof item.contact.id === "string" ? item.contact.id : "",
    ...(Array.isArray(pages) ? pages : []).filter(isRecord).map((page) => typeof page.id === "string" ? page.id : ""),
  ].filter(Boolean);
  validatePageSuitabilityAgainstPages(Array.from(reviewInventory.values()), `${path}.reviewInventory`, reviewInventory, prescribedPageIds, issues);
}

function validateProspect(value: unknown, path: string, issues: ContractIssue[]): ProspectContract | null {
  const item = record(value, path, issues);
  const registry: IdRegistry = new Map();
  registerId(item.id, `${path}.id`, registry, issues);
  validateBusiness(item.business, `${path}.business`, issues);
  validateNap(item.nap, `${path}.nap`, issues);
  validateConfirmedFacts(item.confirmedFacts, `${path}.confirmedFacts`, registry, issues);
  validateSiteEvidence(item.siteEvidence, `${path}.siteEvidence`, registry, issues);
  validateImageRefs(item.imageRefs, `${path}.imageRefs`, registry, issues);
  const reviewInventory = validateReviewInventory(item.reviewInventory, `${path}.reviewInventory`, registry, issues);
  const knownIds = new Set(registry.keys());
  for (const fact of Array.isArray(item.confirmedFacts) ? item.confirmedFacts : []) {
    if (!isRecord(fact) || !Array.isArray(fact.evidence)) continue;
    fact.evidence.forEach((raw, index) => {
      const ref = validateEvidenceRef(raw, `${path}.confirmedFacts.evidence[${index}]`, issues);
      if (ref && ref.refId && !knownIds.has(ref.refId)) add(issues, "EVIDENCE_REF_NOT_FOUND", `${path}.confirmedFacts.evidence[${index}]`, `evidence ID ${ref.refId} is not declared in this handoff`);
    });
  }
  validateDestinations(item.destinations, `${path}.destinations`, registry, reviewInventory, knownIds, issues);
  return item as unknown as ProspectContract;
}

/** Validate and return a single approved prospect handoff. Throws on any issue. */
export function parseApprovedProspectHandoff(input: unknown): ApprovedProspectHandoff {
  const issues: ContractIssue[] = [];
  const root = record(input, "$", issues);
  if ("prospects" in root) {
    add(issues, "ONE_PROSPECT_ONLY", "$.prospects", "handoff must carry one prospect in $.prospect, not a prospect list");
  }
  if (root.version !== LANE_A_HANDOFF_VERSION) {
    add(issues, "INVALID_VALUE", "$.version", `version must be ${LANE_A_HANDOFF_VERSION}`);
  }
  const approval = record(root.approval, "$.approval", issues);
  if (approval.status !== "approved") add(issues, "INVALID_VALUE", "$.approval.status", "only approved prospects may enter the handoff");
  validateDate(approval.approvedAt, "$.approval.approvedAt", issues);
  requiredString(approval, "approvedBy", "$.approval", issues);
  const prospect = parseProspectOnly(root.prospect, "$.prospect", issues);
  if (issues.length) throw new ContractValidationError(issues);
  return { version: LANE_A_HANDOFF_VERSION, approval: approval as unknown as ApprovedProspectHandoff["approval"], prospect: prospect as ProspectContract };
}

function parseProspectOnly(value: unknown, path: string, issues: ContractIssue[]): ProspectContract | null {
  if (Array.isArray(value)) {
    add(issues, "ONE_PROSPECT_ONLY", path, "expected exactly one prospect object, not an array");
    return null;
  }
  return validateProspect(value, path, issues);
}

export function assertApprovedProspectHandoff(input: unknown): asserts input is ApprovedProspectHandoff {
  parseApprovedProspectHandoff(input);
}

export function validateApprovedProspectHandoff(input: unknown): readonly ContractIssue[] {
  try {
    parseApprovedProspectHandoff(input);
    return [];
  } catch (error: unknown) {
    if (error instanceof ContractValidationError) return error.issues;
    throw error;
  }
}
