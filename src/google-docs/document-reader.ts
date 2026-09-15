import { GoogleDocsError } from "./errors.js";
import type { DocsBody, DocsDocument, DocsNamedRanges, DocsStructuralElement, DocsTab } from "./google-rest.js";
import { namedRangeForPage, parseQuoteNamedRange } from "./named-ranges.js";
import { isSeoMetadataLine, parseMetaDescriptionLine, parseSeoTitleLine } from "./seo-lines.js";
import { buildWritingPackage, type ContentBlock, type PageRole, type TextSpan, type WritingPackage, type WritingPackagePage } from "../writing-package/index.js";

export interface ImportReadback {
  readonly documentId: string;
  readonly revisionId?: string;
  readonly title: string;
  readonly pages: readonly WritingPackagePage[];
  readonly unmatchedTabs: readonly string[];
}

export function assertImportableDocument(document: DocsDocument): {
  readonly body: DocsBody;
  readonly tabTitle?: string;
} {
  const suggestionIds = collectSuggestionIds(document);
  if (suggestionIds.length > 0) {
    throw new GoogleDocsError(
      "unresolved_suggestions",
      `Document has unresolved suggestions (${suggestionIds.slice(0, 5).join(", ")}). Accept or reject them in Google Docs before import. Comments remain review material and are not imported as copy.`,
    );
  }

  const tabs = flattenTabs(document.tabs ?? []);
  const contentTabs = tabs.filter((tab) => bodyHasText(tab.body));
  if (tabs.length > 0) {
    if (contentTabs.length > 1) {
      throw new GoogleDocsError(
        "multiple_content_tabs",
        `Document has multiple tabs with content (${contentTabs.map((tab) => tab.title).join(", ")}). Keep review copy on one tab before import.`,
      );
    }
    const only = contentTabs[0];
    if (!only?.body) {
      throw new GoogleDocsError("import_identity_mismatch", "Document tabs were present but none contained importable copy.");
    }
    const result: { body: DocsBody; tabTitle?: string } = { body: only.body };
    if (only.title) return { ...result, tabTitle: only.title };
    return result;
  }
  if (!document.body) {
    throw new GoogleDocsError("import_identity_mismatch", "Document body was empty and no tabs were returned.");
  }
  return { body: document.body };
}

export function importPagesFromDocument(
  document: DocsDocument,
  expected: readonly Pick<WritingPackagePage, "pageId" | "role" | "readingOrder" | "route" | "audience">[],
): ImportReadback {
  const { body } = assertImportableDocument(document);
  const ranges = namedRangeMap(document.namedRanges);
  const paragraphs = paragraphsFromBody(body, document);
  const pages: WritingPackagePage[] = [];

  for (const expectedPage of [...expected].sort((a, b) => a.readingOrder - b.readingOrder)) {
    const name = namedRangeForPage(expectedPage.pageId);
    const range = ranges.get(name);
    if (!range) {
      throw new GoogleDocsError(
        "import_identity_mismatch",
        `Named range ${name} is missing. Page identities are stored separately from heading text; restoring that range is required so an edited H1 cannot reassign the page.`,
      );
    }
    const slice = paragraphs.filter((paragraph) =>
      paragraph.start >= range.startIndex && paragraph.end <= range.endIndex,
    );
    if (slice.length === 0) {
      throw new GoogleDocsError("import_identity_mismatch", `Named range ${name} did not cover any paragraphs.`);
    }
    pages.push(blocksFromParagraphs(expectedPage, slice, ranges));
  }

  const result: ImportReadback = {
    documentId: document.documentId ?? "",
    title: document.title ?? "",
    pages,
    unmatchedTabs: [],
  };
  if (document.revisionId !== undefined) {
    return { ...result, revisionId: document.revisionId };
  }
  return result;
}

export function importedPackageFromReadback(
  original: WritingPackage,
  readback: ImportReadback,
): WritingPackage {
  return buildWritingPackage({
    kind: original.kind,
    packageId: original.packageId,
    prospectId: original.prospectId,
    runId: original.runId,
    businessName: original.businessName,
    pages: readback.pages,
  });
}

interface ParagraphRead {
  readonly start: number;
  readonly end: number;
  readonly namedStyleType: string;
  readonly list?: "UL" | "OL";
  readonly spans: TextSpan[];
  readonly raw: string;
}

