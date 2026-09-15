export const SEO_TITLE_PREFIX = "SEO title:";
export const META_DESCRIPTION_PREFIX = "Meta description:";

export function seoTitleLine(value: string): string {
  return `${SEO_TITLE_PREFIX} ${value}`;
}

export function metaDescriptionLine(value: string): string {
  return `${META_DESCRIPTION_PREFIX} ${value}`;
}

export function parseSeoTitleLine(raw: string): string | undefined {
  return parsePrefixedLine(raw, SEO_TITLE_PREFIX);
}

export function parseMetaDescriptionLine(raw: string): string | undefined {
  return parsePrefixedLine(raw, META_DESCRIPTION_PREFIX);
}

export function isSeoMetadataLine(raw: string): boolean {
  return parseSeoTitleLine(raw) !== undefined || parseMetaDescriptionLine(raw) !== undefined;
}

function parsePrefixedLine(raw: string, prefix: string): string | undefined {
  if (raw === prefix) return "";
  if (raw.startsWith(`${prefix} `)) return raw.slice(prefix.length + 1);
  if (raw.startsWith(prefix)) return raw.slice(prefix.length).trimStart();
  return undefined;
}
