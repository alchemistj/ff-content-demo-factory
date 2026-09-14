/**
 * Canonical review-package contract owned by the workflow lane.
 *
 * Google Docs (PR #31) must import this module instead of defining a second
 * package type. One schema, one validator, one hash.
 *
 * Website-copy reading order:
 * homepage → two service pages → contact → header/footer → owner Strategy Overview.
 *
 * Prescription packages use the same schema with kind "prescription".
 */

export const WRITING_PACKAGE_SCHEMA_VERSION = "writing-package/v1" as const;

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

export const PAGE_AUDIENCES = Object.freeze(["business", "owner"] as const);
export type PageAudience = (typeof PAGE_AUDIENCES)[number];

export const WEBSITE_COPY_READING_ORDER = Object.freeze([
  "homepage",
  "service",
  "service",
  "contact",
  "header_footer",
  "strategy_overview",
] as const);

export const PAGE_ID_RE = /^[a-z][a-z0-9-]{0,63}$/;

/** Optional emphasis/link on a contiguous run of text. Omit flags rather than set false. */
export interface TextSpan {
  readonly text: string;
  readonly bold?: true;
  readonly italic?: true;
  readonly href?: string;
}

export interface ListItem {
  readonly spans: readonly TextSpan[];
}

export type HeadingBlock = {
  readonly type: "heading";
  readonly level: 1 | 2 | 3;
  readonly text: string;
};

export type ParagraphBlock = {
  readonly type: "paragraph";
  readonly spans: readonly TextSpan[];
};

export type ListBlock = {
  readonly type: "list";
  readonly ordered: boolean;
  readonly items: readonly ListItem[];
};

export type QuoteBlock = {
  readonly type: "quote";
  readonly spans: readonly TextSpan[];
  readonly attribution: string;
  readonly reviewId?: string;
};

export type ContentBlock = HeadingBlock | ParagraphBlock | ListBlock | QuoteBlock;

export interface WritingPackagePage {
  /** Stable identity. Never derived from heading text. Humans may edit title/H1. */
  readonly pageId: string;
  readonly role: PageRole;
  readonly audience: PageAudience;
  readonly route?: string;
  readonly readingOrder: number;
  /** Default H1. Changing this must not reassign pageId. */
  readonly title: string;
  readonly blocks: readonly ContentBlock[];
}

export interface WritingPackage {
  readonly schemaVersion: typeof WRITING_PACKAGE_SCHEMA_VERSION;
  readonly kind: ReviewKind;
  readonly packageId: string;
  readonly prospectId: string;
  readonly runId: string;
  readonly businessName: string;
  readonly pages: readonly WritingPackagePage[];
  readonly packageHash: string;
}

/** Recommended internal order inside one writer run. Not separate model calls. */
export const WRITER_INTERNAL_ORDER = Object.freeze([
  "servicePages",
  "siteChrome",
  "strategyOverview",
] as const);

export type WriterInternalPhase = (typeof WRITER_INTERNAL_ORDER)[number];
