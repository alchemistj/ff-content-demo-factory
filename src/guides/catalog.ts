export interface GuideSource {
  readonly id: string;
  readonly title: string;
  readonly url?: string;
  readonly kind?: string;
  readonly content?: string;
}

export type WriterStage = 'writer1' | 'writer2' | 'writer3';

/**
 * The guide catalog is deliberately a closed set.  A production provider may
 * retrieve these documents from Google Drive, but it must receive one of
 * these records; the writer pipeline never searches for, discovers, or
 * falls back to older guide versions.
 */
export const GUIDE_SOURCES = Object.freeze({
  general: Object.freeze({
    id: 'general',
    title: 'Fluid Frame Demo Writing Guide',
    url: 'https://docs.google.com/document/d/10xIuYOon6zxWbatccGVU66BccbPaT2VyFsbCJfYnSSo',
  }),
  service: Object.freeze({
    id: 'service',
    title: 'Service Page Guide',
    url: 'https://docs.google.com/document/d/1MCZPwhj3FzRfZPNERx-HmOgeymSyiZ8XFuRPozdm2rk',
  }),
  homepage: Object.freeze({
    id: 'homepage',
    title: 'Homepage Guide',
    url: 'https://docs.google.com/document/d/1yLw8LCQys_SLyqmwDgOWdM-FkW03ZAa7AqvVqPIEK8A',
  }),
  contact: Object.freeze({
    id: 'contact',
    title: 'Contact Page Guide',
    url: 'https://docs.google.com/document/d/10dJ6h42fkmwUvAyhi2FZ8uY8EHlcdFwa_lKAwe1K2l0',
  }),
  headerFooter: Object.freeze({
    id: 'headerFooter',
    title: 'Header & Footer Guide',
    url: 'https://docs.google.com/document/d/1MNBqqdzKsrqOp6tWgb79oOoukXzo6cbMmaFb7JEeBTU',
  }),
  writerReadme: Object.freeze({
    id: 'writerReadme',
    title: 'Writer Guides README',
    url: 'https://docs.google.com/document/d/1cVBPXF-wFMTatnN7jIH01M-sUzm2I0aIENNKBcBuzdg',
  }),
});

// Strategy instructions are part of the new runtime contract, rather than a
// deprecated/discoverable document.  Keep them in a provider-shaped record so
// the same loader can deliver them alongside the canonical documents.
export const STRATEGY_INSTRUCTIONS = Object.freeze({
  id: 'strategy',
  title: 'Strategy Overview Instructions',
  kind: 'runtime',
  content: [
    'Write only the Strategy Overview at /.',
    'Describe the completed website that actually exists.',
    'Business-facing pages may not mention the demo, audit, or Fluid Frame.',
    'Keep the overview concise, prospect-facing, and grounded in the audit and prescription.',
  ].join(' '),
});

export const STAGE_GUIDES: Readonly<Record<WriterStage, readonly string[]>> = Object.freeze({
  writer1: Object.freeze(['general', 'service']),
  writer2: Object.freeze(['general', 'homepage', 'contact', 'headerFooter']),
  writer3: Object.freeze(['general', 'strategy']),
});

export function stageGuideIds(stage: WriterStage): string[] {
  const ids = STAGE_GUIDES[stage];
  if (!ids) throw new Error(`Unknown writer stage: ${stage}`);
  return [...ids];
}
