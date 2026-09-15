import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defaultRepoRoot } from "../writer-guides/loader.js";

export const RUNTIME_DOCS = Object.freeze({
  assignment: "ASSIGNMENT.md",
  authority: "docs/runtime/AUTHORITY.md",
  research: "docs/runtime/RESEARCH.md",
  prescription: "docs/runtime/PRESCRIPTION.md",
  writer: "docs/runtime/WRITER.md",
  interfaces: "docs/runtime/INTERFACES.md",
} as const);

export const PROVIDER_ENTRY_FILES = Object.freeze([
  "AGENTS.md",
  "CLAUDE.md",
  ".github/copilot-instructions.md",
] as const);

export function loadRuntimeDocument(
  id: keyof typeof RUNTIME_DOCS,
  options?: { readonly repoRoot?: string },
): { readonly relativePath: string; readonly markdown: string } {
  const repoRoot = options?.repoRoot ? resolve(options.repoRoot) : defaultRepoRoot();
  const relativePath = RUNTIME_DOCS[id];
  const absolutePath = join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Runtime instruction is missing: ${relativePath}`);
  }
  const markdown = readFileSync(absolutePath, "utf8");
  if (!markdown.trim()) {
    throw new Error(`Runtime instruction is empty: ${relativePath}`);
  }
  return { relativePath, markdown };
}

export function loadActiveRuntimeInstructions(options?: { readonly repoRoot?: string }): {
  readonly assignment: string;
  readonly authority: string;
  readonly research: string;
  readonly prescription: string;
  readonly writer: string;
} {
  return {
    assignment: loadRuntimeDocument("assignment", options).markdown,
    authority: loadRuntimeDocument("authority", options).markdown,
    research: loadRuntimeDocument("research", options).markdown,
    prescription: loadRuntimeDocument("prescription", options).markdown,
    writer: loadRuntimeDocument("writer", options).markdown,
  };
}
