import { reviewDocumentTitle, type ContentBlock, type TextSpan, type WritingPackage, type WritingPackagePage } from "../writing-package/index.js";
import { namedRangeForPage, namedRangeForQuote } from "./named-ranges.js";
import { metaDescriptionLine, seoTitleLine } from "./seo-lines.js";
import type { DocsRequest } from "./google-rest.js";

const HEADING_STYLE: Record<1 | 2 | 3, string> = {
  1: "HEADING_1",
  2: "HEADING_2",
  3: "HEADING_3",
};

const ROLE_ROUTE_LABEL: Record<string, string> = {
  homepage: "Customer-facing page",
  service: "Customer-facing service page",
  contact: "Customer-facing page",
  header_footer: "Shared header and footer copy. Not a public page of its own.",
  strategy_overview: "Owner-facing strategy overview. Not customer-facing website copy.",
  prescription: "Prescription for human review. Not website copy.",
};

export interface PageRangePlan {
  readonly pageId: string;
  readonly role: WritingPackagePage["role"];
  readonly namedRange: string;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly title: string;
  readonly route?: string;
}

export interface BuiltNativeDocument {
  readonly title: string;
  readonly insertText: string;
  readonly requests: readonly DocsRequest[];
  readonly pageRanges: readonly PageRangePlan[];
}

interface ParagraphPlan {
  readonly start: number;
  readonly end: number;
  readonly namedStyleType: string;
  readonly bullet?: "UL" | "OL";
  readonly spans: readonly { start: number; end: number; span: TextSpan }[];
}

/**
 * Convert a writing package into native Google Docs requests.
 * This is not a Markdown dump: headings, lists, quotes, links, and emphasis
 * are expressed as Docs named styles and text styles.
 */
export function buildNativeDocument(pkg: WritingPackage, version?: number): BuiltNativeDocument {
  const title = reviewDocumentTitle(pkg, version);
  const pages = pagesInReadingOrder(pkg.pages);
  const paragraphs: ParagraphPlan[] = [];
  const pageRanges: PageRangePlan[] = [];
  const quoteRanges: { name: string; startIndex: number; endIndex: number }[] = [];
  let cursor = 1;
  let text = "";

  for (const [index, page] of pages.entries()) {
    if (index > 0) {
      cursor = pushParagraph(paragraphs, text, cursor, [{ text: "" }], "NORMAL_TEXT");
      text = applyParagraphText(text, [{ text: "" }]);
    }
    const pageStart = cursor;
    cursor = pushParagraph(paragraphs, text, cursor, [{ text: page.title }], "HEADING_1");
    text = applyParagraphText(text, [{ text: page.title }]);

    const identity = identityLine(page);
    cursor = pushParagraph(paragraphs, text, cursor, [{ text: identity }], "NORMAL_TEXT");
    text = applyParagraphText(text, [{ text: identity }]);

    if (page.seoTitle) {
      const line = seoTitleLine(page.seoTitle);
      cursor = pushParagraph(paragraphs, text, cursor, [{ text: line }], "NORMAL_TEXT");
      text = applyParagraphText(text, [{ text: line }]);
    }
    if (page.metaDescription) {
      const line = metaDescriptionLine(page.metaDescription);
      cursor = pushParagraph(paragraphs, text, cursor, [{ text: line }], "NORMAL_TEXT");
      text = applyParagraphText(text, [{ text: line }]);
    }

    const blocks = blocksWithoutLeadingH1(page);
    for (const block of blocks) {
      const quoteStart = cursor;
      const pushed = pushBlock(paragraphs, text, cursor, block);
      text = pushed.text;
      cursor = pushed.cursor;
      if (block.type === "quote" && block.reviewId) {
        quoteRanges.push({
          name: namedRangeForQuote(page.pageId, block.reviewId),
          startIndex: quoteStart,
          endIndex: quoteStart + utf16Length(`${block.spans.map((span) => span.text).join("")}\n`),
        });
      }
    }
    const range: PageRangePlan = {
      pageId: page.pageId,
      role: page.role,
      namedRange: namedRangeForPage(page.pageId),
      startIndex: pageStart,
      endIndex: cursor,
      title: page.title,
    };
    if (page.route !== undefined) {
      pageRanges.push({ ...range, route: page.route });
    } else {
      pageRanges.push(range);
    }
  }

  const requests: DocsRequest[] = [{ insertText: { location: { index: 1 }, text } }];
  for (const paragraph of paragraphs) {
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: paragraph.start, endIndex: paragraph.end },
        paragraphStyle: { namedStyleType: paragraph.namedStyleType },
        fields: "namedStyleType",
      },
    });
    if (paragraph.namedStyleType.startsWith("HEADING_")) {
      requests.push({
        updateTextStyle: {
          range: { startIndex: paragraph.start, endIndex: Math.max(paragraph.start, paragraph.end - 1) },
          textStyle: { bold: false },
          fields: "bold",
        },
      });
    }
    for (const run of paragraph.spans) {
      const fields = styleFields(run.span);
      if (!fields) continue;
      requests.push({
        updateTextStyle: {
          range: { startIndex: run.start, endIndex: run.end },
          textStyle: textStyleFromSpan(run.span),
          fields,
        },
      });
    }
    if (paragraph.bullet === "UL") {
      requests.push({
        createParagraphBullets: {
          range: { startIndex: paragraph.start, endIndex: paragraph.end },
          bulletPreset: "BULLET_DISC_CIRCLE_SQUARE",
        },
      });
    }
    if (paragraph.bullet === "OL") {
      requests.push({
        createParagraphBullets: {
          range: { startIndex: paragraph.start, endIndex: paragraph.end },
          bulletPreset: "NUMBERED_DECIMAL_NESTED",
        },
      });
    }
  }
  for (const page of pageRanges) {
    requests.push({
      createNamedRange: {
        name: page.namedRange,
        range: { startIndex: page.startIndex, endIndex: page.endIndex },
      },
    });
  }
  for (const quote of quoteRanges) {
    requests.push({
      createNamedRange: {
        name: quote.name,
        range: { startIndex: quote.startIndex, endIndex: quote.endIndex },
      },
    });
  }

  return { title, insertText: text, requests, pageRanges };
}

