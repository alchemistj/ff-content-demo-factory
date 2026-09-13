/**
 * Heading metadata derived from raw Markdown. This is not a second source of
 * truth — writers must use `markdown` on the loaded guide.
 */
export interface GuideHeading {
  readonly level: number;
  readonly title: string;
  readonly startOffset: number;
}

const HEADING_RE = /^(#{1,6})[ \t]+(.+?)\s*$/gm;

export function parseHeadings(markdown: string): readonly GuideHeading[] {
  const headings: GuideHeading[] = [];
  for (const match of markdown.matchAll(HEADING_RE)) {
    const marks = match[1];
    const title = match[2];
    if (!marks || title === undefined || match.index === undefined) continue;
    headings.push({
      level: marks.length,
      title,
      startOffset: match.index,
    });
  }
  return headings;
}
