import { sha256Json } from "../handoff/fingerprint.js";
import {
  PAGE_AUDIENCES,
  PAGE_ID_RE,
  PAGE_ROLES,
  REVIEW_KINDS,
  WEBSITE_COPY_READING_ORDER,
  WRITING_PACKAGE_SCHEMA_VERSION,
  pageRequiresSeoMetadata,
  type ContentBlock,
  type PageAudience,
  type PageRole,
  type ReviewKind,
  type TextSpan,
  type WritingPackage,
  type WritingPackagePage,
} from "./types.js";

export class WritingPackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WritingPackageError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isReviewKind(value: string): value is ReviewKind {
  return (REVIEW_KINDS as readonly string[]).includes(value);
}

export function isPageRole(value: string): value is PageRole {
  return (PAGE_ROLES as readonly string[]).includes(value);
}

export function reviewDocumentTitle(pkg: WritingPackage, version?: number): string {
  const suffix = pkg.kind === "prescription" ? "Prescription — Human Review" : "Website Copy — Human Review";
  const base = `${pkg.businessName} — ${suffix}`;
  return version && version > 1 ? `${base} (v${version})` : base;
}

function canonicalizeSpan(span: TextSpan): TextSpan {
  const next: { text: string; bold?: true; italic?: true; href?: string } = { text: span.text };
  if (span.bold) next.bold = true;
  if (span.italic) next.italic = true;
  if (span.href !== undefined) next.href = span.href;
  return next;
}

function canonicalizeBlock(block: ContentBlock): ContentBlock {
  switch (block.type) {
    case "heading":
      return { type: "heading", level: block.level, text: block.text };
    case "paragraph":
      return { type: "paragraph", spans: block.spans.map(canonicalizeSpan) };
    case "list":
      return {
        type: "list",
        ordered: block.ordered,
        items: block.items.map((item) => ({ spans: item.spans.map(canonicalizeSpan) })),
      };
    case "quote": {
      const quote: ContentBlock = {
        type: "quote",
        spans: block.spans.map(canonicalizeSpan),
        attribution: block.attribution,
      };
      return block.reviewId ? { ...quote, reviewId: block.reviewId } : quote;
    }
  }
}

export function canonicalizeWritingPackage(pkg: Omit<WritingPackage, "packageHash"> | WritingPackage): Omit<WritingPackage, "packageHash"> {
  const pages = [...pkg.pages]
    .map((page) => {
      const next: WritingPackagePage = {
        pageId: page.pageId,
        role: page.role,
        audience: page.audience,
        readingOrder: page.readingOrder,
        title: page.title,
        blocks: page.blocks.map(canonicalizeBlock),
      };
      const withRoute = page.route !== undefined ? { ...next, route: page.route } : next;
      return withSeoFields(withRoute, page.seoTitle, page.metaDescription);
    })
    .sort((a, b) => a.readingOrder - b.readingOrder || a.pageId.localeCompare(b.pageId));
  return {
    schemaVersion: WRITING_PACKAGE_SCHEMA_VERSION,
    kind: pkg.kind,
    packageId: pkg.packageId,
    prospectId: pkg.prospectId,
    runId: pkg.runId,
    businessName: pkg.businessName,
    pages,
  };
}

export function hashWritingPackage(pkg: Omit<WritingPackage, "packageHash"> | WritingPackage): string {
  return sha256Json(canonicalizeWritingPackage(pkg));
}

export function buildWritingPackage(input: Omit<WritingPackage, "schemaVersion" | "packageHash">): WritingPackage {
  const pkg: WritingPackage = {
    ...canonicalizeWritingPackage({
      schemaVersion: WRITING_PACKAGE_SCHEMA_VERSION,
      ...input,
    }),
    packageHash: "",
  };
  const hashed: WritingPackage = { ...pkg, packageHash: hashWritingPackage(pkg) };
  assertWritingPackage(hashed);
  return hashed;
}

