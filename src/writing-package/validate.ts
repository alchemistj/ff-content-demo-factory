import { WritingPackageError } from "./errors.js";
import { sha256Hex } from "./hash.js";
import {
  PAGE_ID_RE,
  REVIEW_ID_RE,
  WEBSITE_COPY_READING_ORDER,
  WRITING_PACKAGE_VERSION,
  expectedAudience,
  isCopyAudience,
  isPageRole,
  isRecord,
  isReviewKind,
  pagesInReadingOrder,
  type ContentBlock,
  type TextSpan,
  type WritingPackage,
  type WritingPackagePage,
} from "./types.js";

export function canonicalizeWritingPackage(
  pkg: Omit<WritingPackage, "packageHash"> | WritingPackage,
): Omit<WritingPackage, "packageHash"> {
  const pages = pagesInReadingOrder(pkg).map((page) => ({
    ...page,
    blocks: page.blocks.map(canonicalizeBlock),
  }));
  return {
    version: WRITING_PACKAGE_VERSION,
    kind: pkg.kind,
    prospectId: pkg.prospectId,
    runId: pkg.runId,
    businessName: pkg.businessName,
    readingOrder: pages.map((page) => page.pageId),
    pages,
  };
}

export function hashWritingPages(pkg: Omit<WritingPackage, "packageHash"> | WritingPackage): string {
  return sha256Hex(JSON.stringify(canonicalizeWritingPackage(pkg)));
}

export function writingPackageContentHash(pkg: WritingPackage): string {
  return hashWritingPages(pkg);
}

export function buildWritingPackage(input: Omit<WritingPackage, "version" | "packageHash" | "readingOrder"> & {
  readonly readingOrder?: readonly string[];
}): WritingPackage {
  const pages = [...input.pages].sort((a, b) => a.readingOrder - b.readingOrder || a.pageId.localeCompare(b.pageId));
  const withoutHash: WritingPackage = {
    version: WRITING_PACKAGE_VERSION,
    kind: input.kind,
    prospectId: input.prospectId,
    runId: input.runId,
    businessName: input.businessName,
    readingOrder: input.readingOrder ?? pages.map((page) => page.pageId),
    pages,
    packageHash: "",
  };
  const pkg: WritingPackage = { ...withoutHash, packageHash: hashWritingPages(withoutHash) };
  return validateWritingPackage(pkg);
}

export function validateWritingPackage(input: unknown): WritingPackage {
  if (!isRecord(input)) {
    throw new WritingPackageError("Writing package must be an object.");
  }
  if (input.version !== WRITING_PACKAGE_VERSION) {
    throw new WritingPackageError(`Unsupported writing package version: ${String(input.version)}`);
  }
  if (typeof input.kind !== "string" || !isReviewKind(input.kind)) {
    throw new WritingPackageError("Writing package kind is missing or unsupported.");
  }
  if (typeof input.prospectId !== "string" || input.prospectId.trim().length === 0) {
    throw new WritingPackageError("Writing package prospectId is required.");
  }
  if (typeof input.runId !== "string" || input.runId.trim().length === 0) {
    throw new WritingPackageError("Writing package runId is required.");
  }
  if (typeof input.businessName !== "string" || input.businessName.trim().length === 0) {
    throw new WritingPackageError("Writing package businessName is required.");
  }
  if (!Array.isArray(input.pages) || input.pages.length === 0) {
    throw new WritingPackageError("Writing package pages are required.");
  }

  const pages = input.pages.map((page, index) => validatePage(page, index));
  const pageIds = new Set<string>();
  for (const page of pages) {
    if (pageIds.has(page.pageId)) {
      throw new WritingPackageError(`Duplicate pageId: ${page.pageId}`);
    }
    pageIds.add(page.pageId);
  }
  const orders = pages.map((page) => page.readingOrder);
  if (new Set(orders).size !== orders.length) {
    throw new WritingPackageError("readingOrder values must be unique.");
  }

  if (input.kind === "website_copy") {
    validateWebsiteCopyShape(pages);
  } else if (!pages.every((page) => page.role === "prescription")) {
    throw new WritingPackageError("Prescription packages may only contain prescription pages.");
  }

  const readingOrder = Array.isArray(input.readingOrder)
    ? input.readingOrder.map((id) => {
        if (typeof id !== "string") throw new WritingPackageError("readingOrder must be pageId strings.");
        return id;
      })
    : pagesInReadingOrder({ pages }).map((page) => page.pageId);

  const withoutHash: WritingPackage = {
    version: WRITING_PACKAGE_VERSION,
    kind: input.kind,
    prospectId: input.prospectId,
    runId: input.runId,
    businessName: input.businessName,
    readingOrder,
    pages,
    packageHash: "",
  };
  const packageHash = hashWritingPages(withoutHash);
  if (typeof input.packageHash === "string" && input.packageHash.length > 0 && input.packageHash !== packageHash) {
    throw new WritingPackageError("writing package hash does not match page content");
  }
  return { ...withoutHash, packageHash };
}

