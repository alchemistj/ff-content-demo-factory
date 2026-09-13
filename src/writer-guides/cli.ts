#!/usr/bin/env node
import { loadCanonicalGuideCatalog, loadWriterStageGuides, STAGE_GUIDE_IDS, WRITER_STAGES } from "./index.js";

const catalog = loadCanonicalGuideCatalog();
const stages = Object.fromEntries(
  WRITER_STAGES.map((stage) => {
    const loaded = loadWriterStageGuides(stage);
    return [
      stage,
      {
        sourceIds: loaded.sourceIds,
        setHash: loaded.setHash,
        catalogManifestHash: loaded.catalogManifestHash,
        guides: loaded.guides.map((guide) => ({
          id: guide.id,
          relativePath: guide.relativePath,
          sha256: guide.sha256,
          bytes: guide.bytes.length,
        })),
      },
    ];
  }),
);

const receipt = {
  repoRoot: catalog.repoRoot,
  catalogManifestHash: catalog.manifestHash,
  guides: catalog.guides.map((guide) => ({
    id: guide.id,
    title: guide.title,
    relativePath: guide.relativePath,
    sha256: guide.sha256,
    bytes: guide.bytes.length,
  })),
  stageGuideIds: STAGE_GUIDE_IDS,
  stages,
};

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