function validateSpans(input: unknown, pageId: string, index: number): readonly TextSpan[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new WritingPackageError(`Page ${pageId} block ${index} spans are required`);
  }
  return input.map((span) => {
    if (!isRecord(span) || typeof span.text !== "string" || span.text.length === 0) {
      throw new WritingPackageError(`Page ${pageId} block ${index} has an empty text span`);
    }
    const next: { text: string; bold?: true; italic?: true; href?: string } = { text: span.text };
    if (span.bold === true) next.bold = true;
    if (span.italic === true) next.italic = true;
    if (span.href !== undefined) {
      if (typeof span.href !== "string") {
        throw new WritingPackageError(`Page ${pageId} block ${index} link href must be a string`);
      }
      if (!/^https?:\/\//i.test(span.href) && !span.href.startsWith("/")) {
        throw new WritingPackageError(`Page ${pageId} block ${index} has an unsupported link destination`);
      }
      next.href = span.href;
    }
    return next;
  });
}

function validateBlock(input: unknown, pageId: string, index: number): ContentBlock {
  if (!isRecord(input) || typeof input.type !== "string") {
    throw new WritingPackageError(`Page ${pageId} block ${index} is invalid`);
  }
  switch (input.type) {
    case "heading": {
      if (input.level !== 1 && input.level !== 2 && input.level !== 3) {
        throw new WritingPackageError(`Page ${pageId} heading level must be 1, 2, or 3`);
      }
      if (typeof input.text !== "string" || input.text.trim().length === 0) {
        throw new WritingPackageError(`Page ${pageId} heading text is required`);
      }
      return { type: "heading", level: input.level, text: input.text };
    }
    case "paragraph":
      return { type: "paragraph", spans: validateSpans(input.spans, pageId, index) };
    case "list": {
      if (typeof input.ordered !== "boolean") {
        throw new WritingPackageError(`Page ${pageId} list ordered must be boolean`);
      }
      if (!Array.isArray(input.items) || input.items.length === 0) {
        throw new WritingPackageError(`Page ${pageId} list items are required`);
      }
      return {
        type: "list",
        ordered: input.ordered,
        items: input.items.map((item, itemIndex) => {
          if (!isRecord(item)) {
            throw new WritingPackageError(`Page ${pageId} list item ${itemIndex} is invalid`);
          }
          return { spans: validateSpans(item.spans, pageId, index) };
        }),
      };
    }
    case "quote": {
      const spans = validateSpans(input.spans, pageId, index);
      if (typeof input.attribution !== "string" || input.attribution.trim().length === 0) {
        throw new WritingPackageError(`Page ${pageId} quote attribution is required`);
      }
      const quote: ContentBlock = { type: "quote", spans, attribution: input.attribution };
      if (input.reviewId !== undefined) {
        if (typeof input.reviewId !== "string" || !/^[a-z][a-z0-9-]*$/.test(input.reviewId)) {
          throw new WritingPackageError(`Page ${pageId} quote reviewId must be a stable slug`);
        }
        return { ...quote, reviewId: input.reviewId };
      }
      return quote;
    }
    default:
      throw new WritingPackageError(`Page ${pageId} block ${index} has unknown type ${input.type}`);
  }
}

function validatePage(input: unknown, index: number): WritingPackagePage {
  if (!isRecord(input)) {
    throw new WritingPackageError(`Page ${index} must be an object`);
  }
  const pageId = input.pageId;
  if (typeof pageId !== "string" || !PAGE_ID_RE.test(pageId)) {
    throw new WritingPackageError(`Page ${index} pageId must be a stable lowercase slug (not heading text)`);
  }
  if (typeof input.role !== "string" || !isPageRole(input.role)) {
    throw new WritingPackageError(`Page ${pageId} has an unknown role`);
  }
  if (typeof input.audience !== "string" || !(PAGE_AUDIENCES as readonly string[]).includes(input.audience)) {
    throw new WritingPackageError(`Page ${pageId} audience must be business or owner`);
  }
  if (typeof input.readingOrder !== "number" || !Number.isInteger(input.readingOrder) || input.readingOrder < 1) {
    throw new WritingPackageError(`Page ${pageId} readingOrder must be a positive integer`);
  }
  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    throw new WritingPackageError(`Page ${pageId} title is required`);
  }
  if (input.route !== undefined && (typeof input.route !== "string" || input.route.trim().length === 0)) {
    throw new WritingPackageError(`Page ${pageId} route must be a non-empty string when present`);
  }
  if (!Array.isArray(input.blocks) || input.blocks.length === 0) {
    throw new WritingPackageError(`Page ${pageId} must include at least one block`);
  }
  const page: WritingPackagePage = {
    pageId,
    role: input.role,
    audience: input.audience as PageAudience,
    readingOrder: input.readingOrder,
    title: input.title,
    blocks: input.blocks.map((block, blockIndex) => validateBlock(block, pageId, blockIndex)),
  };
  const withRoute = typeof input.route === "string" ? { ...page, route: input.route } : page;
  return withSeoFields(
    withRoute,
    optionalNonEmptyString(input.seoTitle, pageId, "seoTitle"),
    optionalNonEmptyString(input.metaDescription, pageId, "metaDescription"),
  );
}

