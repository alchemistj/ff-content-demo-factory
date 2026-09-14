/**
 * Canonical writing-package contract for the Content Factory.
 *
 * Workflow (PR #30) owns producing this payload. Google Docs consumes it
 * for native publication/import. Page identity is `pageId`, not heading text.
 */

export const WRITING_PACKAGE_VERSION = "writing-package/v1" as const;

export const REVIEW_KINDS = Object.freeze(["website_copy", "prescription"] as const);
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const PAGE_ROLES = Object.freeze([
  "homepage",
  "service",
  "contact",
  "header_footer",
  "strategy_overview",
  "prescription",
] as const);
export type PageRole = (typeof PAGE_ROLES)[number];

export const COPY_AUDIENCES = Object.freeze(["business", "owner"] as const);
export type CopyAudience = (typeof COPY_AUDIENCES)[number];

export const WEBSITE_COPY_READING_ORDER = Object.freeze([
  "homepage",
  "service",
  "service",
  "contact",
  "header_footer",
  "strategy_overview",
] as const);

export const PAGE_ID_RE = /^[a-z][a-z0-9-]{0,63}$/;
export const REVIEW_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export interface TextSpan {
  readonly text: string;
  readonly bold?: true;
  readonly italic?: true;
  readonly href?: string;
}

export interface ListItem {
  readonly spans: readonly TextSpan[];
}

export type ContentBlock =
  | { readonly type: "heading"; readonly level: 1 | 2 | 3; readonly text: string }
  | { readonly type: "paragraph"; readonly spans: readonly TextSpan[] }
  | { readonly type: "list"; readonly ordered: boolean; readonly items: readonly ListItem[] }
  | {
      readonly type: "quote";
      readonly spans: readonly TextSpan[];
      readonly attribution?: string;
      readonly reviewId?: string;
    };

export interface WritingPackagePage {
  readonly pageId: string;
  readonly role: PageRole;
  readonly audience: CopyAudience;
  readonly route?: string;
  readonly readingOrder: number;
  readonly title: string;
  readonly blocks: readonly ContentBlock[];
}

export interface WritingPackage {
  readonly version: typeof WRITING_PACKAGE_VERSION;
  readonly kind: ReviewKind;
  readonly prospectId: string;
  readonly runId: string;
  readonly businessName: string;
  readonly packageHash: string;
  readonly readingOrder: readonly string[];
  readonly pages: readonly WritingPackagePage[];
}

export interface RouteMapEntry {
  readonly pageId: string;
  readonly route: string;
  readonly pageType: PageRole;
}

export function isReviewKind(value: string): value is ReviewKind {
  return (REVIEW_KINDS as readonly string[]).includes(value);
}

export function isPageRole(value: string): value is PageRole {
  return (PAGE_ROLES as readonly string[]).includes(value);
}

export function isCopyAudience(value: string): value is CopyAudience {
  return (COPY_AUDIENCES as readonly string[]).includes(value);
}

export function expectedAudience(role: PageRole): CopyAudience {
  return role === "strategy_overview" || role === "prescription" ? "owner" : "business";
}

export function reviewDocumentTitle(pkg: WritingPackage, version?: number): string {
  const suffix = pkg.kind === "prescription" ? "Prescription — Human Review" : "Website Copy — Human Review";
  const base = `${pkg.businessName} — ${suffix}`;
  return version && version > 1 ? `${base} (v${version})` : base;
}

export function pagesInReadingOrder(pkg: {
  readonly pages: readonly WritingPackagePage[];
}): readonly WritingPackagePage[] {
  return [...pkg.pages].sort((a, b) => a.readingOrder - b.readingOrder || a.pageId.localeCompare(b.pageId));
}

export function routeMapFromPages(pages: readonly WritingPackagePage[]): readonly RouteMapEntry[] {
  return pages
    .filter((page) => page.route)
    .map((page) => ({ pageId: page.pageId, route: page.route ?? "", pageType: page.role }));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
