/**
 * Durable machine metadata for page identity and quote source identity.
 * These names are never inserted as visible document text.
 *
 * Google named-range names are restricted to letters, numbers, and
 * underscores. Page slugs use hyphen ↔ underscore. reviewId is encoded so
 * dots/hyphens round-trip without appearing in the Doc body.
 */

export function namedRangeForPage(pageId: string): string {
  return `ffcf_page_${encodePageId(pageId)}`;
}

export function namedRangeForQuote(pageId: string, reviewId: string): string {
  return `ffcf_rev_${encodePageId(pageId)}__${encodeReviewId(reviewId)}`;
}

export function parseQuoteNamedRange(name: string): { pageId: string; reviewId: string } | undefined {
  const match = /^ffcf_rev_([A-Za-z0-9_]+)__(.+)$/.exec(name);
  if (!match?.[1] || !match[2]) return undefined;
  return { pageId: decodePageId(match[1]), reviewId: decodeReviewId(match[2]) };
}

export function parsePageNamedRange(name: string): string | undefined {
  const match = /^ffcf_page_([A-Za-z0-9_]+)$/.exec(name);
  return match?.[1] ? decodePageId(match[1]) : undefined;
}

function encodePageId(pageId: string): string {
  return pageId.replace(/-/g, "_");
}

function decodePageId(encoded: string): string {
  return encoded.replace(/_/g, "-");
}

function encodeReviewId(reviewId: string): string {
  return [...reviewId]
    .map((ch) => (/[A-Za-z0-9]/.test(ch) ? ch : `_${ch.charCodeAt(0).toString(16).padStart(2, "0")}`))
    .join("");
}

function decodeReviewId(encoded: string): string {
  return encoded.replace(/_([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}