function paragraphsFromBody(body: DocsBody, document: DocsDocument): ParagraphRead[] {
  const out: ParagraphRead[] = [];
  for (const element of body.content ?? []) {
    const paragraph = element.paragraph;
    if (!paragraph) continue;
    const namedStyleType = paragraph.paragraphStyle?.namedStyleType ?? "NORMAL_TEXT";
    const spans: TextSpan[] = [];
    let raw = "";
    for (const el of paragraph.elements ?? []) {
      const content = el.textRun?.content ?? "";
      raw += content;
      const withoutNewline = content.replace(/\n$/, "");
      if (withoutNewline.length === 0) continue;
      spans.push(spanFromTextRun(withoutNewline, el.textRun?.textStyle));
    }
    const start = element.startIndex ?? 0;
    const end = element.endIndex ?? start;
    const item: ParagraphRead = {
      start,
      end,
      namedStyleType,
      spans: spans.length > 0 ? spans : [{ text: raw.replace(/\n+$/, "") || "" }],
      raw: raw.replace(/\n+$/, ""),
    };
    const list = listKind(paragraph.bullet?.listId, document);
    if (list) {
      out.push({ ...item, list });
    } else {
      out.push(item);
    }
  }
  return out;
}

function listKind(listId: string | undefined, document: DocsDocument): "UL" | "OL" | undefined {
  if (!listId) return undefined;
  const glyph = document.lists?.[listId]?.listProperties?.nestingLevels?.[0]?.glyphType ?? "";
  if (/DECIMAL|DECIMAL_NESTED|UPPER|LOWER|ROMAN|ALPHA/i.test(glyph)) return "OL";
  return "UL";
}

function blocksFromParagraphs(
  expected: Pick<WritingPackagePage, "pageId" | "role" | "readingOrder" | "route" | "audience">,
  paragraphs: readonly ParagraphRead[],
  ranges: Map<string, { startIndex: number; endIndex: number }>,
): WritingPackagePage {
  const titleParagraph = paragraphs.find((paragraph) => paragraph.namedStyleType === "HEADING_1") ?? paragraphs[0];
  const title = titleParagraph?.raw ?? expected.pageId;
  const rest = paragraphs.filter((paragraph) => paragraph !== titleParagraph);
  let offset = 0;
  if (rest[0] && isIdentityLine(rest[0].raw)) offset = 1;
  let seoTitle: string | undefined;
  let metaDescription: string | undefined;
  while (offset < rest.length) {
    const raw = rest[offset]?.raw ?? "";
    const parsedTitle = parseSeoTitleLine(raw);
    if (parsedTitle !== undefined) {
      seoTitle = parsedTitle;
      offset += 1;
      continue;
    }
    const parsedMeta = parseMetaDescriptionLine(raw);
    if (parsedMeta !== undefined) {
      metaDescription = parsedMeta;
      offset += 1;
      continue;
    }
    if (isIdentityLine(raw) || isSeoMetadataLine(raw)) {
      offset += 1;
      continue;
    }
    break;
  }
  const blocks: ContentBlock[] = [];
  for (let i = offset; i < rest.length; i += 1) {
    const paragraph = rest[i];
    if (!paragraph) continue;
    if (paragraph.namedStyleType === "HEADING_1") {
      blocks.push({ type: "heading", level: 1, text: paragraph.raw });
      continue;
    }
    if (paragraph.namedStyleType === "HEADING_2") {
      blocks.push({ type: "heading", level: 2, text: paragraph.raw });
      continue;
    }
    if (paragraph.namedStyleType === "HEADING_3") {
      blocks.push({ type: "heading", level: 3, text: paragraph.raw });
      continue;
    }
    if (paragraph.list) {
      const items = [{ spans: paragraph.spans }];
      while (rest[i + 1]?.list) {
        i += 1;
        const next = rest[i];
        if (next) items.push({ spans: next.spans });
      }
      blocks.push({ type: "list", ordered: paragraph.list === "OL", items });
      continue;
    }
    const reviewId = reviewIdForParagraph(expected.pageId, paragraph, ranges);
    const attribution = rest[i + 1]?.raw.startsWith("— ") ? rest[i + 1]?.raw.replace(/^— /, "") ?? "" : "";
    if (attribution && (reviewId || isItalicParagraph(paragraph))) {
      i += 1;
      const quote: {
        type: "quote";
        spans: TextSpan[];
        attribution: string;
        reviewId?: string;
      } = {
        type: "quote",
        spans: paragraph.spans.map(stripForcedItalic),
        attribution,
      };
      if (reviewId) quote.reviewId = reviewId;
      blocks.push(quote);
      continue;
    }
    if (paragraph.raw.length === 0) continue;
    blocks.push({ type: "paragraph", spans: paragraph.spans });
  }
  const page: WritingPackagePage = {
    pageId: expected.pageId,
    role: expected.role as PageRole,
    audience: expected.audience,
    readingOrder: expected.readingOrder,
    title,
    blocks,
  };
  const withRoute = expected.route !== undefined ? { ...page, route: expected.route } : page;
  const withSeoTitle = seoTitle !== undefined ? { ...withRoute, seoTitle } : withRoute;
  return metaDescription !== undefined ? { ...withSeoTitle, metaDescription } : withSeoTitle;
}

