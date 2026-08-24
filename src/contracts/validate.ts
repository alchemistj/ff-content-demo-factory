import {
  LANE_A_HANDOFF_VERSION,
  type ApprovedProspectHandoff,
  type EvidenceKind,
  type EvidenceRef,
  type ProspectContract,
  type ReviewRecord,
} from "./types.js";
import { ContractValidationError, type ContractIssue } from "./errors.js";
import { computeHandoffDigests, digestOf, expansionOverrideDigest } from "./digests.js";
import { buildIntentLedger } from "./intent-ledger.js";
import { TRUSTED_SOURCE_IDENTITIES } from "./trusted-source.js";

const ID_PATTERN = /^(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*|[A-Za-z0-9_-]{8,})$/;
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

function validateUrl(value: unknown, path: string, issues: ContractIssue[], allowInternalRoute = false): void {
  if (typeof value !== "string" || value.trim() === "") {
    add(issues, "INVALID_URL", path, "expected an absolute http(s) URL");
    return;
  }
  if (allowInternalRoute && value.startsWith("/")) return;
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
  validateUrl(url, `${path}.url`, issues, true);
  if (requireLabelPurpose) {
    requiredString(item, "label", path, issues);
    requiredString(item, "purpose", path, issues);
  }
}

function validatePagePrescription(value: unknown, path: string, registry: IdRegistry, reviewInventory: Map<string, ReviewRecord>, knownIds: Set<string>, issues: ContractIssue[], gradeRequired: boolean, labelPurposeRequired = true): void {
  const item = record(value, path, issues);
  validateDestination(item, path, registry, issues, labelPurposeRequired);
  const pageId = typeof item.id === "string" ? item.id : "";
  for (const field of ["keyword", "titleH1Direction", "angleCustomerDecision", "inclusionReason"]) requiredString(item, field, path, issues);
  if (gradeRequired) requiredString(item, "recommendedFirstReviewReason", path, issues);
  else if (item.recommendedFirstReviewReason !== undefined) requiredString(item, "recommendedFirstReviewReason", path, issues);
  const evidence = validateEvidenceRefs(item.majorEvidence, `${path}.majorEvidence`, issues);
  if (evidence.length === 0) add(issues, "MISSING_REQUIRED_FIELD", `${path}.majorEvidence`, "must contain at least one evidence reference");
  const recommended = gradeRequired ? requiredString(item, "recommendedFirstReview", path, issues) : (item.recommendedFirstReview === undefined ? "" : requiredString(item, "recommendedFirstReview", path, issues));
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

function routePath(value: string): string {
  try { return new URL(value).pathname || "/"; } catch { return value.startsWith("/") ? value : `/${value.replace(/^\/+/, "")}`; }
}
function validateServiceComparison(value: unknown, path: string, knownIds: Set<string>, prescribedIds: Set<string>, reviewInventory: Map<string, ReviewRecord>, issues: ContractIssue[]): void {
  const entries = nonEmptyArray({ entries: value }, "entries", path, issues);
  const aliases = new Map<string, string>(); const ids = new Set<string>();
  entries.forEach((raw, index) => {
    const itemPath = `${path}[${index}]`; const item = record(raw, itemPath, issues);
    const id = requiredString(item, "id", itemPath, issues); const name = requiredString(item, "name", itemPath, issues);
    if (/^(?:service|page|slot)(?:[- _]?\d+)?$/i.test(id) || /^(?:service|page|slot)(?:[- _]?\d+)?$/i.test(name)) add(issues, "GENERIC_SERVICE_SLOT", itemPath, "canonical service identity required");
    if (ids.has(id)) add(issues, "DUPLICATE_ID", `${itemPath}.id`, `duplicate service comparison ID ${id}`); ids.add(id);
    const status = requiredString(item, "status", itemPath, issues);
    if (!["prescribed", "folded", "passed_over", "excluded"].includes(status)) add(issues, "INVALID_VALUE", `${itemPath}.status`, "unsupported service comparison status");
    for (const key of ["evidenceCount", "directEvidenceCount"]) if (typeof item[key] !== "number" || !Number.isInteger(item[key]) || Number(item[key]) < 0) add(issues, "INVALID_VALUE", `${itemPath}.${key}`, "must be a non-negative integer");
    const refs = validateEvidenceRefs(item.evidence, `${itemPath}.evidence`, issues);
    for (const ref of refs) if (ref.refId && !knownIds.has(ref.refId)) add(issues, "EVIDENCE_REF_NOT_FOUND", `${itemPath}.evidence`, `evidence ID ${ref.refId} is not declared`);
    if (status === "prescribed") {
      if (typeof item.directEvidenceCount !== "number" || item.directEvidenceCount <= 0) add(issues, "SERVICE_EVIDENCE_REQUIRED", `${itemPath}.directEvidenceCount`, "every prescribed service requires direct evidence");
      const authoritativeReview = refs.some((ref) => ref.kind === "review" && reviewInventory.get(ref.refId)?.upstreamAuthorityJudgment === "authoritative");
      if (!authoritativeReview) add(issues, "SERVICE_EVIDENCE_REQUIRED", `${itemPath}.evidence`, "every prescribed service requires an authoritative review-backed comparison entry");
    }
    for (const alias of Array.isArray(item.aliases) ? item.aliases : []) {
      const key = String(alias).toLowerCase(); const previous = aliases.get(key);
      if (previous && previous !== id) add(issues, "ALIAS_COLLISION", `${itemPath}.aliases`, `alias ${alias} collides with ${previous}`); aliases.set(key, id);
    }
    const route = typeof item.route === "string" ? routePath(item.route) : "";
    if (status === "prescribed") {
      if (!prescribedIds.has(id)) add(issues, "INVALID_VALUE", `${itemPath}.id`, "prescribed service must match an approved destination");
      if (route && ["/", "/contact"].includes(route)) add(issues, "RESERVED_ROUTE", `${itemPath}.route`, "service cannot use Home or Contact");
    } else {
      if (route) add(issues, "REJECTED_PAGE_ROUTE", `${itemPath}.route`, "rejected/folded services cannot carry public routes");
      if (["folded", "passed_over"].includes(status)) {
        const foldInto = requiredString(item, "foldInto", itemPath, issues);
        if (foldInto && !prescribedIds.has(foldInto)) add(issues, "INVALID_VALUE", `${itemPath}.foldInto`, "fold target must be an approved service destination");
      }
    }
  });
  for (const id of prescribedIds) if (!ids.has(id)) add(issues, "MISSING_REQUIRED_FIELD", path, `approved service ${id} missing from service comparison`);
}
function prospectPlaceId(prospect: ProspectContract | null): string {
  const exact = prospect?.siteEvidence?.find((entry) => entry.pageType.toLowerCase().replace(/[ _-]+/gu, "") === "exactplace");
  if (!exact) return "";
  try { return new URL(exact.url).searchParams.get("query_place_id") || ""; } catch { return ""; }
}
function validateExpansionOverride(value: unknown, path: string, issues: ContractIssue[], root?: AnyRecord, prospect?: ProspectContract | null): void {
  const item = record(value, path, issues);
  if (item.status !== "approved") add(issues, "APPROVAL_REQUIRED", `${path}.status`, "expansion requires explicit approval");
  if (item.approvedBy !== "Josh Lenz") add(issues, "APPROVAL_REQUIRED", `${path}.approvedBy`, "only Josh Lenz may authorize a page expansion");
  validateDate(item.approvedAt, `${path}.approvedAt`, issues); requiredString(item, "reason", path, issues);
  if (prospect && item.prospectId !== prospect.id) add(issues, "APPROVAL_REQUIRED", `${path}.prospectId`, "expansion override is bound to a different prospect");
  if (prospect && item.placeId !== prospectPlaceId(prospect)) add(issues, "APPROVAL_REQUIRED", `${path}.placeId`, "expansion override is not bound to the exact-place identity");
  if (root && item.runId !== (isRecord(root.sourceCheckpoint) ? root.sourceCheckpoint.runId : undefined)) add(issues, "APPROVAL_REQUIRED", `${path}.runId`, "expansion override is bound to a different source run");
  if (root && item.sourceCheckpointDigest !== (isRecord(root.digests) ? root.digests.sourceCheckpointDigest : undefined)) add(issues, "DIGEST_MISMATCH", `${path}.sourceCheckpointDigest`, "expansion override source binding does not match the sealed source digest");
  if (root && item.evidenceDigest !== (isRecord(root.digests) ? root.digests.evidenceDigest : undefined)) add(issues, "DIGEST_MISMATCH", `${path}.evidenceDigest`, "expansion override evidence binding does not match the sealed evidence digest");
  const pageIds = requiredArray(item, "approvedPageIds", path, issues).filter((id): id is string => typeof id === "string");
  const intents = requiredArray(item, "canonicalIntents", path, issues).filter((id): id is string => typeof id === "string");
  if (prospect) {
    const expected = Array.isArray(prospect.destinations.servicePages) ? prospect.destinations.servicePages.map((page) => page.id) : [];
    if (JSON.stringify([...pageIds].sort()) !== JSON.stringify([...expected].sort())) add(issues, "APPROVAL_REQUIRED", `${path}.approvedPageIds`, "override must bind every approved service page ID exactly");
    if (JSON.stringify([...intents].sort()) !== JSON.stringify([...expected].sort())) add(issues, "APPROVAL_REQUIRED", `${path}.canonicalIntents`, "override must bind every approved canonical service intent exactly");
  }
  const routes = nonEmptyArray(item, "additionalRoutes", path, issues); const seen = new Set<string>();
  routes.forEach((route, index) => { const normalized = routePath(String(route)); if (["/", "/contact"].includes(normalized) || seen.has(normalized)) add(issues, "RESERVED_ROUTE", `${path}.additionalRoutes[${index}]`, "expansion routes must be unique and non-reserved"); seen.add(normalized); });
  const digest = requiredString(item, "digest", path, issues); if (digest && digest !== expansionOverrideDigest(item as any)) add(issues, "DIGEST_MISMATCH", `${path}.digest`, "expansion override digest mismatch");
}
function validateDestinations(value: unknown, path: string, registry: IdRegistry, reviewInventory: Map<string, ReviewRecord>, knownIds: Set<string>, issues: ContractIssue[], expansionOverride?: unknown): void {
  const item = record(value, path, issues);
  validatePagePrescription(item.homepage, `${path}.homepage`, registry, reviewInventory, knownIds, issues, true);
  validatePagePrescription(item.contact, `${path}.contact`, registry, reviewInventory, knownIds, issues, false);
  const homepageUrl = isRecord(item.homepage) && typeof item.homepage.url === "string" ? item.homepage.url : "";
  const contactUrl = isRecord(item.contact) && typeof item.contact.url === "string" ? item.contact.url : "";
  if (homepageUrl && routePath(homepageUrl) !== "/") add(issues, "ROUTING_BOUNDARY", `${path}.homepage.url`, "business Home must use /");
  if (contactUrl && routePath(contactUrl) !== "/contact") add(issues, "ROUTING_BOUNDARY", `${path}.contact.url`, "business Contact must use /contact");
  for (const key of ["header", "footer"]) {
    const entries = nonEmptyArray(item, key, path, issues);
    entries.forEach((entry, index) => {
      validateDestination(entry, `${path}.${key}[${index}]`, registry, issues);
    });
  }
  const strategy = record(item.strategy, `${path}.strategy`, issues);
  if (strategy.visibility !== "internal") add(issues, "PUBLIC_STRATEGY_ROUTE", `${path}.strategy.visibility`, "Strategy Overview must be internal");
  for (const key of ["url", "path", "route"]) if (Object.prototype.hasOwnProperty.call(strategy, key)) add(issues, "PUBLIC_STRATEGY_ROUTE", `${path}.strategy.${key}`, "Strategy Overview is internal-only and cannot carry public URL/path/route fields");
  for (const field of ["label", "decisionPath", "rationale"]) requiredString(strategy, field, `${path}.strategy`, issues);
  const pages = item.servicePages; const override = expansionOverride && isRecord(expansionOverride) ? expansionOverride : null;
  if (!Array.isArray(pages) || pages.length < 2) add(issues, "SERVICE_PAGE_COUNT", `${path}.servicePages`, "exactly two service pages are required unless an explicit expansion override is valid");
  const urls = new Set<string>();
  (Array.isArray(pages) ? pages : []).forEach((page, index) => {
    validatePagePrescription(page, `${path}.servicePages[${index}]`, registry, reviewInventory, knownIds, issues, true, false);
    if (isRecord(page)) {
      const route = typeof page.url === "string" ? routePath(page.url) : ""; if (urls.has(route)) add(issues, "INVALID_VALUE", `${path}.servicePages[${index}].url`, "service URLs must be distinct");
      if (["/", "/contact"].includes(route)) add(issues, "RESERVED_ROUTE", `${path}.servicePages[${index}].url`, "service route is reserved"); urls.add(route);
      if (override && index >= 2 && !(Array.isArray(override.additionalRoutes) && override.additionalRoutes.map((item: unknown) => routePath(String(item))).includes(route))) add(issues, "ROUTING_BOUNDARY", `${path}.servicePages[${index}].url`, "expanded route is not declared by the override");
    }
  });
  if (override && Array.isArray(override.additionalRoutes)) {
    const declared = new Set(override.additionalRoutes.map((item: unknown) => routePath(String(item))));
    const extraPages = Array.isArray(pages) ? pages.slice(2) : [];
    if (declared.size !== extraPages.length) add(issues, "ROUTING_BOUNDARY", `${path}.servicePages`, "the expansion override must declare exactly every additional service destination");
  }
  const prescribedPageIds = [isRecord(item.homepage) && typeof item.homepage.id === "string" ? item.homepage.id : "", isRecord(item.contact) && typeof item.contact.id === "string" ? item.contact.id : "", ...(Array.isArray(pages) ? pages : []).filter(isRecord).map((page) => typeof page.id === "string" ? page.id : "")].filter(Boolean);
  validatePageSuitabilityAgainstPages(Array.from(reviewInventory.values()), `${path}.reviewInventory`, reviewInventory, prescribedPageIds, issues);
}
function validateProspect(value: unknown, path: string, issues: ContractIssue[], expansionOverride?: unknown): ProspectContract | null {
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
  validateDestinations(item.destinations, `${path}.destinations`, registry, reviewInventory, knownIds, issues, expansionOverride);
  return item as unknown as ProspectContract;
}

function validateRejectedPublicTopology(root: AnyRecord, issues: ContractIssue[]): void {
  const comparison = Array.isArray(root.serviceComparison) ? root.serviceComparison.filter(isRecord) as any[] : [];
  const ledger = buildIntentLedger(comparison as any);
  const rejected = ledger.filter((entry) => !entry.publicRouteAllowed);
  const rejectedNames = rejected.flatMap((entry) => [entry.name, ...entry.aliases]).filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  const publicClaimNames = rejectedNames.filter((name) => name.trim().replace(/[-_]+/gu, " ").split(/\s+/u).filter(Boolean).length >= 3);
  const rejectedRoutes = comparison.filter((entry) => entry.status !== "prescribed").flatMap((entry) => [entry.route, entry.pageUrl]).filter((value): value is string => typeof value === "string" && value.trim().length > 0).map(routePath);
  const destinations = isRecord(root.prospect) && isRecord(root.prospect.destinations) ? root.prospect.destinations : {};
  const publicNavigation = JSON.stringify({ header: destinations.header, footer: destinations.footer }).toLowerCase();
  const strategyText = JSON.stringify(destinations.strategy || {}).toLowerCase();
  for (const route of rejectedRoutes) if (publicNavigation.includes(route.toLowerCase())) add(issues, "REJECTED_PAGE_ROUTE", "$.prospect.destinations", `rejected service route ${route} leaked into public navigation`);
  for (const name of publicClaimNames) if (publicNavigation.includes(name.toLowerCase())) add(issues, "REJECTED_PAGE_ROUTE", "$.prospect.destinations", `rejected service ${name} leaked into public navigation`);
  const publicPages = [destinations.homepage, ...(Array.isArray(destinations.servicePages) ? destinations.servicePages : []), destinations.contact].filter(isRecord);
  const publicAreas = [destinations.homepage, ...(Array.isArray(destinations.servicePages) ? destinations.servicePages : []), destinations.contact, ...(Array.isArray(destinations.header) ? destinations.header : []), ...(Array.isArray(destinations.footer) ? destinations.footer : [])].filter((value): value is AnyRecord => isRecord(value));
  const scanPublicStrings = (value: unknown, path: string): void => {
    if (typeof value === "string") {
      const normalized = value.toLowerCase().replace(/[-_]+/gu, " ");
      for (const name of publicClaimNames) if (normalized.includes(name.toLowerCase().replace(/[-_]+/gu, " "))) add(issues, "REJECTED_PAGE_ROUTE", path, `rejected service ${name} leaked into public page prose or topology`);
      return;
    }
    if (Array.isArray(value)) { value.forEach((child, index) => scanPublicStrings(child, `${path}[${index}]`)); return; }
    if (isRecord(value)) Object.entries(value).forEach(([key, child]) => scanPublicStrings(child, `${path}.${key}`));
  };
  publicAreas.forEach((area, index) => scanPublicStrings(area, `$.prospect.destinations.public[${index}]`));
  for (const page of publicPages) {
    const publicFields = [page.id, page.url, page.label, page.purpose, page.keyword, page.titleH1Direction, page.angleCustomerDecision];
    for (const name of publicClaimNames) if (publicFields.some((field) => typeof field === "string" && field.toLowerCase().includes(name.toLowerCase()))) add(issues, "REJECTED_PAGE_ROUTE", "$.prospect.destinations", `rejected service ${name} was assigned to public page topology`);
    const actionFields = [page.cta, page.ctas, page.callsToAction, page.actions];
    const actionText = JSON.stringify(actionFields).toLowerCase();
    for (const name of publicClaimNames) if (actionText.includes(name.toLowerCase())) add(issues, "REJECTED_PAGE_ROUTE", "$.prospect.destinations", `rejected service ${name} leaked into a public CTA/action`);
  }
  // Internal strategy/supporting evidence may name a folded or passed-over
  // service. It becomes a forbidden claim only when the text presents it as
  // an approved/public page, route, destination, navigation item, or CTA.
  const approvedTopologyClaim = /\b(?:approved|prescribed|standalone|public|route|page|destination|navigation|nav|cta)\b/u;
  const supportingEvidence = /\b(?:supporting|folded|passed[- ]over|evidence only|not approved|not a standalone|without a page)\b/u;
  const strategySegments = strategyText.split(/[.!?;]+/u);
  for (const name of rejectedNames) {
    const mentions = strategySegments.filter((segment) => segment.includes(name.toLowerCase()));
    if (mentions.some((segment) => approvedTopologyClaim.test(segment) && !supportingEvidence.test(segment))) {
      add(issues, "REJECTED_PAGE_ROUTE", "$.prospect.destinations.strategy", `rejected service ${name} was claimed as an approved/public destination`);
    }
  }
}
function validateIntegrity(root: AnyRecord, prospect: ProspectContract | null, issues: ContractIssue[]): void {
  const source = record(root.sourceCheckpoint, "$.sourceCheckpoint", issues);
  for (const key of ["runId", "artifactId", "sourceSha", "archiveDigest"]) requiredString(source, key, "$.sourceCheckpoint", issues);
  if (source.manifestDigest !== undefined && (typeof source.manifestDigest !== "string" || !source.manifestDigest.trim())) add(issues, "SOURCE_CHECKPOINT_INVALID", "$.sourceCheckpoint.manifestDigest", "manifestDigest must be non-empty");
  if (!Array.isArray(source.manifest) || source.manifest.length === 0) add(issues, "SOURCE_CHECKPOINT_INVALID", "$.sourceCheckpoint.manifest", "source manifest must be a non-empty array");
  {
    const manifest = Array.isArray(source.manifest) ? source.manifest : [];
    const seen = new Set<string>();
    manifest.forEach((entry: unknown, index: number) => {
      const item = record(entry, `$.sourceCheckpoint.manifest[${index}]`, issues);
      const manifestPath = requiredString(item, "path", `$.sourceCheckpoint.manifest[${index}]`, issues);
      const digest = requiredString(item, "digest", `$.sourceCheckpoint.manifest[${index}]`, issues);
      if (manifestPath && seen.has(manifestPath)) add(issues, "SOURCE_CHECKPOINT_INVALID", `$.sourceCheckpoint.manifest[${index}].path`, "source manifest paths must be unique");
      if (manifestPath) seen.add(manifestPath);
      if (digest && !/^sha256:[0-9a-f]{64}$/u.test(digest)) add(issues, "SOURCE_CHECKPOINT_INVALID", `$.sourceCheckpoint.manifest[${index}].digest`, "manifest entry digest must be sha256:<64 lowercase hex>");
    });
    if (Array.isArray(source.manifest)) {
      const expectedManifestDigest = digestOf(source.manifest);
      if (source.manifestDigest !== expectedManifestDigest) add(issues, "SOURCE_CHECKPOINT_INVALID", "$.sourceCheckpoint.manifestDigest", "manifestDigest does not match the actual source manifest");
      const expectedArchiveDigest = digestOf({ sourceSha: source.sourceSha, manifestDigest: expectedManifestDigest });
      if (source.archiveDigest !== expectedArchiveDigest) add(issues, "SOURCE_CHECKPOINT_INVALID", "$.sourceCheckpoint.archiveDigest", "archiveDigest does not match the bound source manifest and source SHA");
    }
  }
  const trusted = typeof source.artifactId === "string" ? TRUSTED_SOURCE_IDENTITIES[source.artifactId] : undefined;
  if (trusted) {
    for (const key of ["runId", "artifactId", "sourceSha", "manifestDigest", "archiveDigest"] as const) if (source[key] !== trusted[key]) add(issues, "SOURCE_CHECKPOINT_INVALID", `$.sourceCheckpoint.${key}`, "source identity does not match the authoritative pinned archive identity");
  }
  const facts = record(root.reviewAnalysisFacts, "$.reviewAnalysisFacts", issues);
  const written = facts.retrievedWrittenReviewCount;
  if (typeof written !== "number" || !Number.isInteger(written) || written < 0) add(issues, "REVIEW_ANALYSIS_MISMATCH", "$.reviewAnalysisFacts.retrievedWrittenReviewCount", "must be a non-negative integer");
  validateDate(facts.reviewRetrievalDate, "$.reviewAnalysisFacts.reviewRetrievalDate", issues);
  const names = requiredArray(facts, "reviewBackedServiceNames", "$.reviewAnalysisFacts", issues);
  if (typeof facts.reviewBackedServicesWithoutPages !== "number" || !Number.isInteger(facts.reviewBackedServicesWithoutPages) || facts.reviewBackedServicesWithoutPages !== names.length) add(issues, "REVIEW_ANALYSIS_MISMATCH", "$.reviewAnalysisFacts", "service-gap count must equal sealed service names");
  const inventory = Array.isArray(prospect?.reviewInventory) ? prospect.reviewInventory : [];
  if (prospect && written !== inventory.filter((review) => typeof review.exactText === "string" && review.exactText.trim()).length) add(issues, "REVIEW_ANALYSIS_MISMATCH", "$.reviewAnalysisFacts.retrievedWrittenReviewCount", "does not match written evidence count");
  if (trusted && prospect && Array.isArray(root.serviceComparison)) {
    const comparison = root.serviceComparison.filter(isRecord) as AnyRecord[];
    const reviewMap = new Map(inventory.map((review) => [review.id, review]));
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
    for (const [index, entry] of comparison.entries()) {
      const terms = [entry.id, entry.name, ...(Array.isArray(entry.aliases) ? entry.aliases : [])].filter((value): value is string => typeof value === "string").map(normalize);
      const derived = inventory.filter((review) => review.upstreamAuthorityJudgment === "authoritative" && review.serviceTopicSignals.some((signal: string) => terms.includes(normalize(signal)))).length;
      if (typeof entry.directEvidenceCount === "number" && entry.directEvidenceCount > derived) add(issues, "REVIEW_ANALYSIS_MISMATCH", `$.serviceComparison[${index}].directEvidenceCount`, "direct evidence count exceeds the bound authoritative review classifications");
      const refs = Array.isArray(entry.evidence) ? entry.evidence : [];
      for (const [refIndex, ref] of refs.entries()) {
        if (!isRecord(ref) || ref.kind !== "review" || !reviewMap.has(ref.refId as string)) add(issues, "REVIEW_ANALYSIS_MISMATCH", `$.serviceComparison[${index}].evidence[${refIndex}]`, "service evidence must bind to an actual review record");
      }
    }
    const serviceRoutes = new Set((prospect.destinations.servicePages || []).map((page) => routePath(page.url)));
    const derivedGapNames = comparison.filter((entry) => entry.status !== "prescribed" && Array.isArray(entry.evidence) && entry.evidence.length > 0 && !entry.route && !serviceRoutes.has(routePath(String(entry.route || "")))).map((entry) => entry.name).filter((name): name is string => typeof name === "string");
    if (JSON.stringify(names) !== JSON.stringify(derivedGapNames) || facts.reviewBackedServicesWithoutPages !== derivedGapNames.length) add(issues, "REVIEW_ANALYSIS_MISMATCH", "$.reviewAnalysisFacts", "sealed service-gap facts do not match the bound service-evidence ledger and site audit");
  }
  const digestRecord = record(root.digests, "$.digests", issues);
  const pattern = /^sha256:[0-9a-f]{64}$/;
  for (const key of ["sourceCheckpointDigest", "prescriptionDigest", "evidenceDigest", "approvedPageSetDigest", "approvalDigest", "handoffDigest"]) {
    const value = requiredString(digestRecord, key, "$.digests", issues); if (value && !pattern.test(value)) add(issues, "DIGEST_MISMATCH", `$.digests.${key}`, "must be sha256:<64 lowercase hex");
  }
  const digestInputsAreStructured = prospect
    && isRecord(root.sourceCheckpoint)
    && isRecord(root.prospect)
    && isRecord(root.prospect.destinations)
    && isRecord(root.digests);
  if (digestInputsAreStructured) {
    const expected = computeHandoffDigests(root as any);
    for (const key of ["sourceCheckpointDigest", "prescriptionDigest", "evidenceDigest", "approvedPageSetDigest", "approvalDigest", "handoffDigest"] as const) if (digestRecord[key] !== expected[key]) add(issues, "DIGEST_MISMATCH", `$.digests.${key}`, `sealed ${key} does not match handoff contents`);
  }
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
  if (root.approval !== undefined && !isRecord(root.approval)) add(issues, "INVALID_OBJECT", "$.approval", "approval must be an object before nested fields are inspected");
  const expansionOverride = root.expansionOverride;
  const prospect = parseProspectOnly(root.prospect, "$.prospect", issues, expansionOverride);
  const prescribedIds = prospect && isRecord((prospect as any).destinations) && Array.isArray((prospect as any).destinations.servicePages)
    ? new Set<string>((prospect as any).destinations.servicePages.map((page: any) => String(page?.id)))
    : new Set<string>();
  const knownIds = prospect ? new Set<string>([
    ...(Array.isArray(prospect.reviewInventory) ? prospect.reviewInventory.map((review) => review.id) : []),
    ...(Array.isArray(prospect.confirmedFacts) ? prospect.confirmedFacts.map((fact) => fact.id) : []),
    ...(Array.isArray(prospect.siteEvidence) ? prospect.siteEvidence.map((entry) => entry.id) : []),
    ...(Array.isArray(prospect.imageRefs) ? prospect.imageRefs.map((entry) => entry.id) : []),
  ]) : new Set<string>();
  validateServiceComparison(root.serviceComparison, "$.serviceComparison", knownIds, prescribedIds, prospect && Array.isArray(prospect.reviewInventory) ? new Map(prospect.reviewInventory.map((review) => [review.id, review])) : new Map(), issues);
  if (root.expansionOverride !== undefined) validateExpansionOverride(root.expansionOverride, "$.expansionOverride", issues, root, prospect);
  if (prospect && prospect.destinations && Array.isArray(prospect.destinations.servicePages) && prospect.destinations.servicePages.length !== 2 && root.expansionOverride === undefined) add(issues, "SERVICE_PAGE_COUNT", "$.prospect.destinations.servicePages", "additional service pages require an explicit expansion override");
  if (prospect) { validateRejectedPublicTopology(root, issues); validateIntegrity(root, prospect, issues); }
  if (issues.length) throw new ContractValidationError(issues);
  return { ...root as unknown as ApprovedProspectHandoff, version: LANE_A_HANDOFF_VERSION, approval: approval as unknown as ApprovedProspectHandoff["approval"], prospect: prospect as ProspectContract };
}

function parseProspectOnly(value: unknown, path: string, issues: ContractIssue[], expansionOverride?: unknown): ProspectContract | null {
  if (Array.isArray(value)) {
    add(issues, "ONE_PROSPECT_ONLY", path, "expected exactly one prospect object, not an array");
    return null;
  }
  return validateProspect(value, path, issues, expansionOverride);
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
