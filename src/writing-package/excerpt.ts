/**
 * Quoted review text may be the full source or a contiguous excerpt.
 * Only harmless whitespace / line-break differences are normalized.
 * Paraphrase inside quotation marks is not allowed.
 */
export function normalizeReviewText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function isFaithfulReviewExcerpt(sourceExactText: string, quotedText: string): boolean {
  const source = normalizeReviewText(sourceExactText);
  const quoted = normalizeReviewText(quotedText);
  if (!quoted) return false;
  return source.includes(quoted);
}

export function plainTextFromSpans(spans: readonly { readonly text: string }[]): string {
  return spans.map((span) => span.text).join("");
}
