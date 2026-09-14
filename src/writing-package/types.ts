/**
 * Writing-package contract consumed by the Google Docs human-review lane.
 *
 * Natural reading order for publication:
 * homepage → two service pages → contact → header/footer chrome →
 * owner-facing Strategy Overview.
 *
 * Evidence administration, hashes, internal QA reports, and raw research
 * stay out of the customer-facing copy payload.
 */

export const WRITING_PACKAGE_VERSION = "writing-package/v1" as const;

export type BusinessPageType = "homepage" | "service" | "contact";
export type CopyAudience = "business" | "owner";

export interface CopyBlock {
  readonly heading?: string;
  readonly body: string;
  readonly bullets?: readonly string[];
  readonly quote?: {
    readonly text: string;
    readonly attribution: string;
    readonly reviewId?: string;
  };
}

export interface PageCopy {
  readonly pageId: string;
  readonly pageType: BusinessPageType | "strategy";
  readonly route: string;
  readonly audience: CopyAudience;
  readonly title: string;
  readonly h1: string;
  readonly blocks: readonly CopyBlock[];
}

export interface ChromeCopy {
  readonly pageId: "header-footer";
  readonly pageType: "chrome";
  readonly audience: "business";
  readonly header: {
    readonly businessName: string;
    readonly nav: readonly { readonly label: string; readonly href: string }[];
    readonly ctaLabel: string;
    readonly ctaHref: string;
  };
  readonly footer: {
    readonly businessName: string;
    readonly phone: string;
    readonly address: string;
    readonly nav: readonly { readonly label: string; readonly href: string }[];
  };
}

export interface WritingPackagePages {
  readonly homepage: PageCopy;
  readonly servicePages: readonly [PageCopy, PageCopy];
  readonly contact: PageCopy;
  readonly chrome: ChromeCopy;
  readonly strategyOverview: PageCopy;
}

export interface WritingPackage {
  readonly version: typeof WRITING_PACKAGE_VERSION;
  readonly prospectId: string;
  readonly runId: string;
  readonly businessName: string;
  readonly routeMap: readonly { readonly pageId: string; readonly route: string; readonly pageType: string }[];
  readonly readingOrder: readonly string[];
  readonly pages: WritingPackagePages;
  readonly packageHash: string;
}

export const DEFAULT_READING_ORDER = Object.freeze([
  "homepage",
  "service-1",
  "service-2",
  "contact",
  "header-footer",
  "strategy-overview",
] as const);
