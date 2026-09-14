import { GoogleDocsError } from "./errors.js";
import { sha256Hex } from "./hash.js";

/**
 * Writing-package contract consumed by the Google Docs publisher.
 *
 * The workflow lane (`cursor/content-factory-agent-agency`) should emit this
 * JSON when a package reaches a human gate. Page identity is `pageId`, not
 * the editable H1. Changing heading text must not reassign a page.
 */
export const WRITING_PACKAGE_SCHEMA_VERSION = "1.0.0";

export const REVIEW_KINDS = Object.freeze(["website_copy", "prescription"] as const);
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const PAGE_ROLES = Object.freeze([
  "homepage",
  "service",
  "contact",
  "header_footer",
  "strategy_overview",
  "prescription",
] as const);
export type PageRole = (typeof PAGE_ROLES)[number];

export const WEBSITE_COPY_READING_ORDER = Object.freeze([
  "homepage",
  "service",
  "service",
  "contact",
  "header_footer",
  "strategy_overview",
] as const);

export const PAGE_ID_RE = /^[a-z][a-z0-9-]{0,63}$/;

export interface TextSpan {
  readonly text: string;
  readonly bold?: true;
  readonly italic?: true;
  readonly href?: string;
}

export interface ListItem {
  readonly spans: readonly TextSpan[];
}

export type ContentBlock =
  | { readonly type: "heading"; readonly level: 1 | 2 | 3; readonly text: string }
  | { readonly type: "paragraph"; readonly spans: readonly TextSpan[] }
  | { readonly type: "list"; readonly ordered: boolean; readonly items: readonly ListItem[] }
  | {
      readonly type: "quote";
      readonly spans: readonly TextSpan[];
      readonly attribution?: string;
    };

export interface WritingPackagePage {
  /** Stable identity. Never derived from heading text. */
  readonly pageId: string;
  readonly role: PageRole;
  /** Public route or in-site destination, when the page has one. */
  readonly route?: string;
  readonly readingOrder: number;
  /** Default H1. Humans may edit this without changing `pageId`. */
  readonly title: string;
  readonly blocks: readonly ContentBlock[];
}

