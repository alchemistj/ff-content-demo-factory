import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { defaultRepoRoot, WriterGuideError } from "../writer-guides/loader.js";
import { sha256Hex } from "../writer-guides/hash.js";
import {
  EXAMPLE_CATALOG,
  EXAMPLE_IDS,
  exampleCatalogEntry,
  type ExampleCatalogEntry,
  type ExampleId,
} from "./catalog.js";

export interface LoadedExample {
  readonly id: ExampleId;
  readonly title: string;
  readonly business: ExampleCatalogEntry["business"];
  readonly route: string;
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly status: ExampleCatalogEntry["status"];
  readonly markdown: string;
  readonly bytes: Buffer;
  readonly sha256: string;
}

export interface ApprovedCopyCatalogReceipt {
  readonly repoRoot: string;
  readonly examples: readonly LoadedExample[];
}

function readExample(entry: ExampleCatalogEntry, repoRoot: string): LoadedExample {
  const absolutePath = join(repoRoot, entry.relativePath);
  let bytes: Buffer;
  try {
    if (!statSync(absolutePath).isFile()) {
      throw new WriterGuideError(`Approved-copy example is not a file: ${entry.id} (${entry.relativePath})`);
    }
    bytes = readFileSync(absolutePath);
  } catch (error) {
    if (error instanceof WriterGuideError) throw error;
    throw new WriterGuideError(
      `Approved-copy example is missing or unreadable: ${entry.id} (${entry.relativePath})`,
    );
  }
  if (bytes.length === 0) {
    throw new WriterGuideError(`Approved-copy example is empty: ${entry.id}`);
  }
  const markdown = bytes.toString("utf8");
  if (!markdown.trim()) {
    throw new WriterGuideError(`Approved-copy example is empty: ${entry.id}`);
  }
  return Object.freeze({
    id: entry.id,
    title: entry.title,
    business: entry.business,
    route: entry.route,
    relativePath: entry.relativePath,
    absolutePath,
    status: entry.status,
    markdown,
    bytes,
    sha256: sha256Hex(bytes),
  });
}

export function loadApprovedCopyCatalog(repoRoot = defaultRepoRoot()): ApprovedCopyCatalogReceipt {
  const examples = EXAMPLE_IDS.map((id) => readExample(EXAMPLE_CATALOG[id], repoRoot));
  return Object.freeze({
    repoRoot,
    examples: Object.freeze(examples),
  });
}

export function loadExampleById(id: string, repoRoot = defaultRepoRoot()): LoadedExample {
  return readExample(exampleCatalogEntry(id), repoRoot);
}
