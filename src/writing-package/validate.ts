import { sha256Json } from "../handoff/fingerprint.js";
import { DEFAULT_READING_ORDER, WRITING_PACKAGE_VERSION, type WritingPackage, type WritingPackagePages } from "./types.js";

export class WritingPackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WritingPackageError";
  }
}

function requirePage(page: WritingPackage["pages"]["homepage"], label: string): void {
  if (!page || typeof page !== "object") {
    throw new WritingPackageError(`${label} is missing`);
  }
  if (!page.pageId || !page.route || !page.h1 || !page.title) {
    throw new WritingPackageError(`${label} must include pageId, route, title, and h1`);
  }
  if (!Array.isArray(page.blocks) || page.blocks.length === 0) {
    throw new WritingPackageError(`${label} must include at least one copy block`);
  }
}

export function hashWritingPages(pages: WritingPackagePages): string {
  return sha256Json(pages);
}

export function buildWritingPackage(input: Omit<WritingPackage, "version" | "packageHash" | "readingOrder"> & {
  readonly readingOrder?: readonly string[];
}): WritingPackage {
  const readingOrder = input.readingOrder ?? [
    input.pages.homepage.pageId,
    input.pages.servicePages[0].pageId,
    input.pages.servicePages[1].pageId,
    input.pages.contact.pageId,
    input.pages.chrome.pageId,
    input.pages.strategyOverview.pageId,
  ];
  const pkg: WritingPackage = {
    version: WRITING_PACKAGE_VERSION,
    prospectId: input.prospectId,
    runId: input.runId,
    businessName: input.businessName,
    routeMap: input.routeMap,
    readingOrder,
    pages: input.pages,
    packageHash: hashWritingPages(input.pages),
  };
  assertWritingPackage(pkg);
  return pkg;
}

export function assertWritingPackage(pkg: WritingPackage): asserts pkg is WritingPackage {
  if (!pkg || pkg.version !== WRITING_PACKAGE_VERSION) {
    throw new WritingPackageError(`writing package version must be ${WRITING_PACKAGE_VERSION}`);
  }
  if (!pkg.prospectId || !pkg.runId || !pkg.businessName) {
    throw new WritingPackageError("writing package requires prospectId, runId, and businessName");
  }
  requirePage(pkg.pages.homepage, "homepage");
  if (pkg.pages.homepage.pageType !== "homepage" || pkg.pages.homepage.audience !== "business") {
    throw new WritingPackageError("homepage must be business-facing homepage copy");
  }
  if (!Array.isArray(pkg.pages.servicePages) || pkg.pages.servicePages.length !== 2) {
    throw new WritingPackageError("writing package requires exactly two service pages");
  }
  for (const [index, page] of pkg.pages.servicePages.entries()) {
    requirePage(page, `service page ${index + 1}`);
    if (page.pageType !== "service" || page.audience !== "business") {
      throw new WritingPackageError(`service page ${index + 1} must be business-facing service copy`);
    }
  }
  requirePage(pkg.pages.contact, "contact");
  if (pkg.pages.contact.pageType !== "contact" || pkg.pages.contact.audience !== "business") {
    throw new WritingPackageError("contact must be business-facing contact copy");
  }
  const chrome = pkg.pages.chrome;
  if (!chrome || chrome.pageType !== "chrome" || chrome.pageId !== "header-footer") {
    throw new WritingPackageError("chrome must be labeled header/footer copy");
  }
  if (!chrome.header?.businessName || !chrome.footer?.businessName) {
    throw new WritingPackageError("chrome must include header and footer business identity");
  }
  requirePage(pkg.pages.strategyOverview, "strategy overview");
  if (pkg.pages.strategyOverview.pageType !== "strategy" || pkg.pages.strategyOverview.audience !== "owner") {
    throw new WritingPackageError("Strategy Overview must be owner-facing and distinct from business copy");
  }
  if (pkg.packageHash !== hashWritingPages(pkg.pages)) {
    throw new WritingPackageError("writing package hash does not match page content");
  }
  if (!Array.isArray(pkg.readingOrder) || pkg.readingOrder.length < 6) {
    throw new WritingPackageError("readingOrder must list homepage, both services, contact, chrome, and strategy");
  }
}

export function publisherPayload(pkg: WritingPackage): {
  readonly title: string;
  readonly readingOrder: readonly string[];
  readonly pages: WritingPackagePages;
  readonly routeMap: WritingPackage["routeMap"];
  readonly identity: { readonly prospectId: string; readonly runId: string; readonly packageHash: string };
} {
  assertWritingPackage(pkg);
  return {
    title: `${pkg.businessName} — Website Copy — Human Review`,
    readingOrder: pkg.readingOrder,
    pages: pkg.pages,
    routeMap: pkg.routeMap,
    identity: {
      prospectId: pkg.prospectId,
      runId: pkg.runId,
      packageHash: pkg.packageHash,
    },
  };
}

export { DEFAULT_READING_ORDER };
