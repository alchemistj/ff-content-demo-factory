import { readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GUIDE_CATALOG,
  GUIDE_IDS,
  WRITER_GUIDES_DIR,
  catalogEntry,
  stageGuideIds,
  type GuideCatalogEntry,
  type GuideId,
  type WriterStage,
} from "./catalog.js";
import { manifestHash, sha256Hex, stageSetHash, type ManifestMember } from "./hash.js";
import { parseHeadings, type GuideHeading } from "./parse.js";

export interface LoadGuidesOptions {
  /**
   * Repository root containing `docs/writer-guides/`. Defaults to this
   * package's repository root resolved from the loader module path.
   */
  readonly repoRoot?: string;
}

export interface LoadedGuide {
  readonly id: GuideId;
  readonly title: string;
  readonly relativePath: string;
  readonly absolutePath: string;
  /** Exact file bytes as committed. Authoritative writer context. */
  readonly bytes: Buffer;
  /** UTF-8 decoding of `bytes`. Authoritative writer context. */
  readonly markdown: string;
  readonly sha256: string;
  /** Derived heading list only. Do not treat as a rewritten guide. */
  readonly headings: readonly GuideHeading[];
}

export interface GuideCatalogReceipt {
  readonly repoRoot: string;
  readonly guides: readonly LoadedGuide[];
  readonly members: readonly ManifestMember[];
  readonly manifestHash: string;
}

export interface StageGuideSet {
  readonly stage: WriterStage;
  readonly repoRoot: string;
  readonly catalogManifestHash: string;
  readonly setHash: string;
  readonly sourceIds: readonly GuideId[];
  readonly guides: readonly LoadedGuide[];
}

export class WriterGuideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WriterGuideError";
  }
}

const FACTORY_PACKAGE_NAME = "ff-content-demo-factory";

function isFactoryRepoRoot(dir: string): boolean {
  try {
    const pkgPath = join(dir, "package.json");
    if (!statSync(pkgPath).isFile()) return false;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: unknown };
    if (pkg.name !== FACTORY_PACKAGE_NAME) return false;
    return statSync(join(dir, WRITER_GUIDES_DIR)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Resolve the repository root that contains `docs/writer-guides/`.
 *
 * Source lives at `src/writer-guides/loader.ts`; the compiled export lives at
 * `dist/src/writer-guides/loader.js`. A naive `../..` from the compiled file
 * is `dist/`, not the repo root. Walking up until this factory's package.json
 * and canonical guides directory are found works from both layouts without
 * callers passing `repoRoot`.
 */
export function defaultRepoRoot(): string {
  let dir = resolve(fileURLToPath(new URL(".", import.meta.url)));
  for (;;) {
    if (isFactoryRepoRoot(dir)) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new WriterGuideError(
        `Unable to locate ${FACTORY_PACKAGE_NAME} repository root containing ${WRITER_GUIDES_DIR} from ${fileURLToPath(import.meta.url)}`,
      );
    }
    dir = parent;
  }
}

function resolveRepoRoot(options?: LoadGuidesOptions): string {
  const root = options?.repoRoot ? resolve(options.repoRoot) : defaultRepoRoot();
  if (!isAbsolute(root)) {
    throw new WriterGuideError(`Writer guide repoRoot must be absolute: ${root}`);
  }
  return root;
}

function absoluteGuidePath(repoRoot: string, relativePath: string): string {
  const normalized = normalize(relativePath);
  if (isAbsolute(normalized) || normalized.split(sep).includes("..")) {
    throw new WriterGuideError(`Refusing non-canonical writer guide path: ${relativePath}`);
  }
  return join(repoRoot, normalized);
}

function readCanonicalFile(entry: GuideCatalogEntry, repoRoot: string): LoadedGuide {
  const absolutePath = absoluteGuidePath(repoRoot, entry.relativePath);
  let bytes: Buffer;
  try {
    const stat = statSync(absolutePath);
    if (!stat.isFile()) {
      throw new WriterGuideError(`Canonical writer guide is not a file: ${entry.id} (${entry.relativePath})`);
    }
    bytes = readFileSync(absolutePath);
  } catch (error) {
    if (error instanceof WriterGuideError) throw error;
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") {
      throw new WriterGuideError(`Canonical writer guide is missing: ${entry.id} (${entry.relativePath})`);
    }
    throw new WriterGuideError(
      `Canonical writer guide is unreadable: ${entry.id} (${entry.relativePath}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (bytes.length === 0) {
    throw new WriterGuideError(`Canonical writer guide is empty: ${entry.id} (${entry.relativePath})`);
  }

  const markdown = bytes.toString("utf8");
  if (!markdown.trim()) {
    throw new WriterGuideError(`Canonical writer guide is empty: ${entry.id} (${entry.relativePath})`);
  }

  return Object.freeze({
    id: entry.id,
    title: entry.title,
    relativePath: entry.relativePath,
    absolutePath,
    bytes,
    markdown,
    sha256: sha256Hex(bytes),
    headings: parseHeadings(markdown),
  });
}

function toMember(guide: LoadedGuide): ManifestMember {
  return Object.freeze({
    id: guide.id,
    relativePath: guide.relativePath,
    sha256: guide.sha256,
  });
}

export function loadGuideById(id: string, options?: LoadGuidesOptions): LoadedGuide {
  const entry = catalogEntry(id);
  return readCanonicalFile(entry, resolveRepoRoot(options));
}

export function loadCanonicalGuideCatalog(options?: LoadGuidesOptions): GuideCatalogReceipt {
  const repoRoot = resolveRepoRoot(options);
  const guides = GUIDE_IDS.map((id) => readCanonicalFile(GUIDE_CATALOG[id], repoRoot));
  const members = guides.map(toMember);
  return Object.freeze({
    repoRoot,
    guides: Object.freeze(guides),
    members: Object.freeze(members),
    manifestHash: manifestHash(members),
  });
}

export function loadWriterStageGuides(stage: string, options?: LoadGuidesOptions): StageGuideSet {
  const ids = stageGuideIds(stage);
  const catalog = loadCanonicalGuideCatalog(options);
  const byId = new Map(catalog.guides.map((guide) => [guide.id, guide]));
  const guides = ids.map((id) => {
    const guide = byId.get(id);
    if (!guide) {
      throw new WriterGuideError(`Canonical writer guide is missing from catalog receipt: ${id}`);
    }
    return guide;
  });
  const members = guides.map(toMember);
  return Object.freeze({
    stage: stage as WriterStage,
    repoRoot: catalog.repoRoot,
    catalogManifestHash: catalog.manifestHash,
    setHash: stageSetHash(stage, members),
    sourceIds: Object.freeze([...ids]),
    guides: Object.freeze(guides),
  });
}

export function loadGuidesByIds(ids: readonly string[], options?: LoadGuidesOptions): readonly LoadedGuide[] {
  const catalog = loadCanonicalGuideCatalog(options);
  const byId = new Map(catalog.guides.map((guide) => [guide.id, guide]));
  return Object.freeze(
    ids.map((id) => {
      catalogEntry(id);
      const guide = byId.get(id as GuideId);
      if (!guide) {
        throw new WriterGuideError(`Canonical writer guide is missing from catalog receipt: ${id}`);
      }
      return guide;
    }),
  );
}
