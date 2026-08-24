/** Human Gate 2 is a reading surface, not a serialized copy dump. */

export const HUMAN_GATE_2_STATE = "awaiting-human-gate-2" as const;
export const HUMAN_GATE_2_QUESTION = "Do you approve these website words for the coded demo?" as const;

type Dict = Record<string, unknown>;

function dict(value: unknown): Dict {
  return value !== null && typeof value === "object" ? value as Dict : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function many(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
}

function line(value: unknown, fallback = "") {
  return text(value) || fallback;
}

function renderBullets(values: unknown): string[] {
  return list(values).flatMap((value) => {
    if (typeof value === "string") return value.trim() ? [`- ${value.trim()}`] : [];
    const item = dict(value);
    const valueText = line(item.text, line(item.body, line(item.label)));
    return valueText ? [`- ${valueText}`] : [];
  });
}

function renderFaqs(value: unknown): string[] {
  return list(value).flatMap((raw) => {
    const faq = dict(raw);
    const question = line(faq.question, line(faq.q));
    const answer = line(faq.answer, line(faq.a, line(faq.body)));
    if (!question && !answer) return [];
    return [`#### ${question || "FAQ"}`, "", answer, ""];
  });
}

function renderReview(raw: unknown): string[] {
  const review = dict(raw);
  const quote = line(review.quote, line(review.excerpt, line(review.text, line(review.reviewText))));
  const attribution = line(review.attribution, line(review.reviewer, line(review.author)));
  if (!quote && !attribution) return [];
  return [quote ? `> ${quote}` : "> [Review quote]", attribution ? `> — ${attribution}` : "> — [Reviewer attribution]", ""];
}

function renderSection(raw: unknown, placementsBySection = new Map<string, unknown[]>(), fallbackSectionId?: string): string[] {
  if (typeof raw === "string") return raw.trim() ? [raw.trim(), ""] : [];
  const section = dict(raw);
  const out: string[] = [];
  const heading = line(section.heading, line(section.title, line(section.h2)));
  if (heading) out.push(`### ${heading}`, "");
  const body = line(section.body, line(section.text, line(section.content)));
  if (body) out.push(body, "");
  out.push(...renderBullets(section.bullets));
  if (section.bullets && renderBullets(section.bullets).length) out.push("");
  out.push(...many(section.reviews ?? section.reviewPlacements ?? section.review).flatMap(renderReview));
  const sectionId = line(section.sectionId, line(section.id, line(section.heading, fallbackSectionId ?? "")));
  if (sectionId) {
    out.push(...(placementsBySection.get(sectionId) ?? []).flatMap(renderReview));
    placementsBySection.delete(sectionId);
  }
  out.push(...many(section.sections ?? section.blocks ?? section.items).flatMap((child) => renderSection(child, placementsBySection)));
  out.push(...renderFaqs(section.faqs));
  return out;
}

function renderCtas(value: unknown): string[] {
  return list(value).flatMap((raw) => {
    const cta = dict(raw);
    const label = line(cta.label, line(cta.text, line(cta.title)));
    const href = line(cta.href, line(cta.url, line(cta.destination)));
    if (!label && !href) return [];
    return [`[CTA] ${label || "Continue"}${href ? ` → ${href}` : ""}`, ""];
  });
}

function renderPage(raw: unknown, index: number): string[] {
  const page = dict(raw);
  const route = line(page.url, line(page.path, line(page.route, `page-${index + 1}`)));
  const seo = dict(page.seo);
  const out = [`## ${route}`, "", `SEO title: ${line(page.seoTitle, line(page.title, line(seo.title, "[missing]")))}`, `Meta description: ${line(page.metaDescription, line(page.meta, line(seo.description, "[missing]")))}`, "", `# ${line(page.h1, line(page.heading, "[missing H1]"))}`, ""];
  const hero = dict(page.hero);
  const heroText = line(page.heroSubhead, line(page.subhead, line(hero.subhead, line(hero.text, line(hero.body)))));
  if (heroText) out.push(heroText, "");
  const topLevelPlacements = many(page.reviewPlacements ?? page.placedReviews);
  const placementsBySection = new Map<string, unknown[]>();
  const unlocated: unknown[] = [];
  for (const placement of topLevelPlacements) {
    const record = dict(placement);
    const sectionId = line(record.sectionId);
    if (sectionId) placementsBySection.set(sectionId, [...(placementsBySection.get(sectionId) ?? []), placement]);
    else unlocated.push(placement);
  }
  out.push(...renderSection(hero, placementsBySection));
  const orderedBlocks = many(page.contentBlocks ?? page.orderedBlocks ?? page.blocks);
  if (orderedBlocks.length) out.push(...orderedBlocks.flatMap((block) => renderSection(block, placementsBySection)));
  else out.push(...many(page.sections).flatMap((section) => renderSection(section, placementsBySection)));
  const body = line(page.body, line(page.content));
  if (body) out.push(body, "");
  out.push(...renderBullets(page.bullets));
  if (renderBullets(page.bullets).length) out.push("");
  for (const orphaned of placementsBySection.values()) unlocated.push(...orphaned);
  // A sidecar placement without a section/block is still rendered inline so
  // no customer proof disappears. Writers should provide sectionId or ordered
  // content blocks; the QA gate fails closed when they do not.
  if (unlocated.length) out.push(...unlocated.flatMap(renderReview));
  out.push(...renderFaqs(page.faqs));
  out.push(...renderCtas(page.ctas ?? page.callsToAction));
  return out;
}

function renderHeader(raw: unknown): string[] {
  const header = dict(raw);
  const out = ["## Header", ""];
  const brand = line(header.brand, line(header.businessName, line(header.logoText)));
  if (brand) out.push(`Brand: ${brand}`, "");
  const nav = list(header.navigation ?? header.nav ?? header.links);
  if (nav.length) {
    out.push("Navigation:", "", ...nav.flatMap((item) => {
      const link = dict(item);
      const label = line(link.label, line(link.text, text(item)));
      const href = line(link.href, line(link.url));
      return label ? [`- ${label}${href ? ` → ${href}` : ""}`] : [];
    }), "");
  }
  const cta = line(header.cta, line(header.callToAction));
  if (cta) out.push(`Header CTA: ${cta}`, "");
  return out;
}

function renderFooter(raw: unknown): string[] {
  const footer = dict(raw);
  const out = ["## Footer", ""];
  const body = line(footer.body, line(footer.text, line(footer.description)));
  if (body) out.push(body, "");
  const links = list(footer.links ?? footer.navigation);
  if (links.length) out.push("Footer links:", "", ...links.flatMap((item) => {
    const link = dict(item);
    const label = line(link.label, line(link.text, text(item)));
    const href = line(link.href, line(link.url));
    return label ? [`- ${label}${href ? ` → ${href}` : ""}`] : [];
  }), "");
  const legal = line(footer.legal, line(footer.copyright));
  if (legal) out.push(legal, "");
  return out;
}

function renderStrategy(raw: unknown): string[] {
  const strategy = dict(raw);
  const body = line(strategy.body, line(strategy.text, line(strategy.content)));
  const out = ["## Strategy Overview", ""];
  if (body) out.push(body, "");
  out.push(...list(strategy.sections).flatMap((section) => renderSection(section)));
  return out;
}

function routeOf(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  try { return new URL(raw).pathname || "/"; } catch { return raw.startsWith("/") ? raw : `/${raw}`; }
}
function regexLiteral(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"); }
function assertPublicRoutesAreSafe(site: Dict, sealedFacts?: Dict, rejectedRoutes: unknown[] = []): void {
  const pages = list(site.pages ?? site.pageWords);
  const routes = pages.map((page) => routeOf(dict(page).url ?? dict(page).path ?? dict(page).route));
  if (routes.includes("/home")) throw new Error("Human Gate 2 cannot render the legacy /home business route");
  if (routes.filter((route) => route === "/").length > 1) throw new Error("Human Gate 2 cannot render multiple Home/Strategy root routes");
  const publicPayload = JSON.stringify({ pages, header: site.header, footer: site.footer });
  for (const route of rejectedRoutes) if (typeof route === "string" && publicPayload.includes(route)) throw new Error("Human Gate 2 public business output leaked a rejected service route");
  if (sealedFacts) {
    const count = sealedFacts.retrievedWrittenReviewCount;
    if (typeof count === "number" && new RegExp(`\\b${count}\\s+(?:of\\s+(?:your\\s+)?(?:Google\\s+)?reviews?|written\\s+reviews?)`, "iu").test(publicPayload)) throw new Error("Human Gate 2 public business output leaked sealed review-analysis value");
    const date = sealedFacts.reviewRetrievalDate;
    if (typeof date === "string" && new RegExp(`(?:as[- ]of|through|retriev(?:ed|al)|snapshot)[^\\n]{0,40}${regexLiteral(date)}`, "iu").test(publicPayload)) throw new Error("Human Gate 2 public business output leaked sealed review-analysis value");
    for (const name of Array.isArray(sealedFacts.reviewBackedServiceNames) ? sealedFacts.reviewBackedServiceNames : []) {
      if (typeof name === "string" && new RegExp(`${regexLiteral(name)}[^\\n]{0,60}(?:without|no|missing|not have)[^\\n]{0,30}page`, "iu").test(publicPayload)) throw new Error("Human Gate 2 public business output leaked sealed review-analysis value");
    }
  }
  for (const key of ["reviewAnalysisFacts", "retrievedWrittenReviewCount", "reviewRetrievalDate", "reviewBackedServicesWithoutPages", "reviewBackedServiceNames"]) {
    if (publicPayload.includes(key)) throw new Error(`Human Gate 2 public business output leaked sealed ${key}`);
  }
}
function websiteWords(input: unknown): Dict {
  const root = dict(input);
  const outputs = dict(root.outputs);
  return dict(root.websiteWords ?? root.finalWords ?? outputs.websiteWords ?? outputs.finalWords ?? outputs.complete ?? root);
}

/** Return clean prose in the order a human experiences the website. */
export function renderHumanGate2(input: unknown): string {
  const site = websiteWords(input);
  assertPublicRoutesAreSafe(site, dict(input).reviewAnalysisFacts as Dict | undefined, list(dict(input).rejectedRoutes));
  const out: string[] = ["# Website Words — Human Gate 2", "", ...renderHeader(site.header ?? dict(input).header), ""];
  const pages = list(site.pages ?? site.pageWords);
  out.push("## Pages", "");
  pages.forEach((page, index) => out.push(...renderPage(page, index), ""));
  out.push(...renderFooter(site.footer ?? dict(input).footer), "");
  out.push(...renderStrategy(site.strategyOverview ?? site.strategy ?? dict(input).strategyOverview), "", `State: ${HUMAN_GATE_2_STATE}`, "", HUMAN_GATE_2_QUESTION, "");
  return out.filter((value, index, all) => !(value === "" && all[index - 1] === "" && all[index + 1] === "")).join("\n").trimEnd();
}

export interface HumanGate2Artifact {
  state: typeof HUMAN_GATE_2_STATE;
  question: typeof HUMAN_GATE_2_QUESTION;
  markdown: string;
}

export function createHumanGate2Artifact(input: unknown): HumanGate2Artifact {
  return { state: HUMAN_GATE_2_STATE, question: HUMAN_GATE_2_QUESTION, markdown: renderHumanGate2(input) };
}
