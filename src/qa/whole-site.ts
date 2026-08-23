import type { QaFinding, QaOptions, QaReport } from "./types.js";
import { normalizeSite, pageRoute } from "./normalize.js";
import { runDeterministicQa } from "./deterministic.js";
import { INTELLIGENT_DIMENSIONS, intelligentFindingsAsQa, type IntelligentAssessor, validateIntelligentAssessment } from "./intelligent.js";

export interface WholeSiteQaOptions extends QaOptions {
  /** A separately-owned assessor. It receives a frozen snapshot and returns structured findings. */
  assessor?: IntelligentAssessor | undefined;
  assessorName?: string | undefined;
}

function objectPresent(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function pageKind(page: { pageType?: string | undefined }): string {
  return (page.pageType ?? "").toLowerCase().replace(/[ _-]+/gu, "");
}

function topologyFindings(site: ReturnType<typeof normalizeSite>): QaFinding[] {
  const findings: QaFinding[] = [];
  const services = site.pages.filter((page) => pageKind(page) === "service" || pageKind(page) === "servicepage");
  if (services.length !== 2) findings.push({ code: "required-service-page-count", severity: "hard-fail", message: `Final topology requires exactly two service pages; found ${services.length}.` });
  const home = site.pages.filter((page) => pageKind(page) === "homepage" || pageRoute(page) === "/home");
  if (home.length !== 1 || pageRoute(home[0]) !== "/home") findings.push({ code: "required-homepage", severity: "hard-fail", message: "Final topology requires exactly one homepage at /home." });
  const contact = site.pages.filter((page) => pageKind(page) === "contact" || pageRoute(page) === "/contact");
  if (contact.length !== 1) findings.push({ code: "required-contact-page", severity: "hard-fail", message: "Final topology requires exactly one Contact page." });
  const root = site as Record<string, unknown>;
  const strategyCandidates = site.pages.filter((page) => pageKind(page) === "strategy" || pageKind(page) === "strategyoverview");
  const separateStrategy = objectPresent(root.strategyOverview) || objectPresent(root.strategy);
  const strategyCount = strategyCandidates.length + (separateStrategy ? 1 : 0);
  if (strategyCount !== 1) findings.push({ code: "required-strategy-overview", severity: "hard-fail", message: "Final topology requires exactly one Strategy Overview at /." });
  const strategy = separateStrategy ? (root.strategyOverview ?? root.strategy) : strategyCandidates[0];
  if (!strategy || typeof strategy !== "object") {
    findings.push({ code: "strategy-route-missing", severity: "hard-fail", message: "Strategy Overview is missing its required / route." });
  } else {
    const strategyRoute = pageRoute(strategy);
    if (!strategyRoute) findings.push({ code: "strategy-route-missing", severity: "hard-fail", message: "Strategy Overview is missing its required / route." });
    else if (strategyRoute !== "/") findings.push({ code: "strategy-route", severity: "hard-fail", message: "Strategy Overview must be at /.", route: strategyRoute });
    const strategyRecord = strategy as Record<string, unknown>;
    const hasReadableContent = [strategyRecord.body, strategyRecord.text, strategyRecord.content].some((value) => typeof value === "string" && value.trim()) || (Array.isArray(strategyRecord.sections) && strategyRecord.sections.length > 0);
    if (!hasReadableContent) findings.push({ code: "strategy-content-missing", severity: "hard-fail", message: "Strategy Overview must contain readable content." });
  }
  if (!objectPresent(root.header)) findings.push({ code: "missing-header", severity: "hard-fail", message: "Final topology is missing the shared header/navigation." });
  if (!objectPresent(root.footer)) findings.push({ code: "missing-footer", severity: "hard-fail", message: "Final topology is missing the shared footer." });
  const businessRoutes = new Set(site.pages.map((page) => pageRoute(page)).filter(Boolean));
  let businessOrigin = "";
  try {
    if (typeof root.businessWebsite === "string") businessOrigin = new URL(root.businessWebsite).origin;
  } catch { /* The handoff contract validates this before orchestration. */ }
  const internalRoute = (href: string): string | null => {
    if (href.startsWith("/")) return href;
    try {
      const parsed = new URL(href);
      return businessOrigin && parsed.origin === businessOrigin ? parsed.pathname : null;
    } catch {
      return null;
    }
  };
  const validateLinks = (raw: unknown, area: string) => {
    const links = Array.isArray(raw) ? raw : [];
    for (const item of links) {
      const link = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const href = typeof link.href === "string" ? link.href : typeof link.url === "string" ? link.url : typeof item === "string" ? item : "";
      if (!href) continue;
      const label = typeof link.label === "string" ? link.label.toLowerCase() : typeof link.text === "string" ? link.text.toLowerCase() : typeof item === "string" ? item.toLowerCase() : "";
      const kind = typeof link.kind === "string" ? link.kind : typeof link.type === "string" ? link.type : typeof link.action === "string" ? link.action : "";
      if (/^(tel:|mailto:)/u.test(href)) {
        if (!kind) findings.push({ code: "untyped-link-action", severity: "hard-fail", message: `${area} action link ${href} must be represented with an explicit action/kind/type.` });
        continue;
      }
      const route = internalRoute(href);
      if (route) {
        if (route === "/") findings.push({ code: "ordinary-link-exposes-strategy", severity: "hard-fail", message: `${area} must not expose Strategy Overview at /.` });
        else if (!businessRoutes.has(route)) findings.push({ code: "unresolvable-internal-link", severity: "hard-fail", message: `${area} link ${href} does not resolve to a final business route.`, route });
        if ((label.includes("home") || label.includes("logo") || label.includes("brand")) && route !== "/home") findings.push({ code: "home-link-not-home", severity: "hard-fail", message: `${area} Home/logo link must resolve to /home.`, route });
      }
    }
  };
  const header = root.header && typeof root.header === "object" ? root.header as Record<string, unknown> : {};
  const nav = Array.isArray(header.navigation) ? header.navigation : Array.isArray(header.nav) ? header.nav : Array.isArray(header.links) ? header.links : [];
  for (const item of nav) {
    const link = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const label = typeof link.label === "string" ? link.label.toLowerCase() : typeof link.text === "string" ? link.text.toLowerCase() : typeof item === "string" ? item.toLowerCase() : "";
    const href = typeof link.href === "string" ? link.href : typeof link.url === "string" ? link.url : "";
    const route = internalRoute(href);
    if ((label.includes("home") || label.includes("logo") || label.includes("brand")) && route !== "/home") findings.push({ code: "home-link-not-home", severity: "hard-fail", message: "Ordinary Home/logo navigation must resolve to /home.", route: route ?? href });
    if (label.includes("strateg") || route === "/" || route === "/strategy" || route === "/strategy-overview") findings.push({ code: "header-exposes-strategy", severity: "hard-fail", message: "Ordinary header navigation may not expose the Strategy Overview." });
  }
  const logo = header.logo && typeof header.logo === "object" ? header.logo as Record<string, unknown> : {};
  const logoHref = typeof logo.href === "string" ? logo.href : typeof logo.url === "string" ? logo.url : "";
  if (logoHref && internalRoute(logoHref) !== "/home") findings.push({ code: "home-link-not-home", severity: "hard-fail", message: "The header logo must resolve to /home.", route: internalRoute(logoHref) ?? logoHref });
  validateLinks(nav, "Header navigation");
  const footer = root.footer && typeof root.footer === "object" ? root.footer as Record<string, unknown> : {};
  validateLinks(Array.isArray(footer.links) ? footer.links : footer.navigation, "Footer");
  return findings;
}

/**
 * Independent final pass: deterministic gates always run, then an optional
 * separate structured assessor covers writing judgment. No writer callback is
 * called here and no density heuristic can turn into a gate.
 */
export async function runWholeSiteQa(input: unknown, options: WholeSiteQaOptions = {}): Promise<QaReport> {
  const deterministic = runDeterministicQa(input, options);
  const site = deepFreeze(structuredClone(normalizeSite(input)));
  const findings: QaFinding[] = [...deterministic.findings];
  findings.push(...topologyFindings(site));
  if (!options.assessor) {
    findings.push({ code: "independent-assessment-required", severity: "hard-fail", message: "Whole-site QA requires an independent structured assessor." });
  } else {
    try {
      const assessment = validateIntelligentAssessment(await options.assessor(site));
      const missingDimensions = INTELLIGENT_DIMENSIONS.filter((dimension) => !assessment.dimensionsReviewed.includes(dimension));
      if (missingDimensions.length) findings.push({ code: "incomplete-independent-assessment", severity: "hard-fail", message: `Independent assessment omitted required dimension(s): ${missingDimensions.join(", ")}.` });
      findings.push(...intelligentFindingsAsQa(assessment.findings));
    } catch (error) {
      findings.push({ code: "invalid-independent-assessment", severity: "hard-fail", message: error instanceof Error ? error.message : "Independent assessor output was invalid." });
    }
  }
  // A second route check at the whole-site boundary catches adapters that
  // mutate page routes between stage-level and final artifacts.
  const seen = new Set<string>();
  for (const page of site.pages) {
    const route = pageRoute(page);
    if (route && seen.has(route) && !findings.some((item) => item.code === "duplicate-route" && item.route === route)) {
      findings.push({ code: "duplicate-route", severity: "hard-fail", message: `Route ${route} is duplicated in the final site.`, route });
    }
    if (route) seen.add(route);
  }
  return { ...deterministic, pass: !findings.some((item) => item.severity === "hard-fail"), findings };
}
