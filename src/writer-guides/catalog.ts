/**
 * Closed catalog of repo-native writer guides.
 *
 * Runtime authority is the Markdown in docs/writer-guides/. This module never
 * names, fetches, or falls back to Google Drive / Google Docs.
 */

export const WRITER_GUIDES_DIR = "docs/writer-guides";

export const GUIDE_IDS = Object.freeze([
  "general",
  "service",
  "homepage",
  "contact",
  "headerFooter",
  "readme",
] as const);

export type GuideId = (typeof GUIDE_IDS)[number];

export const WRITER_STAGES = Object.freeze(["writer1", "writer2", "writer3"] as const);

export type WriterStage = (typeof WRITER_STAGES)[number];

/**
 * Internal writing phases inside one writing assignment.
 * Legacy writer1/2/3 ids remain available as phase loaders.
 */
export const WRITING_PHASES = Object.freeze(["servicePages", "siteChrome", "strategyOverview"] as const);

export type WritingPhase = (typeof WRITING_PHASES)[number];

export const WRITING_PHASE_TO_STAGE: Readonly<Record<WritingPhase, WriterStage>> = Object.freeze({
  servicePages: "writer1",
  siteChrome: "writer2",
  strategyOverview: "writer3",
});

export const WRITING_ASSIGNMENT_GUIDE_IDS = Object.freeze([
  "general",
  "service",
  "homepage",
  "contact",
  "headerFooter",
] as const);

export interface GuideCatalogEntry {
  readonly id: GuideId;
  readonly title: string;
  readonly relativePath: string;
}

export const GUIDE_CATALOG: Readonly<Record<GuideId, GuideCatalogEntry>> = Object.freeze({
  general: Object.freeze({
    id: "general",
    title: "Fluid Frame Demo Writing Guide",
    relativePath: `${WRITER_GUIDES_DIR}/FLUID_FRAME_DEMO_WRITING_GUIDE.md`,
  }),
  service: Object.freeze({
    id: "service",
    title: "Fluid Frame Demo Service Page Guide",
    relativePath: `${WRITER_GUIDES_DIR}/SERVICE_PAGE_GUIDE.md`,
  }),
  homepage: Object.freeze({
    id: "homepage",
    title: "Fluid Frame Demo Homepage Guide",
    relativePath: `${WRITER_GUIDES_DIR}/HOMEPAGE_GUIDE.md`,
  }),
  contact: Object.freeze({
    id: "contact",
    title: "Fluid Frame Demo Contact Page Guide",
    relativePath: `${WRITER_GUIDES_DIR}/CONTACT_PAGE_GUIDE.md`,
  }),
  headerFooter: Object.freeze({
    id: "headerFooter",
    title: "Fluid Frame Demo Header & Footer Guide",
    relativePath: `${WRITER_GUIDES_DIR}/HEADER_FOOTER_GUIDE.md`,
  }),
  readme: Object.freeze({
    id: "readme",
    title: "FF Content Demo Factory — Writer Guide Set",
    relativePath: `${WRITER_GUIDES_DIR}/README.md`,
  }),
});

/**
 * Stage-specific writer context. The README is catalog/discovery authority,
 * not a duplicate craft guide fed into a writing stage.
 */
export const STAGE_GUIDE_IDS: Readonly<Record<WriterStage, readonly GuideId[]>> = Object.freeze({
  writer1: Object.freeze(["general", "service"] as const),
  writer2: Object.freeze(["general", "homepage", "contact", "headerFooter"] as const),
  writer3: Object.freeze(["general"] as const),
});

export function isGuideId(value: string): value is GuideId {
  return (GUIDE_IDS as readonly string[]).includes(value);
}

export function isWriterStage(value: string): value is WriterStage {
  return (WRITER_STAGES as readonly string[]).includes(value);
}

export function catalogEntry(id: string): GuideCatalogEntry {
  if (!isGuideId(id)) {
    throw new Error(`Unknown writer guide id: ${id}`);
  }
  const entry = GUIDE_CATALOG[id];
  if (!entry) {
    throw new Error(`Unknown writer guide id: ${id}`);
  }
  return entry;
}

export function stageGuideIds(stage: string): readonly GuideId[] {
  if (!isWriterStage(stage)) {
    throw new Error(`Unknown writer stage: ${stage}`);
  }
  return STAGE_GUIDE_IDS[stage];
}

export function isWritingPhase(value: string): value is WritingPhase {
  return (WRITING_PHASES as readonly string[]).includes(value);
}

export function writingPhaseGuideIds(phase: string): readonly GuideId[] {
  if (!isWritingPhase(phase)) {
    throw new Error(`Unknown writing phase: ${phase}`);
  }
  return STAGE_GUIDE_IDS[WRITING_PHASE_TO_STAGE[phase]];
}
