#!/usr/bin/env node
import { discoverAssignment } from "./assignment.js";
import { WORKFLOW_STAGES } from "./state.js";

const assignment = discoverAssignment();

const receipt = {
  entryPoint: assignment.entryPoint,
  runtimeDocuments: assignment.runtimeDocuments,
  providerEntryFiles: assignment.providerEntryFiles,
  catalogManifestHash: assignment.guides.manifestHash,
  writingAssignment: {
    sourceIds: assignment.writingGuides.sourceIds,
    setHash: assignment.writingGuides.setHash,
    phases: Object.fromEntries(
      Object.entries(assignment.writingGuides.phases).map(([phase, set]) => [
        phase,
        { stage: set.stage, sourceIds: set.sourceIds, setHash: set.setHash },
      ]),
    ),
  },
  examples: {
    status: assignment.examples.status,
    available: assignment.examples.available,
    expectedRoot: assignment.examples.expectedRoot,
    pageCount: assignment.examples.pages.length,
    chromePageCount: assignment.examples.chromePages.length,
    primaryIds: assignment.examples.pages.map((page) => page.id ?? page.relativePath),
  },
  historicalProspects: assignment.historicalProspects,
  currentRunStage: assignment.currentRun?.stage ?? null,
  knownStages: Object.values(WORKFLOW_STAGES),
};

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