function optionalNonEmptyString(value: unknown, pageId: string, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new WritingPackageError(`Page ${pageId} ${field} must be a non-empty string when present`);
  }
  return value;
}

function withSeoFields(
  page: WritingPackagePage,
  seoTitle: string | undefined,
  metaDescription: string | undefined,
): WritingPackagePage {
  const withTitle = seoTitle !== undefined ? { ...page, seoTitle } : page;
  return metaDescription !== undefined ? { ...withTitle, metaDescription } : withTitle;
}

function validateWebsiteCopyShape(pages: readonly WritingPackagePage[]): void {
  const ordered = [...pages].sort((a, b) => a.readingOrder - b.readingOrder);
  const roles = ordered.map((page) => page.role);
  if (roles.length !== WEBSITE_COPY_READING_ORDER.length) {
    throw new WritingPackageError(
      "Website copy must contain homepage, two service pages, contact, header/footer, and strategy overview",
    );
  }
  for (let i = 0; i < WEBSITE_COPY_READING_ORDER.length; i += 1) {
    if (roles[i] !== WEBSITE_COPY_READING_ORDER[i]) {
      throw new WritingPackageError(
        "Website copy reading order must be homepage, two service pages, contact, header/footer, then strategy overview",
      );
    }
  }
  for (const page of ordered) {
    if (page.role === "strategy_overview") {
      if (page.audience !== "owner") {
        throw new WritingPackageError("Strategy Overview must be owner-facing");
      }
    } else if (page.audience !== "business") {
      throw new WritingPackageError(`${page.role} pages must be business-facing`);
    }
    if (page.role !== "header_footer" && !page.route) {
      throw new WritingPackageError(`${page.pageId} must include its approved route`);
    }
    if (pageRequiresSeoMetadata(page.role)) {
      if (!page.seoTitle || !page.metaDescription) {
        throw new WritingPackageError(
          `${page.pageId} requires seoTitle and metaDescription for this customer-facing route`,
        );
      }
    }
    if (page.role === "header_footer" && (page.seoTitle !== undefined || page.metaDescription !== undefined)) {
      throw new WritingPackageError(`${page.pageId} header/footer copy must not include SEO metadata`);
    }
  }
}

export function assertWritingPackage(pkg: WritingPackage): asserts pkg is WritingPackage {
  if (!pkg || pkg.schemaVersion !== WRITING_PACKAGE_SCHEMA_VERSION) {
    throw new WritingPackageError(`writing package schemaVersion must be ${WRITING_PACKAGE_SCHEMA_VERSION}`);
  }
  if (!isReviewKind(pkg.kind)) {
    throw new WritingPackageError("writing package kind is missing or unsupported");
  }
  if (!pkg.packageId || !pkg.prospectId || !pkg.runId || !pkg.businessName) {
    throw new WritingPackageError("writing package requires packageId, prospectId, runId, and businessName");
  }
  if (!Array.isArray(pkg.pages) || pkg.pages.length === 0) {
    throw new WritingPackageError("writing package pages are required");
  }
  const pageIds = new Set<string>();
  const orders = new Set<number>();
  for (const page of pkg.pages) {
    if (pageIds.has(page.pageId)) throw new WritingPackageError(`Duplicate pageId: ${page.pageId}`);
    pageIds.add(page.pageId);
    if (orders.has(page.readingOrder)) throw new WritingPackageError("readingOrder values must be unique");
    orders.add(page.readingOrder);
  }
  if (pkg.kind === "website_copy") {
    validateWebsiteCopyShape(pkg.pages);
  } else if (!pkg.pages.every((page) => page.role === "prescription")) {
    throw new WritingPackageError("Prescription packages may only contain prescription pages");
  }
  if (pkg.packageHash !== hashWritingPackage(pkg)) {
    throw new WritingPackageError("writing package hash does not match canonical package content");
  }
}

