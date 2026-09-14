/**
 * Closed catalog of Springfield reference pages.
 *
 * Runtime authority is the Markdown in examples/approved-copy/. This module
 * does not change the writer-guide assignment path used by Writer 1/2/3.
 *
 * An example may be marked `complete` only when its copy was extracted from
 * the named git repository ref. HTTP/Preview is not copy authority.
 */

import {
  REQUIRED_CLIENT_REFS,
  type ExampleProvenance,
} from "./provenance.js";

export const APPROVED_COPY_DIR = "examples/approved-copy";

export const EXAMPLE_IDS = Object.freeze([
  "wd-home",
  "wd-glass",
  "wd-replace",
  "wd-contact",
  "sra-home",
  "sra-replace",
  "sra-maint",
  "sra-contact",
  "gp-home",
  "gp-inspect",
  "gp-black",
  "gp-contact",
] as const);

export type ExampleId = (typeof EXAMPLE_IDS)[number];

export type ExampleStatus = "complete" | "pending-git";

export interface ExampleCatalogEntry {
  readonly id: ExampleId;
  readonly business: "window-dudes" | "sra" | "greene-planet";
  readonly title: string;
  readonly route: string;
  readonly relativePath: string;
  readonly status: ExampleStatus;
  readonly requiredRepository: string;
  readonly requiredRef: string;
  readonly requiredSha: string;
  readonly provenance: ExampleProvenance | null;
}

function pending(
  entry: Omit<
    ExampleCatalogEntry,
    "status" | "provenance" | "requiredRepository" | "requiredRef" | "requiredSha"
  > & { business: ExampleCatalogEntry["business"] },
): ExampleCatalogEntry {
  const required = REQUIRED_CLIENT_REFS[entry.business];
  return Object.freeze({
    ...entry,
    status: "pending-git",
    requiredRepository: required.repository,
    requiredRef: required.ref,
    requiredSha: required.sha,
    provenance: null,
  });
}

export const EXAMPLE_CATALOG: Readonly<Record<ExampleId, ExampleCatalogEntry>> = Object.freeze({
  "wd-home": pending({
    id: "wd-home",
    business: "window-dudes",
    title: "Window Dudes homepage",
    route: "/",
    relativePath: `${APPROVED_COPY_DIR}/window-dudes/homepage.md`,
  }),
  "wd-glass": pending({
    id: "wd-glass",
    business: "window-dudes",
    title: "Window Dudes Springfield glass repair",
    route: "/springfield/glass-repair/",
    relativePath: `${APPROVED_COPY_DIR}/window-dudes/springfield-glass-repair.md`,
  }),
  "wd-replace": pending({
    id: "wd-replace",
    business: "window-dudes",
    title: "Window Dudes replacement window installation",
    route: "/springfield/replacement-window-installation/",
    relativePath: `${APPROVED_COPY_DIR}/window-dudes/springfield-replacement-window-installation.md`,
  }),
  "wd-contact": pending({
    id: "wd-contact",
    business: "window-dudes",
    title: "Window Dudes contact",
    route: "/contact/",
    relativePath: `${APPROVED_COPY_DIR}/window-dudes/contact.md`,
  }),
  "sra-home": pending({
    id: "sra-home",
    business: "sra",
    title: "SRA Springfield homepage",
    route: "/springfield/",
    relativePath: `${APPROVED_COPY_DIR}/sra/springfield-homepage.md`,
  }),
  "sra-replace": pending({
    id: "sra-replace",
    business: "sra",
    title: "SRA Springfield roof replacement",
    route: "/springfield/roof-replacement/",
    relativePath: `${APPROVED_COPY_DIR}/sra/springfield-roof-replacement.md`,
  }),
  "sra-maint": pending({
    id: "sra-maint",
    business: "sra",
    title: "SRA Springfield roof maintenance / The SRA Advantage",
    route: "/springfield/roof-maintenance/",
    relativePath: `${APPROVED_COPY_DIR}/sra/springfield-roof-maintenance.md`,
  }),
  "sra-contact": pending({
    id: "sra-contact",
    business: "sra",
    title: "SRA Springfield contact",
    route: "/springfield/contact/",
    relativePath: `${APPROVED_COPY_DIR}/sra/springfield-contact.md`,
  }),
  "gp-home": pending({
    id: "gp-home",
    business: "greene-planet",
    title: "Greene Planet homepage",
    route: "/",
    relativePath: `${APPROVED_COPY_DIR}/greene-planet/homepage.md`,
  }),
  "gp-inspect": pending({
    id: "gp-inspect",
    business: "greene-planet",
    title: "Greene Planet mold inspection & testing",
    route: "/springfield/mold-inspection-testing/",
    relativePath: `${APPROVED_COPY_DIR}/greene-planet/springfield-mold-inspection-testing.md`,
  }),
  "gp-black": pending({
    id: "gp-black",
    business: "greene-planet",
    title: "Greene Planet black mold remediation",
    route: "/springfield/black-mold-remediation/",
    relativePath: `${APPROVED_COPY_DIR}/greene-planet/springfield-black-mold-remediation.md`,
  }),
  "gp-contact": pending({
    id: "gp-contact",
    business: "greene-planet",
    title: "Greene Planet contact",
    route: "/springfield/contact/",
    relativePath: `${APPROVED_COPY_DIR}/greene-planet/springfield-contact.md`,
  }),
});

export const EXPECTED_COMPLETE_EXAMPLE_IDS = EXAMPLE_IDS;

export function isExampleId(value: string): value is ExampleId {
  return (EXAMPLE_IDS as readonly string[]).includes(value);
}

export function exampleCatalogEntry(id: string): ExampleCatalogEntry {
  if (!isExampleId(id)) {
    throw new Error(`Unknown approved-copy example id: ${id}`);
  }
  return EXAMPLE_CATALOG[id];
}
