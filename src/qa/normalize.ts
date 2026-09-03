import type { QaClaim, QaPage, QaReview, QaReviewPlacement, QaSite } from "./types.js";

export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" ? (value as UnknownRecord) : {};
}

export function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

export function words(text: string): number {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

export function pageRoute(page: unknown): string {
  const p = asRecord(page);
  return firstString(p.url, p.path, p.route, p.slug) ?? "";
}

export function pageText(page: QaPage): string {
  if (page.text) return page.text;
  const p = asRecord(page);
  const chunks: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === "string") chunks.push(value);
    else if (Array.isArray(value)) value.forEach(add);
    else if (value && typeof value === "object") {
      const item = value as UnknownRecord;
      [item.heading, item.title, item.body, item.text, item.content, item.subhead, item.description, item.quote, item.excerpt].forEach(add);
      add(item.bullets);
      add(item.items);
    }
  };
  [p.h1, p.hero, p.heroSubhead, p.subhead, p.sections, p.body, p.faqs, p.ctas].forEach(add);
  // Placements are part of website words even when an adapter keeps them in a
  // sidecar array rather than inserting their prose into section.body.
  add(p.reviewPlacements);
  add(p.placedReviews);
  return chunks.join(" ");
}

function normalizeReview(raw: unknown, index: number): QaReview {
  const r = asRecord(raw);
  const suitability = pageSuitability(r.pageSuitability);
  const id = firstString(r.id, r.reviewId, r.stableId, r.sourceId) ?? `review-${index + 1}`;
  return {
    id,
    reviewer: firstString(r.reviewer, r.author, r.name),
    text: firstString(r.text, r.reviewText, r.exactText, r.body, r.content, r.quote) ?? "",
    rating: typeof r.rating === "number" ? r.rating : typeof r.stars === "number" ? r.stars : undefined,
    date: firstString(r.date, r.publishedAt),
    source: firstString(r.source, r.provenance, r.platform),
    negativeSignals: stringArray(r.negativeSignals, r.negatives),
    cautionSignals: stringArray(r.cautionSignals, r.cautions),
    evidenceClassification: firstString(r.evidenceClassification, r.classification),
    suitable: typeof r.suitable === "boolean" ? r.suitable : firstString(r.suitability)?.toLowerCase().replace(/[ _-]+/gu, "") === "notsuitable" ? false : undefined,
    suitableFor: stringArray(r.suitableFor) ?? suitability.suitableFor,
    notSuitableFor: suitability.notSuitableFor,
  };
}

function pageSuitability(raw: unknown): { suitableFor?: string[]; notSuitableFor?: string[] } {
  if (!Array.isArray(raw) || !raw.some((item) => item && typeof item === "object")) return {};
  const suitable: string[] = [];
  const notSuitable: string[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as UnknownRecord;
    const page = firstString(record.pageId, record.prescriptionId, record.url, record.route);
    if (!page) continue;
    const status = firstString(record.suitability, record.status)?.toLowerCase().replace(/[ _-]+/gu, "");
    if (status === "notsuitable") notSuitable.push(page);
    else suitable.push(page);
  }
  return {
    ...(suitable.length ? { suitableFor: suitable } : {}),
    ...(notSuitable.length ? { notSuitableFor: notSuitable } : {}),
  };
}

function stringArray(...values: unknown[]): string[] | undefined {
  for (const value of values) {
    if (Array.isArray(value)) return value.filter((x): x is string => typeof x === "string");
    if (typeof value === "string" && value.trim()) return [value];
  }
  return undefined;
}

function normalizeClaim(raw: unknown, index: number): QaClaim | undefined {
  const c = asRecord(raw);
  const text = firstString(c.text, c.claim, c.statement, c.content);
  if (!text) return undefined;
  return {
    id: firstString(c.id, c.claimId) ?? `claim-${index + 1}`,
    text,
    wordOffset: typeof c.wordOffset === "number" ? c.wordOffset : typeof c.offset === "number" ? c.offset : undefined,
    reviewId: firstString(c.reviewId, c.proofReviewId),
  };
}

function normalizePlacement(raw: unknown, index: number): QaReviewPlacement | undefined {
  const r = asRecord(raw);
  const reviewId = firstString(r.reviewId, r.sourceReviewId, r.id);
  const quote = firstString(r.quote, r.excerpt, r.text, r.reviewText);
  // Keep malformed placement records visible to QA. Dropping a placement with
  // a missing quote/ID would let a writer evade the fidelity gate.
  if (!reviewId && !quote && !r.attribution && !r.reviewer && !r.author) return undefined;
  const role = firstString(r.proofRole, r.role, r.kind, r.intendedUse)?.toLowerCase().replace(/[ _-]+/gu, "");
  const proofRole = role === "lead" ? "lead" : role === "support" ? "support" : role === "positive" || role === "positiveproof" || r.positiveProof === true || r.useAsPositiveProof === true ? "positive" : role === "context" ? "context" : role === "negative" ? "negative" : role === "caution" ? "caution" : undefined;
  return {
    reviewId: reviewId ?? "",
    quote: quote ?? "",
    attribution: firstString(r.attribution, r.reviewer, r.author),
    claimId: firstString(r.claimId, r.provesClaim),
    wordOffset: typeof r.wordOffset === "number" ? r.wordOffset : typeof r.offset === "number" ? r.offset : undefined,
    proofRole,
    sectionId: firstString(r.sectionId),
    order: typeof r.order === "number" ? r.order : index,
  };
}