export interface WritingPackage {
  readonly schemaVersion: typeof WRITING_PACKAGE_SCHEMA_VERSION;
  readonly kind: ReviewKind;
  readonly packageId: string;
  readonly prospectId: string;
  readonly runId?: string;
  readonly businessName: string;
  readonly pages: readonly WritingPackagePage[];
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

export function namedRangeForPage(pageId: string): string {
  return `ffcf_page_${pageId.replace(/[^a-z0-9]+/g, "_")}`;
}

export function canonicalizeWritingPackage(pkg: WritingPackage): WritingPackage {
  const pages = [...pkg.pages]
    .map((page) => ({
      ...page,
      blocks: page.blocks.map(canonicalizeBlock),
    }))
    .sort((a, b) => a.readingOrder - b.readingOrder || a.pageId.localeCompare(b.pageId));
  const canonical: WritingPackage = {
    schemaVersion: WRITING_PACKAGE_SCHEMA_VERSION,
    kind: pkg.kind,
    packageId: pkg.packageId,
    prospectId: pkg.prospectId,
    businessName: pkg.businessName,
    pages,
  };
  if (pkg.runId !== undefined) {
    return { ...canonical, runId: pkg.runId };
  }
  return canonical;
}

export function writingPackageContentHash(pkg: WritingPackage): string {
  return sha256Hex(JSON.stringify(canonicalizeWritingPackage(pkg)));
}

export function validateWritingPackage(input: unknown): WritingPackage {
  if (!isRecord(input)) {
    throw new GoogleDocsError("invalid_writing_package", "Writing package must be an object.");
  }
  if (input.schemaVersion !== WRITING_PACKAGE_SCHEMA_VERSION) {
    throw new GoogleDocsError(
      "invalid_writing_package",
      `Unsupported writing package schemaVersion: ${String(input.schemaVersion)}`,
    );
  }
  if (typeof input.kind !== "string" || !isReviewKind(input.kind)) {
    throw new GoogleDocsError("invalid_writing_package", "Writing package kind is missing or unsupported.");
  }
  if (typeof input.packageId !== "string" || input.packageId.trim().length === 0) {
    throw new GoogleDocsError("invalid_writing_package", "Writing package packageId is required.");
  }
  if (typeof input.prospectId !== "string" || input.prospectId.trim().length === 0) {
    throw new GoogleDocsError("invalid_writing_package", "Writing package prospectId is required.");
  }
  if (typeof input.businessName !== "string" || input.businessName.trim().length === 0) {
    throw new GoogleDocsError("invalid_writing_package", "Writing package businessName is required.");
  }
  if (input.runId !== undefined && (typeof input.runId !== "string" || input.runId.trim().length === 0)) {
    throw new GoogleDocsError("invalid_writing_package", "runId must be a non-empty string when present.");
  }
  if (!Array.isArray(input.pages) || input.pages.length === 0) {
    throw new GoogleDocsError("invalid_writing_package", "Writing package pages are required.");
  }

  const pages = input.pages.map((page, index) => validatePage(page, index));
  const pageIds = new Set<string>();
  for (const page of pages) {
    if (pageIds.has(page.pageId)) {
      throw new GoogleDocsError("invalid_writing_package", `Duplicate pageId: ${page.pageId}`);
    }
    pageIds.add(page.pageId);
  }
  const orders = pages.map((page) => page.readingOrder);
  if (new Set(orders).size !== orders.length) {
    throw new GoogleDocsError("invalid_writing_package", "readingOrder values must be unique.");
  }

  if (input.kind === "website_copy") {
    validateWebsiteCopyShape(pages);
  } else {
    if (!pages.every((page) => page.role === "prescription")) {
      throw new GoogleDocsError(
        "invalid_writing_package",
        "Prescription packages may only contain prescription pages.",
      );
    }
  }

  const pkg: WritingPackage = {
    schemaVersion: WRITING_PACKAGE_SCHEMA_VERSION,
    kind: input.kind,
    packageId: input.packageId,
    prospectId: input.prospectId,
    businessName: input.businessName,
    pages,
  };
  if (typeof input.runId === "string") {
    return { ...pkg, runId: input.runId };
  }
  return pkg;
}

function validateWebsiteCopyShape(pages: readonly WritingPackagePage[]): void {
  const orderedRoles = [...pages]
    .sort((a, b) => a.readingOrder - b.readingOrder)
    .map((page) => page.role);
  if (orderedRoles.length !== WEBSITE_COPY_READING_ORDER.length) {
    throw new GoogleDocsError(
      "invalid_writing_package",
      "Website copy must contain homepage, two service pages, contact, header/footer, and strategy overview.",
    );
  }
  for (let i = 0; i < WEBSITE_COPY_READING_ORDER.length; i += 1) {
    if (orderedRoles[i] !== WEBSITE_COPY_READING_ORDER[i]) {
      throw new GoogleDocsError(
        "invalid_writing_package",
        "Website copy reading order must be homepage, two service pages, contact, header/footer, then strategy overview.",
      );
    }
  }
}

function validatePage(input: unknown, index: number): WritingPackagePage {
  if (!isRecord(input)) {
    throw new GoogleDocsError("invalid_writing_package", `Page ${index} must be an object.`);
  }
  if (typeof input.pageId !== "string" || !PAGE_ID_RE.test(input.pageId)) {
    throw new GoogleDocsError(
      "invalid_writing_package",
      `Page ${index} pageId must be a stable lowercase slug (not heading text).`,
    );
  }
  if (typeof input.role !== "string" || !isPageRole(input.role)) {
    throw new GoogleDocsError("invalid_writing_package", `Page ${input.pageId} has an unknown role.`);
  }
  if (typeof input.readingOrder !== "number" || !Number.isInteger(input.readingOrder) || input.readingOrder < 1) {
    throw new GoogleDocsError("invalid_writing_package", `Page ${input.pageId} readingOrder must be a positive integer.`);
  }
  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    throw new GoogleDocsError("invalid_writing_package", `Page ${input.pageId} title is required.`);
  }
  if (input.route !== undefined && (typeof input.route !== "string" || input.route.trim().length === 0)) {
    throw new GoogleDocsError("invalid_writing_package", `Page ${input.pageId} route must be a non-empty string when present.`);
  }
  if (!Array.isArray(input.blocks)) {
    throw new GoogleDocsError("invalid_writing_package", `Page ${input.pageId} blocks must be an array.`);
  }
  const pageId = input.pageId;
  const role = input.role;
  const title = input.title;
  const page: WritingPackagePage = {
    pageId,
    role,
    readingOrder: input.readingOrder,
    title,
    blocks: input.blocks.map((block, blockIndex) => validateBlock(block, pageId, blockIndex)),
  };
  if (typeof input.route === "string") {
    return { ...page, route: input.route };
  }
  return page;
}

