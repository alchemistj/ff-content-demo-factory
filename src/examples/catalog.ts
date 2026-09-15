import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  APPROVED_COPY_DIR,
  EXAMPLE_IDS,
  loadApprovedCopyCatalog,
  type ExampleId,
} from "../approved-copy/index.js";
import { WriterGuideError, defaultRepoRoot } from "../writer-guides/loader.js";

export { APPROVED_COPY_DIR as APPROVED_EXAMPLES_DIR };

export type ExampleLibraryStatus = "available" | "pending-examples-lane";

export type ExamplePageRole = "primary" | "chrome";

export interface ExamplePage {
  readonly id?: ExampleId | string;
  readonly relativePath: string;
  readonly markdown: string;
  readonly role: ExamplePageRole;
}

export interface ExampleLibraryReceipt {
  readonly status: ExampleLibraryStatus;
  readonly expectedRoot: string;
  readonly available: boolean;
  readonly pages: readonly ExamplePage[];
  readonly chromePages: readonly ExamplePage[];
  readonly note: string;
}

const CHROME_FILES = Object.freeze([
  `${APPROVED_COPY_DIR}/window-dudes/_chrome.md`,
  `${APPROVED_COPY_DIR}/sra/_chrome.md`,
  `${APPROVED_COPY_DIR}/greene-planet/_chrome.md`,
]);

/**
 * Compatibility adapter over the approved-copy catalog.
 *
 * The twelve-page catalog is the only primary craft library. README,
 * SOURCE_MANIFEST, historical material, and recursive Markdown dumps are not
 * writer examples. Shared `_chrome.md` files are supplemental header/footer
 * references for the site/chrome phase.
 */
export function loadApprovedExampleLibrary(options?: { readonly repoRoot?: string }): ExampleLibraryReceipt {
  const repoRoot = options?.repoRoot ? resolve(options.repoRoot) : defaultRepoRoot();
  const expectedRoot = APPROVED_COPY_DIR;
  try {
    const catalog = loadApprovedCopyCatalog(repoRoot);
    const pages = catalog.examples.map((example) =>
      Object.freeze({
        id: example.id,
        relativePath: example.relativePath,
        markdown: example.markdown,
        role: "primary" as const,
      }),
    );
    if (pages.length !== EXAMPLE_IDS.length) {
      throw new WriterGuideError(
        `Approved-copy primary corpus must be exactly ${EXAMPLE_IDS.length} pages`,
      );
    }
    return Object.freeze({
      status: "available",
      expectedRoot,
      available: true,
      pages: Object.freeze(pages),
      chromePages: Object.freeze(loadChromePages(repoRoot)),
      note: "Approved Springfield pages are craft references. Their facts belong to those businesses, not the current prospect.",
    });
  } catch (error) {
    if (error instanceof WriterGuideError || !existsSync(join(repoRoot, APPROVED_COPY_DIR))) {
      return Object.freeze({
        status: "pending-examples-lane",
        expectedRoot,
        available: false,
        pages: Object.freeze([]),
        chromePages: Object.freeze([]),
        note: "Approved Springfield examples are owned by the approved-copy catalog. Writing still proceeds with canonical guides and the prospect packet.",
      });
    }
    throw error;
  }
}

function loadChromePages(repoRoot: string): ExamplePage[] {
  const pages: ExamplePage[] = [];
  for (const relativePath of CHROME_FILES) {
    const absolutePath = join(repoRoot, relativePath);
    try {
      if (!statSync(absolutePath).isFile()) continue;
      const markdown = readFileSync(absolutePath, "utf8");
      if (!markdown.trim()) continue;
      pages.push(
        Object.freeze({
          id: relativePath,
          relativePath,
          markdown,
          role: "chrome",
        }),
      );
    } catch {
      continue;
    }
  }
  return pages;
}
