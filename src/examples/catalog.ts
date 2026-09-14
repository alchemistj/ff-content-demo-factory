import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { defaultRepoRoot } from "../writer-guides/loader.js";

export const APPROVED_EXAMPLES_DIR = "examples/approved-copy";

export type ExampleLibraryStatus = "available" | "pending-examples-lane";

export interface ExamplePage {
  readonly relativePath: string;
  readonly markdown: string;
}

export interface ExampleLibraryReceipt {
  readonly status: ExampleLibraryStatus;
  readonly expectedRoot: string;
  readonly available: boolean;
  readonly pages: readonly ExamplePage[];
  readonly note: string;
}

/**
 * Load the approved example library when the examples lane has landed.
 * Missing files are an honest pending status, not a substitute library.
 */
export function loadApprovedExampleLibrary(options?: { readonly repoRoot?: string }): ExampleLibraryReceipt {
  const repoRoot = options?.repoRoot ? resolve(options.repoRoot) : defaultRepoRoot();
  const expectedRoot = join(repoRoot, APPROVED_EXAMPLES_DIR);
  if (!existsSync(expectedRoot) || !statSync(expectedRoot).isDirectory()) {
    return {
      status: "pending-examples-lane",
      expectedRoot: APPROVED_EXAMPLES_DIR,
      available: false,
      pages: [],
      note: "Approved Springfield examples are owned by the positive-examples lane. The writer assignment still proceeds with canonical guides and the prospect packet.",
    };
  }
  const pages = collectMarkdown(expectedRoot, APPROVED_EXAMPLES_DIR);
  return {
    status: "available",
    expectedRoot: APPROVED_EXAMPLES_DIR,
    available: pages.length > 0,
    pages,
    note:
      pages.length > 0
        ? "Approved example pages are available as craft references. Their facts belong to those businesses, not the current prospect."
        : "The examples directory exists but contains no Markdown pages yet.",
  };
}

function collectMarkdown(absDir: string, relativeDir: string): ExamplePage[] {
  const pages: ExamplePage[] = [];
  for (const name of readdirSync(absDir).sort()) {
    const abs = join(absDir, name);
    const rel = `${relativeDir}/${name}`;
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      pages.push(...collectMarkdown(abs, rel));
      continue;
    }
    if (!name.endsWith(".md")) continue;
    const markdown = readFileSync(abs, "utf8");
    if (!markdown.trim()) continue;
    pages.push({ relativePath: rel, markdown });
  }
  return pages;
}