function validateBlock(input: unknown, pageId: string, index: number): ContentBlock {
  if (!isRecord(input) || typeof input.type !== "string") {
    throw new GoogleDocsError("invalid_writing_package", `Page ${pageId} block ${index} is invalid.`);
  }
  switch (input.type) {
    case "heading": {
      if (input.level !== 1 && input.level !== 2 && input.level !== 3) {
        throw new GoogleDocsError("invalid_writing_package", `Page ${pageId} heading level must be 1, 2, or 3.`);
      }
      if (typeof input.text !== "string" || input.text.trim().length === 0) {
        throw new GoogleDocsError("invalid_writing_package", `Page ${pageId} heading text is required.`);
      }
      return { type: "heading", level: input.level, text: input.text };
    }
    case "paragraph":
      return { type: "paragraph", spans: validateSpans(input.spans, pageId, index) };
    case "list": {
      if (typeof input.ordered !== "boolean") {
        throw new GoogleDocsError("invalid_writing_package", `Page ${pageId} list ordered must be boolean.`);
      }
      if (!Array.isArray(input.items) || input.items.length === 0) {
        throw new GoogleDocsError("invalid_writing_package", `Page ${pageId} list items are required.`);
      }
      return {
        type: "list",
        ordered: input.ordered,
        items: input.items.map((item, itemIndex) => {
          if (!isRecord(item)) {
            throw new GoogleDocsError("invalid_writing_package", `Page ${pageId} list item ${itemIndex} is invalid.`);
          }
          return { spans: validateSpans(item.spans, pageId, index) };
        }),
      };
    }
    case "quote": {
      const quote: {
        type: "quote";
        spans: readonly TextSpan[];
        attribution?: string;
      } = { type: "quote", spans: validateSpans(input.spans, pageId, index) };
      if (input.attribution !== undefined) {
        if (typeof input.attribution !== "string" || input.attribution.trim().length === 0) {
          throw new GoogleDocsError("invalid_writing_package", `Page ${pageId} quote attribution is empty.`);
        }
        quote.attribution = input.attribution;
      }
      return quote;
    }
    default:
      throw new GoogleDocsError("invalid_writing_package", `Page ${pageId} block ${index} has unknown type ${input.type}.`);
  }
}

function validateSpans(input: unknown, pageId: string, index: number): readonly TextSpan[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new GoogleDocsError("invalid_writing_package", `Page ${pageId} block ${index} spans are required.`);
  }
  return input.map((span) => {
    if (!isRecord(span) || typeof span.text !== "string" || span.text.length === 0) {
      throw new GoogleDocsError("invalid_writing_package", `Page ${pageId} block ${index} has an empty text span.`);
    }
    const next: TextSpan = { text: span.text };
    if (span.bold === true) {
      return finishSpan(next, true, span.italic === true, span.href);
    }
    if (span.italic === true || typeof span.href === "string") {
      return finishSpan(next, false, span.italic === true, span.href);
    }
    return next;
  });
}

function finishSpan(base: TextSpan, bold: boolean, italic: boolean, href: unknown): TextSpan {
  const span: { text: string; bold?: true; italic?: true; href?: string } = { ...base };
  if (bold) span.bold = true;
  if (italic) span.italic = true;
  if (typeof href === "string") {
    if (!/^https?:\/\//i.test(href) && !href.startsWith("/")) {
      throw new GoogleDocsError("invalid_writing_package", `Unsupported link destination: ${href}`);
    }
    span.href = href;
  } else if (href !== undefined) {
    throw new GoogleDocsError("invalid_writing_package", "Link href must be a string.");
  }
  return span;
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
      const quote: { type: "quote"; spans: readonly TextSpan[]; attribution?: string } = {
        type: "quote",
        spans: block.spans.map(canonicalizeSpan),
      };
      if (block.attribution !== undefined) quote.attribution = block.attribution;
      return quote;
    }
  }
}

function canonicalizeSpan(span: TextSpan): TextSpan {
  const next: { text: string; bold?: true; italic?: true; href?: string } = { text: span.text };
  if (span.bold) next.bold = true;
  if (span.italic) next.italic = true;
  if (span.href !== undefined) next.href = span.href;
  return next;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