export function parseWritingPackage(input: unknown): WritingPackage {
  if (!isRecord(input)) {
    throw new WritingPackageError("Writing package must be an object");
  }
  if (input.schemaVersion !== WRITING_PACKAGE_SCHEMA_VERSION) {
    throw new WritingPackageError(`Unsupported writing package schemaVersion: ${String(input.schemaVersion)}`);
  }
  if (typeof input.kind !== "string" || !isReviewKind(input.kind)) {
    throw new WritingPackageError("Writing package kind is missing or unsupported");
  }
  if (typeof input.packageId !== "string" || !input.packageId.trim()) {
    throw new WritingPackageError("packageId is required");
  }
  if (typeof input.prospectId !== "string" || !input.prospectId.trim()) {
    throw new WritingPackageError("prospectId is required");
  }
  if (typeof input.runId !== "string" || !input.runId.trim()) {
    throw new WritingPackageError("runId is required");
  }
  if (typeof input.businessName !== "string" || !input.businessName.trim()) {
    throw new WritingPackageError("businessName is required");
  }
  if (!Array.isArray(input.pages) || input.pages.length === 0) {
    throw new WritingPackageError("pages are required");
  }
  const pages = input.pages.map((page, index) => validatePage(page, index));
  const withoutHash: Omit<WritingPackage, "packageHash"> = {
    schemaVersion: WRITING_PACKAGE_SCHEMA_VERSION,
    kind: input.kind,
    packageId: input.packageId,
    prospectId: input.prospectId,
    runId: input.runId,
    businessName: input.businessName,
    pages,
  };
  const pkg: WritingPackage = {
    ...withoutHash,
    packageHash: typeof input.packageHash === "string" ? input.packageHash : hashWritingPackage(withoutHash),
  };
  assertWritingPackage(pkg);
  return pkg;
}

export function websiteCopyPages(pkg: WritingPackage): {
  readonly homepage: WritingPackagePage;
  readonly servicePages: readonly [WritingPackagePage, WritingPackagePage];
  readonly contact: WritingPackagePage;
  readonly headerFooter: WritingPackagePage;
  readonly strategyOverview: WritingPackagePage;
} {
  assertWritingPackage(pkg);
  if (pkg.kind !== "website_copy") {
    throw new WritingPackageError("websiteCopyPages is only valid for website_copy packages");
  }
  const ordered = [...pkg.pages].sort((a, b) => a.readingOrder - b.readingOrder);
  const homepage = ordered[0];
  const serviceA = ordered[1];
  const serviceB = ordered[2];
  const contact = ordered[3];
  const headerFooter = ordered[4];
  const strategyOverview = ordered[5];
  if (!homepage || !serviceA || !serviceB || !contact || !headerFooter || !strategyOverview) {
    throw new WritingPackageError("Website copy is missing a required page");
  }
  return {
    homepage,
    servicePages: [serviceA, serviceB],
    contact,
    headerFooter,
    strategyOverview,
  };
}

export function publisherPayload(pkg: WritingPackage): {
  readonly title: string;
  readonly kind: ReviewKind;
  readonly pages: readonly WritingPackagePage[];
  readonly identity: {
    readonly packageId: string;
    readonly prospectId: string;
    readonly runId: string;
    readonly packageHash: string;
  };
} {
  assertWritingPackage(pkg);
  return {
    title: reviewDocumentTitle(pkg),
    kind: pkg.kind,
    pages: [...pkg.pages].sort((a, b) => a.readingOrder - b.readingOrder),
    identity: {
      packageId: pkg.packageId,
      prospectId: pkg.prospectId,
      runId: pkg.runId,
      packageHash: pkg.packageHash,
    },
  };
}