function validateWebsiteCopyShape(pages: readonly WritingPackagePage[]): void {
  const orderedRoles = [...pages]
    .sort((a, b) => a.readingOrder - b.readingOrder)
    .map((page) => page.role);
  if (orderedRoles.length !== WEBSITE_COPY_READING_ORDER.length) {
    throw new WritingPackageError(
      "Website copy must contain homepage, two service pages, contact, header/footer, and strategy overview.",
    );
  }
  for (let i = 0; i < WEBSITE_COPY_READING_ORDER.length; i += 1) {
    if (orderedRoles[i] !== WEBSITE_COPY_READING_ORDER[i]) {
      throw new WritingPackageError(
        "Website copy reading order must be homepage, two service pages, contact, header/footer, then strategy overview.",
      );
    }
  }
}

function validatePage(input: unknown, index: number): WritingPackagePage {
  if (!isRecord(input)) {
    throw new WritingPackageError(`Page ${index} must be an object.`);
  }
  if (typeof input.pageId !== "string" || !PAGE_ID_RE.test(input.pageId)) {
    throw new WritingPackageError(`Page ${index} pageId must be a stable lowercase slug (not heading text).`);
  }
  const pageId = input.pageId;
  if (typeof input.role !== "string" || !isPageRole(input.role)) {
    throw new WritingPackageError(`Page ${pageId} has an unknown role.`);
  }
  if (typeof input.readingOrder !== "number" || !Number.isInteger(input.readingOrder) || input.readingOrder < 1) {
    throw new WritingPackageError(`Page ${pageId} readingOrder must be a positive integer.`);
  }
  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    throw new WritingPackageError(`Page ${pageId} title is required.`);
  }
  if (input.route !== undefined && (typeof input.route !== "string" || input.route.trim().length === 0)) {
    throw new WritingPackageError(`Page ${pageId} route must be a non-empty string when present.`);
  }
  if (!Array.isArray(input.blocks)) {
    throw new WritingPackageError(`Page ${pageId} blocks must be an array.`);
  }
  const audience =
    typeof input.audience === "string" && isCopyAudience(input.audience)
      ? input.audience
      : expectedAudience(input.role);
  if (audience !== expectedAudience(input.role)) {
    throw new WritingPackageError(`Page ${pageId} audience does not match role ${input.role}.`);
  }
  const page: WritingPackagePage = {
    pageId,
    role: input.role,
    audience,
    readingOrder: input.readingOrder,
    title: input.title,
    blocks: input.blocks.map((block, blockIndex) => validateBlock(block, pageId, blockIndex)),
  };
  if (typeof input.route === "string") {
    return { ...page, route: input.route };
  }
  return page;
}

function validateBlock(input: unknown, pageId: string, index: number): ContentBlock {
  if (!isRecord(input) || typeof input.type !== "string") {
    throw new WritingPackageError(`Page ${pageId} block ${index} is invalid.`);
  }
  switch (input.type) {
    case "heading": {
      if (input.level !== 1 && input.level !== 2 && input.level !== 3) {
        throw new WritingPackageError(`Page ${pageId} heading level must be 1, 2, or 3.`);
      }
      if (typeof input.text !== "string" || input.text.trim().length === 0) {
        throw new WritingPackageError(`Page ${pageId} heading text is required.`);
      }
      return { type: "heading", level: input.level, text: input.text };
    }
    case "paragraph":
      return { type: "paragraph", spans: validateSpans(input.spans, pageId, index) };
    case "list": {
      if (typeof input.ordered !== "boolean") {
        throw new WritingPackageError(`Page ${pageId} list ordered must be boolean.`);
      }
      if (!Array.isArray(input.items) || input.items.length === 0) {
        throw new WritingPackageError(`Page ${pageId} list items are required.`);
      }
      return {
        type: "list",
        ordered: input.ordered,
        items: input.items.map((item, itemIndex) => {
          if (!isRecord(item)) {
            throw new WritingPackageError(`Page ${pageId} list item ${itemIndex} is invalid.`);
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
        reviewId?: string;
      } = { type: "quote", spans: validateSpans(input.spans, pageId, index) };
      if (input.attribution !== undefined) {
        if (typeof input.attribution !== "string" || input.attribution.trim().length === 0) {
          throw new WritingPackageError(`Page ${pageId} quote attribution is empty.`);
        }
        quote.attribution = input.attribution;
      }
      if (input.reviewId !== undefined) {
        if (typeof input.reviewId !== "string" || !REVIEW_ID_RE.test(input.reviewId)) {
          throw new WritingPackageError(`Page ${pageId} quote reviewId is invalid.`);
        }
        quote.reviewId = input.reviewId;
      }
      return quote;
    }
    default:
      throw new WritingPackageError(`Page ${pageId} block ${index} has unknown type ${input.type}.`);
  }
}

function validateSpans(input: unknown, pageId: string, index: number): readonly TextSpan[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new WritingPackageError(`Page ${pageId} block ${index} spans are required.`);
  }
  return input.map((span) => {
    if (!isRecord(span) || typeof span.text !== "string" || span.text.length === 0) {
      throw new WritingPackageError(`Page ${pageId} block ${index} has an empty text span.`);
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
      throw new WritingPackageError(`Unsupported link destination: ${href}`);
    }
    span.href = href;
  } else if (href !== undefined) {
    throw new WritingPackageError("Link href must be a string.");
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
      const quote: { type: "quote"; spans: readonly TextSpan[]; attribution?: string; reviewId?: string } = {
        type: "quote",
        spans: block.spans.map(canonicalizeSpan),
      };
      if (block.attribution !== undefined) quote.attribution = block.attribution;
      if (block.reviewId !== undefined) quote.reviewId = block.reviewId;
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