function reviewIdForParagraph(
  pageId: string,
  paragraph: ParagraphRead,
  ranges: Map<string, { startIndex: number; endIndex: number }>,
): string | undefined {
  for (const [name, range] of ranges) {
    const parsed = parseQuoteNamedRange(name);
    if (!parsed || parsed.pageId !== pageId) continue;
    const overlaps = paragraph.start < range.endIndex && paragraph.end > range.startIndex;
    if (overlaps) {
      return parsed.reviewId;
    }
  }
  return undefined;
}

function isIdentityLine(raw: string): boolean {
  return (
    raw.startsWith("Customer-facing") ||
    raw.startsWith("Shared header") ||
    raw.startsWith("Owner-facing") ||
    raw.startsWith("Prescription for human review")
  );
}

function isItalicParagraph(paragraph: ParagraphRead): boolean {
  return paragraph.spans.length > 0 && paragraph.spans.every((span) => span.italic);
}

function stripForcedItalic(span: TextSpan): TextSpan {
  const next: { text: string; bold?: true; italic?: true; href?: string } = { text: span.text };
  if (span.bold) next.bold = true;
  if (span.href !== undefined) next.href = span.href;
  return next;
}

function spanFromTextRun(
  text: string,
  style: { bold?: boolean; italic?: boolean; link?: { url?: string } } | undefined,
): TextSpan {
  const span: { text: string; bold?: true; italic?: true; href?: string } = { text };
  if (style?.bold) span.bold = true;
  if (style?.italic) span.italic = true;
  if (style?.link?.url) span.href = style.link.url;
  return span;
}

function namedRangeMap(namedRanges: Record<string, DocsNamedRanges> | undefined): Map<string, { startIndex: number; endIndex: number }> {
  const map = new Map<string, { startIndex: number; endIndex: number }>();
  if (!namedRanges) return map;
  for (const [name, group] of Object.entries(namedRanges)) {
    const range = group.namedRanges?.[0]?.ranges?.[0];
    if (range) map.set(name, { startIndex: range.startIndex, endIndex: range.endIndex });
  }
  return map;
}

function flattenTabs(tabs: readonly DocsTab[]): { title: string; body?: DocsBody }[] {
  const out: { title: string; body?: DocsBody }[] = [];
  for (const tab of tabs) {
    const title = tab.tabProperties?.title ?? tab.tabProperties?.tabId ?? "untitled";
    const item: { title: string; body?: DocsBody } = { title };
    if (tab.documentTab?.body) item.body = tab.documentTab.body;
    out.push(item);
    if (tab.childTabs) out.push(...flattenTabs(tab.childTabs));
  }
  return out;
}

function bodyHasText(body: DocsBody | undefined): boolean {
  if (!body?.content) return false;
  return body.content.some((element) => paragraphText(element).trim().length > 0);
}

function paragraphText(element: DocsStructuralElement): string {
  return (element.paragraph?.elements ?? []).map((el) => el.textRun?.content ?? "").join("");
}

export function collectSuggestionIds(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectSuggestionIds(item, found);
    return found;
  }
  if (!value || typeof value !== "object") return found;
  const record = value as Record<string, unknown>;
  for (const [key, nested] of Object.entries(record)) {
    if (
      (key === "suggestedInsertionIds" || key === "suggestedDeletionIds") &&
      Array.isArray(nested)
    ) {
      for (const id of nested) {
        if (typeof id === "string" && !found.includes(id)) found.push(id);
      }
    }
    if (key.startsWith("suggested") && key.endsWith("Changes") && nested && typeof nested === "object" && Object.keys(nested as object).length > 0) {
      if (!found.includes(key)) found.push(key);
    }
    collectSuggestionIds(nested, found);
  }
  return found;
}

export function documentEndIndex(document: DocsDocument): number {
  const { body } = assertImportableDocument(document);
  const content = body.content ?? [];
  const last = content[content.length - 1];
  return last?.endIndex ?? 1;
}
