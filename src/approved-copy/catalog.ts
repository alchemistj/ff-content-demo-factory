/**
 * Closed catalog of approved Springfield reference pages.
 *
 * Runtime authority is the Markdown in examples/approved-copy/. This module
 * does not change the writer-guide assignment path used by Writer 1/2/3.
 */

export const APPROVED_COPY_DIR = "examples/approved-copy";

export const EXAMPLE_IDS = Object.freeze([
  "wd-home",
  "wd-repair",
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

export type ExampleStatus = "complete" | "source-unavailable";

export interface ExampleCatalogEntry {
  readonly id: ExampleId;
  readonly business: "window-dudes" | "sra" | "greene-planet";
  readonly title: string;
  readonly route: string;
  readonly relativePath: string;
  readonly status: ExampleStatus;
}

export const EXAMPLE_CATALOG: Readonly<Record<ExampleId, ExampleCatalogEntry>> = Object.freeze({
  "wd-home": Object.freeze({
    id: "wd-home",
    business: "window-dudes",
    title: "Window Dudes homepage",
    route: "/",
    relativePath: `${APPROVED_COPY_DIR}/window-dudes/homepage.md`,
    status: "complete",
  }),
  "wd-repair": Object.freeze({
    id: "wd-repair",
    business: "window-dudes",
    title: "Window Dudes Springfield window repair",
    route: "/",
    relativePath: `${APPROVED_COPY_DIR}/window-dudes/springfield-window-repair.md`,
    status: "complete",
  }),
  "wd-replace": Object.freeze({
    id: "wd-replace",
    business: "window-dudes",
    title: "Window Dudes replacement window installation",
    route: "/springfield/replacement-window-installation/",
    relativePath: `${APPROVED_COPY_DIR}/window-dudes/springfield-replacement-window-installation.md`,
    status: "complete",
  }),
  "wd-contact": Object.freeze({
    id: "wd-contact",
    business: "window-dudes",
    title: "Window Dudes contact",
    route: "/contact/",
    relativePath: `${APPROVED_COPY_DIR}/window-dudes/contact.md`,
    status: "complete",
  }),
  "sra-home": Object.freeze({
    id: "sra-home",
    business: "sra",
    title: "SRA Springfield homepage",
    route: "/springfield/",
    relativePath: `${APPROVED_COPY_DIR}/sra/springfield-homepage.md`,
    status: "complete",
  }),
  "sra-replace": Object.freeze({
    id: "sra-replace",
    business: "sra",
    title: "SRA Springfield roof replacement",
    route: "/springfield/roof-replacement/",
    relativePath: `${APPROVED_COPY_DIR}/sra/springfield-roof-replacement.md`,
    status: "complete",
  }),
  "sra-maint": Object.freeze({
    id: "sra-maint",
    business: "sra",
    title: "SRA Springfield roof maintenance / The SRA Advantage",
    route: "/springfield/roof-maintenance/",
    relativePath: `${APPROVED_COPY_DIR}/sra/springfield-roof-maintenance.md`,
    status: "complete",
  }),
  "sra-contact": Object.freeze({
    id: "sra-contact",
    business: "sra",
    title: "SRA Springfield contact",
    route: "/springfield/contact/",
    relativePath: `${APPROVED_COPY_DIR}/sra/springfield-contact.md`,
    status: "source-unavailable",
  }),
  "gp-home": Object.freeze({
    id: "gp-home",
    business: "greene-planet",
    title: "Greene Planet homepage",
    route: "/",
    relativePath: `${APPROVED_COPY_DIR}/greene-planet/homepage.md`,
    status: "complete",
  }),
  "gp-inspect": Object.freeze({
    id: "gp-inspect",
    business: "greene-planet",
    title: "Greene Planet mold inspection & testing",
    route: "/springfield/mold-inspection-testing/",
    relativePath: `${APPROVED_COPY_DIR}/greene-planet/springfield-mold-inspection-testing.md`,
    status: "complete",
  }),
  "gp-black": Object.freeze({
    id: "gp-black",
    business: "greene-planet",
    title: "Greene Planet black mold remediation",
    route: "/springfield/black-mold-remediation/",
    relativePath: `${APPROVED_COPY_DIR}/greene-planet/springfield-black-mold-remediation.md`,
    status: "complete",
  }),
  "gp-contact": Object.freeze({
    id: "gp-contact",
    business: "greene-planet",
    title: "Greene Planet contact",
    route: "/springfield/contact/",
    relativePath: `${APPROVED_COPY_DIR}/greene-planet/springfield-contact.md`,
    status: "complete",
  }),
});

export function isExampleId(value: string): value is ExampleId {
  return (EXAMPLE_IDS as readonly string[]).includes(value);
}

export function exampleCatalogEntry(id: string): ExampleCatalogEntry {
  if (!isExampleId(id)) {
    throw new Error(`Unknown approved-copy example id: ${id}`);
  }
  return EXAMPLE_CATALOG[id];
}
