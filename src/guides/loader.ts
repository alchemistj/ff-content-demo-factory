import {
  GUIDE_SOURCES,
  STRATEGY_INSTRUCTIONS,
  stageGuideIds,
} from './catalog.js';
import type { GuideSource, WriterStage } from './catalog.js';

export type GuideProviderResult = string | { content?: string; [key: string]: unknown } | null | undefined;
export type GuideProvider = ((source: GuideSource) => GuideProviderResult | Promise<GuideProviderResult>) | {
  load?: (source: GuideSource) => GuideProviderResult | Promise<GuideProviderResult>;
  get?: (id: string, url?: string) => GuideProviderResult | Promise<GuideProviderResult>;
};

export interface LoadedGuides {
  readonly stage: WriterStage;
  readonly sourceIds: readonly string[];
  readonly documents: readonly (GuideSource & { sourceId: string; content?: string })[];
}

export function providerMethod(provider: GuideProvider | undefined): ((source: GuideSource) => GuideProviderResult | Promise<GuideProviderResult>) | null {
  if (!provider) return null;
  if (typeof provider === 'function') return provider;
  const load = provider.load;
  if (typeof load === 'function') return (source) => load.call(provider, source);
  const get = provider.get;
  if (typeof get === 'function') return (source) => get.call(provider, source.id, source.url);
  throw new TypeError('Guide provider must be a function or expose load/get');
}

/**
 * Load exactly the approved guide set for a writer stage.
 *
 * The provider is intentionally injected.  This keeps the pipeline agnostic
 * to Google Drive, Cursor, a checked-in fixture, or another canonical source.
 * A provider and non-empty canonical content are mandatory; URL manifests
 * alone are rejected so writers can never proceed on missing guides.
 */
export async function loadCanonicalGuides(stage: WriterStage, provider?: GuideProvider): Promise<LoadedGuides> {
  const ids = stageGuideIds(stage);
  const load = providerMethod(provider);
  const documents = [];
  for (const id of ids) {
    const source: GuideSource = (id === 'strategy' ? STRATEGY_INSTRUCTIONS : (GUIDE_SOURCES as Record<string, GuideSource>)[id]) as GuideSource;
    if (!source) throw new Error(`Guide source is not in the approved catalog: ${id}`);
    const supplied = load ? await load(Object.freeze({ ...source })) : null;
    const supplement: Record<string, unknown> = supplied && typeof supplied === 'object'
      ? supplied
      : supplied == null ? {} : { content: supplied };
    if (supplement.id !== undefined && supplement.id !== source.id) throw new Error(`Canonical guide provider returned mismatched source id for ${source.id}`);
    if (supplement.url !== undefined && supplement.url !== source.url) throw new Error(`Canonical guide provider returned mismatched source URL for ${source.id}`);
    const document = { ...source, ...supplement, id: source.id, title: source.title, url: source.url, sourceId: source.id } as GuideSource & { sourceId: string; content?: string };
    if (typeof document.content !== 'string' || !document.content.trim()) throw new Error(`Canonical guide content is unavailable for ${source.id}`);
    documents.push(Object.freeze(document));
  }
  return Object.freeze({
    stage,
    sourceIds: Object.freeze(ids),
    documents: Object.freeze(documents),
  });
}

export function createMapGuideProvider(documents: Record<string, GuideProviderResult>): GuideProvider {
  const map = documents;
  return {
    async load(source) {
      if (!Object.prototype.hasOwnProperty.call(map, source.id)) {
        throw new Error(`Missing canonical guide fixture: ${source.id}`);
      }
      return map[source.id];
    },
  };
}