function pagesInReadingOrder(pages: readonly WritingPackagePage[]): readonly WritingPackagePage[] {
  return [...pages].sort((a, b) => a.readingOrder - b.readingOrder || a.pageId.localeCompare(b.pageId));
}

function identityLine(page: WritingPackagePage): string {
  const role = ROLE_ROUTE_LABEL[page.role] ?? "Review section";
  if (page.route) return `${role}. Destination: ${page.route}`;
  return role;
}

function blocksWithoutLeadingH1(page: WritingPackagePage): readonly ContentBlock[] {
  const first = page.blocks[0];
  if (first?.type === "heading" && first.level === 1 && first.text === page.title) {
    return page.blocks.slice(1);
  }
  return page.blocks;
}

function pushBlock(
  paragraphs: ParagraphPlan[],
  text: string,
  cursor: number,
  block: ContentBlock,
): { text: string; cursor: number } {
  switch (block.type) {
    case "heading": {
      const nextCursor = pushParagraph(paragraphs, text, cursor, [{ text: block.text }], HEADING_STYLE[block.level]);
      return { text: applyParagraphText(text, [{ text: block.text }]), cursor: nextCursor };
    }
    case "paragraph": {
      const nextCursor = pushParagraph(paragraphs, text, cursor, block.spans, "NORMAL_TEXT");
      return { text: applyParagraphText(text, block.spans), cursor: nextCursor };
    }
    case "list": {
      let nextText = text;
      let nextCursor = cursor;
      for (const item of block.items) {
        nextCursor = pushParagraph(paragraphs, nextText, nextCursor, item.spans, "NORMAL_TEXT", block.ordered ? "OL" : "UL");
        nextText = applyParagraphText(nextText, item.spans);
      }
      return { text: nextText, cursor: nextCursor };
    }
    case "quote": {
      let nextText = text;
      let nextCursor = pushParagraph(paragraphs, text, cursor, withItalic(block.spans), "NORMAL_TEXT");
      nextText = applyParagraphText(nextText, withItalic(block.spans));
      if (block.attribution) {
        const attribution: TextSpan[] = [{ text: `— ${block.attribution}` }];
        nextCursor = pushParagraph(paragraphs, nextText, nextCursor, attribution, "NORMAL_TEXT");
        nextText = applyParagraphText(nextText, attribution);
      }
      return { text: nextText, cursor: nextCursor };
    }
  }
}

function pushParagraph(
  paragraphs: ParagraphPlan[],
  text: string,
  start: number,
  spans: readonly TextSpan[],
  namedStyleType: string,
  bullet?: "UL" | "OL",
): number {
  const line = spans.map((span) => span.text).join("");
  const end = start + utf16Length(`${line}\n`);
  let runStart = start;
  const runs: { start: number; end: number; span: TextSpan }[] = [];
  for (const span of spans) {
    const runEnd = runStart + utf16Length(span.text);
    runs.push({ start: runStart, end: runEnd, span });
    runStart = runEnd;
  }
  const plan: ParagraphPlan = { start, end, namedStyleType, spans: runs };
  if (bullet) {
    paragraphs.push({ ...plan, bullet });
  } else {
    paragraphs.push(plan);
  }
  void text;
  return end;
}

function applyParagraphText(text: string, spans: readonly TextSpan[]): string {
  return `${text}${spans.map((span) => span.text).join("")}\n`;
}

function withItalic(spans: readonly TextSpan[]): readonly TextSpan[] {
  return spans.map((span) => {
    const next: { text: string; bold?: true; italic?: true; href?: string } = { text: span.text, italic: true };
    if (span.bold) next.bold = true;
    if (span.href !== undefined) next.href = span.href;
    return next;
  });
}

function textStyleFromSpan(span: TextSpan): { bold?: boolean; italic?: boolean; link?: { url: string } } {
  const style: { bold?: boolean; italic?: boolean; link?: { url: string } } = {};
  if (span.bold) style.bold = true;
  if (span.italic) style.italic = true;
  if (span.href) style.link = { url: span.href };
  return style;
}

function styleFields(span: TextSpan): string | undefined {
  const fields: string[] = [];
  if (span.bold) fields.push("bold");
  if (span.italic) fields.push("italic");
  if (span.href) fields.push("link");
  return fields.length > 0 ? fields.join(",") : undefined;
}

export function utf16Length(value: string): number {
  return value.length;
}

export function looksLikeMarkdownDump(text: string): boolean {
  return /(^|\n)#{1,6}\s/.test(text) || /(^|\n)\*\s/.test(text) || /\*\*[^*]+\*\*/.test(text);
}
