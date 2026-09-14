import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadApprovedExampleLibrary, type ExampleLibraryReceipt } from "../examples/catalog.js";
import {
  defaultRepoRoot,
  loadCanonicalGuideCatalog,
  loadWritingAssignmentGuides,
  type GuideCatalogReceipt,
  type WritingAssignmentGuideSet,
} from "../writer-guides/loader.js";
import { loadActiveRuntimeInstructions, PROVIDER_ENTRY_FILES, RUNTIME_DOCS } from "./runtime-docs.js";
import type { WorkflowState } from "./state.js";

export const ASSIGNMENT_ENTRY = "ASSIGNMENT.md";

export const HISTORICAL_PROSPECT_DIRS = Object.freeze([
  "barones-heat-air",
  "kingdom-roofing-and-construction",
  "sheres-construction-handyman",
] as const);

export interface AssignmentDiscovery {
  readonly entryPoint: typeof ASSIGNMENT_ENTRY;
  readonly runtimeDocuments: typeof RUNTIME_DOCS;
  readonly providerEntryFiles: typeof PROVIDER_ENTRY_FILES;
  readonly guides: GuideCatalogReceipt;
  readonly writingGuides: WritingAssignmentGuideSet;
  readonly examples: ExampleLibraryReceipt;
  readonly historicalProspects: readonly {
    readonly directory: string;
    readonly role: "history-not-runtime-instructions";
  }[];
  readonly currentRun: WorkflowState | null;
  readonly instructions: {
    readonly assignment: string;
    readonly authority: string;
    readonly research: string;
    readonly prescription: string;
    readonly writer: string;
  };
}

export function discoverAssignment(options?: {
  readonly repoRoot?: string;
  readonly currentRun?: WorkflowState | null;
}): AssignmentDiscovery {
  const repoRoot = options?.repoRoot ? resolve(options.repoRoot) : defaultRepoRoot();
  return {
    entryPoint: ASSIGNMENT_ENTRY,
    runtimeDocuments: RUNTIME_DOCS,
    providerEntryFiles: PROVIDER_ENTRY_FILES,
    guides: loadCanonicalGuideCatalog({ repoRoot }),
    writingGuides: loadWritingAssignmentGuides({ repoRoot }),
    examples: loadApprovedExampleLibrary({ repoRoot }),
    historicalProspects: HISTORICAL_PROSPECT_DIRS.filter((directory) =>
      existsSync(join(repoRoot, directory)),
    ).map((directory) => ({ directory, role: "history-not-runtime-instructions" as const })),
    currentRun: options?.currentRun ?? null,
    instructions: loadActiveRuntimeInstructions({ repoRoot }),
  };
}

export function assertProviderEntriesPointToAssignment(repoRoot = defaultRepoRoot()): void {
  const assignment = readFileSync(join(repoRoot, ASSIGNMENT_ENTRY), "utf8");
  if (!assignment.includes("docs/runtime/AUTHORITY.md")) {
    throw new Error("ASSIGNMENT.md must name the runtime authority document");
  }
  for (const relativePath of PROVIDER_ENTRY_FILES) {
    const abs = join(repoRoot, relativePath);
    if (!existsSync(abs)) {
      throw new Error(`Provider entry file missing: ${relativePath}`);
    }
    const text = readFileSync(abs, "utf8");
    if (!text.includes(ASSIGNMENT_ENTRY)) {
      throw new Error(`${relativePath} must point at ${ASSIGNMENT_ENTRY}`);
    }
    if (text.includes("You must use the recommended first review")) {
      throw new Error(`${relativePath} must not copy conflicting legacy editorial commands`);
    }
  }
}