function normalizePage(raw: unknown, index: number): QaPage {
  const p = asRecord(raw);
  const seo = asRecord(p.seo);
  const route = pageRoute(raw) || `page-${index + 1}`;
  const grade = firstString(p.reviewGrade, p.grade, asRecord(p.reviewEvidence).grade);
  return {
    ...p,
    url: route,
    // Do not infer prescription mapping from an arbitrary output `id`; the
    // approved handoff must explicitly carry pageId/prescriptionId.
    pageId: firstString(p.pageId, p.prescriptionId),
    prescriptionId: firstString(p.prescriptionId, p.pageId),
    seoTitle: firstString(p.seoTitle, p.title, seo.title),
    metaDescription: firstString(p.metaDescription, p.meta, seo.description, seo.metaDescription),
    h1: firstString(p.h1, p.heading, asRecord(p.hero).heading),
    primaryKeyword: firstString(p.primaryKeyword, p.keyword),
    pageType: firstString(p.pageType, p.type),
    reviewGrade: grade === "A" || grade === "B" || grade === "C" ? grade : undefined,
    eligibleForReviews: typeof p.eligibleForReviews === "boolean" ? p.eligibleForReviews : typeof p.reviewEligible === "boolean" ? p.reviewEligible : undefined,
    suitableReviewIds: stringArray(p.suitableReviewIds, asRecord(p.reviewEvidence).suitableReviewIds),
    claims: (Array.isArray(p.claims) ? p.claims : []).map(normalizeClaim).filter((x): x is QaClaim => Boolean(x)),
    reviewPlacements: (Array.isArray(p.reviewPlacements) ? p.reviewPlacements : Array.isArray(p.placedReviews) ? p.placedReviews : Array.isArray(p.reviews) ? p.reviews : [])
      .map(normalizePlacement).filter((x): x is QaReviewPlacement => Boolean(x)),
    sections: Array.isArray(p.sections) ? p.sections : undefined,
    text: typeof p.text === "string" ? p.text : undefined,
  };
}

/** Convert the writer result to the small shape deterministic QA needs. */
export function normalizeSite(raw: unknown): QaSite {
  const root = asRecord(raw);
  const outputs = asRecord(root.outputs);
  const nested = asRecord(root.websiteWords ?? root.finalWords ?? outputs.websiteWords ?? outputs.finalWords ?? outputs.complete);
  const source = Object.keys(nested).length ? nested : root;
  const pagesRaw = Array.isArray(source.pages) ? source.pages : Array.isArray(source.pageWords) ? source.pageWords : [];
  const inventory = asRecord(root.reviewInventory);
  const evidence = asRecord(root.reviewEvidence);
  const reviewsRaw = Array.isArray(root.reviews) ? root.reviews : Array.isArray(source.reviews) ? source.reviews : Array.isArray(root.reviewInventory) ? root.reviewInventory : Array.isArray(inventory.reviews) ? inventory.reviews : Array.isArray(evidence.reviews) ? evidence.reviews : [];
  return {
    ...root,
    ...source,
    pages: pagesRaw.map(normalizePage),
    reviews: reviewsRaw.map(normalizeReview),
  };
}

/** Extract placements nested inside sections when a writer did not lift them. */
export function nestedPlacements(page: QaPage): QaReviewPlacement[] {
  const found: QaReviewPlacement[] = [...(page.reviewPlacements ?? [])];
  const scan = (value: unknown, sectionId?: string) => {
    if (Array.isArray(value)) return value.forEach((item) => scan(item, sectionId));
    if (!value || typeof value !== "object") return;
    const item = value as UnknownRecord;
    const candidate = normalizePlacement({ ...item, sectionId: item.sectionId ?? sectionId }, found.length);
    if (candidate && (item.reviewId || item.sourceReviewId || item.quote || item.excerpt)) found.push(candidate);
    const id = firstString(item.id, item.sectionId, item.heading);
    [item.sections, item.items, item.blocks, item.reviews, item.review].forEach((child) => scan(child, id ?? sectionId));
  };
  scan(page.sections);
  return found.filter((placement, index, all) => all.findIndex((x) => x.reviewId === placement.reviewId && x.quote === placement.quote && x.sectionId === placement.sectionId) === index);
}
