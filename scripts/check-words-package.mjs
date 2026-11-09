#!/usr/bin/env node
// Checks a words package against docs/words-package.md. Hard failures FAIL; taste checks only WARN (Josh, 2026-11-09: spirit of the law).
// Usage: node scripts/check-words-package.mjs prospects/<market>/<slug>
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: check-words-package.mjs <prospect folder>"); process.exit(2); }
const pkg = JSON.parse(fs.readFileSync(path.join(dir, "words.json"), "utf8"));
const revFile = path.join(dir, "reviews.json");
const reviews = fs.existsSync(revFile) ? (JSON.parse(fs.readFileSync(revFile, "utf8")).reviews || []) : null;

const fails = [], warns = [], info = [];
const fail = (m) => fails.push(m), warn = (m) => warns.push(m);
const norm = (s) => String(s || "").replace(/<br\s*\/?>/g, " ").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
const strip = (s) => norm(s).replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
const words = (s) => (strip(s).match(/[A-Za-z0-9][A-Za-z0-9'’&.,:/()-]*/g) || []).filter((w) => /[A-Za-z0-9]/.test(w)).length;

// 1. Shape
const b = pkg.business || {};
if (pkg.schema !== "words-package/v1") fail("schema must be words-package/v1");
for (const k of ["name", "slug", "city", "state", "companyType"]) if (!b[k]) fail(`business.${k} missing`);
if (!Array.isArray(b.phones) || !b.phones.length) fail("business.phones needs at least one number");
for (const p of b.phones || []) if (!/^\+1\d{10}$/.test(p.tel || "")) fail(`phone ${p.display}: tel must look like +13165551234`);
if (!Array.isArray(pkg.services) || !pkg.services.length) fail("services: the full confirmed list is required");
if (!pkg.footer?.about) fail("footer.about missing");
if (!Array.isArray(pkg.footer?.why) || pkg.footer.why.length < 2) fail("footer.why needs 2+ confirmed differentiators");
if (!Array.isArray(pkg.trustBar) || !pkg.trustBar.length) fail("trustBar missing");
const pages = pkg.pages || [];
const roles = (r) => pages.filter((p) => p.role === r);
if (roles("home").length !== 1) fail("exactly one home page");
if (roles("service").length < 1) fail("at least one service page");
if (roles("contact").length !== 1) fail("exactly one contact page");
for (const p of pages) {
  if (!p.route || !p.navLabel || !p.keyword) fail(`${p.route || "?"}: route, navLabel and keyword are required`);
  if (!p.hero?.h1 || !p.hero?.sub) fail(`${p.route}: hero.h1 and hero.sub are required`);
  if (!p.hero?.image?.alt || !p.hero?.image?.brief) fail(`${p.route}: hero.image needs alt and brief`);
  for (const s of p.sections || []) {
    if (!["review", "split", "services", "prose", "steps", "faq", "callBand", "list"].includes(s.type)) fail(`${p.route}: unknown section type ${s.type}`);
    if (s.type === "split" && !(s.image?.alt && s.image?.brief)) fail(`${p.route}: split "${s.heading}" needs image alt and brief`);
  }
}
const built = new Set(pages.map((p) => p.route));
for (const s of pkg.services || []) if (s.route && !built.has(s.route)) fail(`service "${s.name}" links to ${s.route}, which is not a page`);
{ const hs = roles("home")[0]?.sections || []; const svcLinks = new Set(hs.map((s) => s.link?.route).filter(Boolean)); if (!hs.some((s) => s.type === "services") && svcLinks.size < Math.min(2, built.size - 2)) fail("home page needs a services section or a section per main service that links to its page (HOMEPAGE_GUIDE)"); }
if (!pkg.strategy?.why?.length || !pkg.strategy?.cards?.length || !pkg.strategy?.reportCard?.length) fail("strategy: why, cards and reportCard are required");

// 2. Quotes
const used = new Map();
const allSections = pages.flatMap((p) => (p.sections || []).map((s) => ({ ...s, route: p.route })));
for (const s of allSections.filter((s) => s.type === "review")) {
  if (!/^[A-Z][a-zA-Z'-]+ [A-Z]\.$/.test(s.name || "")) fail(`${s.route}: review name "${s.name}" must be First L.`);
  if (!reviews) { warn("no reviews.json beside words.json; quotes not verified"); continue; }
  const q = norm(s.quote).replace(/^"|"$/g, "");
  const parts = q.split(/\s*(?:\.\.\.|…)\s*/).filter(Boolean);
  const hit = reviews.find((r) => r.rating === 5 && norm(r.reviewer) === norm(s.name) && parts.every((pt) => norm(r.text).includes(pt)));
  if (!hit) fail(`${s.route}: quote from ${s.name} not found word for word in a five-star review: "${q.slice(0, 70)}…"`);
  else { if (used.has(hit.id)) fail(`${s.route}: review from ${s.name} already used on ${used.get(hit.id)}`); used.set(hit.id, s.route); }
}

// 3. Keywords
const home = roles("home")[0];
const ct = norm(b.companyType).toLowerCase();
if (home) {
  const h1 = norm(home.hero?.h1).toLowerCase();
  if (!h1.startsWith(`${ct} in ${norm(b.city).toLowerCase()}, ${norm(b.state).toLowerCase()}`)) fail(`home H1 must start "${b.companyType} in ${b.city}, ${b.state}" (company type, one city): "${home.hero?.h1}"`);
  const otherCities = (b.serviceArea?.towns || []).filter((t) => norm(t).toLowerCase() !== norm(b.city).toLowerCase() && h1.includes(norm(t).toLowerCase()));
  if (otherCities.length) fail(`home H1 names a second city: ${otherCities.join(", ")}`);
}
for (const p of roles("service")) if (norm(p.hero?.h1).toLowerCase().includes(ct)) fail(`${p.route}: service H1 repeats the homepage keyword "${b.companyType}"`);
for (const p of roles("service")) {
  const head = norm(p.hero?.h1).split(/ in [A-Z]/)[0];
  if (/ & | and |, /.test(head)) fail(`${p.route}: one service per service page; "${head}" combines services`);
}
const svcRoutes = new Map();
for (const s of pkg.services || []) if (s.route) { if (svcRoutes.has(s.route)) fail(`services "${svcRoutes.get(s.route)}" and "${s.name}" both link to ${s.route}`); svcRoutes.set(s.route, s.name); }
const kw = new Map();
for (const p of pages) { const k = norm(p.keyword).toLowerCase(); if (kw.has(k)) fail(`${p.route} and ${kw.get(k)} share keyword "${p.keyword}"`); kw.set(k, p.route); }

// 4. Voice (business pages only)
const voiceBad = [
  [/\bcustomers? (tell|told|say|said|write|wrote|have said|notice)\b/i, "customers-tell-us sentence (state the benefit; let the review prove it)"],
  [/\bmost (people|customers|homeowners) (notice|say|tell)\b/i, "most-people-notice sentence"],
  [/\bone customer\b/i, "one-customer sentence"],
  [/\b(your|our) reviews (say|describe|mention)\b/i, "reviews-say sentence on a business page"],
  [/\bhomeowners (tell|say)\b/i, "homeowners-tell-us sentence"],
  [/(^|[.!?]\s)(The crew|Crews|The installers|They) (shows?|cover|set|take|come|arrive|clean|haul|have)\b/, "third-person crew narration (use our crew / we)"],
  [/professional website|mobile[- ]friendly experience|this (mockup|demo)|website experience/i, "website-quality claim"],
  ...(pkg.business?.owners || []).map((o) => [new RegExp(`\\b${o}( and [A-Z][a-z]+)? (own|owns|stay|stays|quote|quotes|check|checks|run|runs|lead|leads)\\b`), `third-person owner sentence about ${o} (owners speak as "we")`]),
];
function pageTexts(p) {
  const t = [p.hero?.eyebrow, p.hero?.h1, p.hero?.sub, p.hero?.primaryCta?.label, p.hero?.secondaryCta?.label];
  for (const s of p.sections || []) {
    if (s.type === "review") { t.push(s.quote, s.name); continue; }
    t.push(s.heading, s.intro, s.text, ...(s.body || []), ...(s.list || []));
    for (const it of s.items || []) t.push(it.title, it.text, it.q, it.a);
    if (s.type === "services") for (const sv of pkg.services) t.push(sv.name, sv.blurb);
  }
  return t.filter(Boolean);
}
for (const p of pages) {
  for (const s of p.sections || []) {
    if (s.type === "review") continue;
    const txt = [s.heading, s.intro, s.text, ...(s.body || []), ...(s.list || []), ...(s.items || []).flatMap((i) => [i.title, i.text, i.q, i.a])].filter(Boolean).join(" ");
    for (const [re, label] of voiceBad) if (re.test(txt)) warn(`${p.route}: ${label}: "${(txt.match(re) || [""])[0]}" in "${(s.heading || s.type)}"`);
  }
  for (const [re, label] of voiceBad) if (re.test([p.hero?.sub].join(" "))) warn(`${p.route} hero: ${label}`);
}

// 6. Lengths (approximate rendered count)
// Fixed text the template adds to every business page, calibrated against the rendered Evolve template (2026-11-09):
// back bar, nav (desktop + mobile menu), header phone button, phone call bar, footer headings and labels, copyright.
const mainPhone = words((b.phones || [])[0]?.display);
const ctaLabel = words(pages.find((p) => p.role === "home")?.hero?.secondaryCta?.label || "Get a Free Estimate");
const chrome = words("← See why we built this site") + 2 * pages.filter((p) => p.role !== "home").reduce((n, p) => n + words(p.navLabel), 0)
  + mainPhone + (1 + mainPhone + ctaLabel) + words("Services Service area Contact Why choose us") + (b.email ? 1 : 0) + (b.hours ? 1 : 0)
  + words(`© 2026 ${b.name}`) + words(b.name) + 6;
const footerWords = words(pkg.footer?.about) + pkg.services.reduce((n, s) => n + words(s.name), 0) + words(b.serviceArea?.summary) + (b.phones || []).reduce((n, p) => n + words(p.label) + words(p.display), 0) + words(b.email) + words(b.hours) + (pkg.footer?.why || []).reduce((n, w) => n + words(w), 0);
const trust = pkg.trustBar.reduce((n, t) => n + words(t), 0);
// Josh, 2026-11-09: thin copy is the problem, not long copy. Fail below the minimum; above the soft size, only flag it for a look.
const ranges = { home: [900, 1400], service: [700, 1200], contact: [150, 600] }; // copy words only (Josh, 2026-11-09: menus, footer, trust bar and reviews no longer count)
for (const p of pages) {
  const n = pageTexts(p).filter((t) => !(p.sections || []).some((x) => x.type === "review" && (x.quote === t || x.name === t))).reduce((a, t) => a + words(t), 0); void chrome; void footerWords; void trust;
  const [lo, hi] = ranges[p.role];
  if (n < lo) fail(`${p.route}: about ${n} words of copy, too thin (minimum ${lo})`);
  else if (n > hi) warn(`${p.route}: about ${n} words of copy; long, check for filler (soft size ${hi})`);
  else info.push(`${p.route}: about ${n} rendered words (minimum ${lo})`);
  // One fact, said once per page: years in business, a "since" year, the warranty, the price promise. Trust bar and footer don't count.
  const body = [p.hero?.eyebrow, p.hero?.sub, ...(p.sections || []).filter((x) => x.type !== "review").flatMap((x) => [x.heading, x.intro, x.text, ...(x.body || []), ...(x.list || []), ...(x.items || []).flatMap((i) => [i.title, i.text, i.q, i.a])])].filter(Boolean).join(" \n ");
  const facts = [
    [/\bsince (?:19|20)\d\d\b/gi, "a since-year"],
    [/\b(?:over |more than |nearly |almost )?\d+\+? years?\b(?! old)(?!-old)/gi, "years in business"],
    [/\blifetime warrant/gi, "the lifetime warranty"],
    [/\b(?:we('ll| will) beat it|beat (?:a|any|the) lower price|price[- ]beat)/gi, "the price-beat promise"],
  ];
  for (const [re, label] of facts) {
    const hits = (body.match(re) || []).map((h) => h.toLowerCase());
    if (hits.length > 1) warn(`${p.route}: ${label} is said ${hits.length} times on one page (${[...new Set(hits)].join(", ")}); say it once`);
  }
}
const st = pkg.strategy || {};
const stWords = [st.whyHeading, ...(st.why || []), st.cardsHeading, st.cardsIntro, ...(st.cards || []).flatMap((c) => [c.title, c.route, c.why, ...(c.problems || []), ...(c.fixes || []), c.alsoAdd, "Current site problem What the demo fixes A full build would also add View page"]), st.reportCardHeading, ...(st.reportCard || []).flatMap((r) => [r.label, r.status]), st.closing?.heading, st.closing?.text].reduce((a, t) => a + words(t), 0) + 330; // + fixed hero, case study, full-build list, header, bar
(stWords > 1000 ? fail : (m) => info.push(m))(`strategy: about ${stWords} rendered words (max 1,000)`);

// 7. Repetition
const seen = new Map();
for (const p of pages) {
  const sents = new Set(pageTexts(p).flatMap((t) => strip(t).split(/(?<=[.!?])\s+/)).filter((s) => words(s) >= 8).map((s) => s.toLowerCase()));
  for (const s of sents) { const r = seen.get(s) || []; r.push(p.route); seen.set(s, r); }
}
for (const [s, r] of seen) if (r.length > 2) warn(`sentence on ${r.length} pages (${r.join(", ")}): "${s.slice(0, 70)}…"`);

// 8. Copy must not retell a review (Josh, 2026-11-09). State the benefit in general terms; the review supplies the specifics.
// Fails when business-page copy (outside review blocks) repeats a review's numbers ("five basement windows in four hours")
// or a 4-word phrase from any review ("sealed and trimmed out").
if (reviews) {
  const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, half: 0.5 };
  const STOP = new Set("a an the and or but of to in on for with at by from it its it's is was were are be been we our us you your they them their he she his her i my me this that these those so very just all as up out had has have do did not no how what can will would could get got make made sure well good great job work off old new over into".split(" "));
  // Names are not details: drop the business name and owners before comparing.
  const nameWords = new Set([b.name, ...(b.owners || [])].join(" ").toLowerCase().split(/\W+/).filter(Boolean));
  const toks = (t) => strip(t).toLowerCase().replace(/one-on-one/g, " ").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter((w) => w && !nameWords.has(w)).map((w) => (NUM[w] !== undefined ? String(NUM[w]) : w));
  const stem = (w) => w.replace(/(es|s)$/, "");
  const numPairs = (ts) => { const out = []; ts.forEach((w, i) => { if (/^\d+(\.\d+)?$/.test(w) && ts[i + 1] && !STOP.has(ts[i + 1]) && !/^(year|yr)s?$|^\d+$|^[ap]m$/.test(ts[i + 1])) out.push(`${w} ${stem(ts[i + 1])}`); }); return out; };
  const grams = (ts, n = 4) => { const out = []; for (let i = 0; i + n <= ts.length; i++) { const g = ts.slice(i, i + n); if (g.filter((w) => !STOP.has(w)).length >= 3) out.push(g.join(" ")); } return out; };
  // Numbers the business itself publishes (facts.md lines citing its own site, with no review on the line) are its offers, not review details.
  const factsFile = path.join(dir, "facts.md");
  const ownNums = new Set(fs.existsSync(factsFile) ? fs.readFileSync(factsFile, "utf8").split("\n").filter((l) => /https?:|\s\/[a-z0-9-]+/i.test(l) && !/review|[A-Z][a-z]+ [A-Z]\.|"\s*-\s*[A-Z]/.test(l)).flatMap((l) => numPairs(toks(l))) : []);
  const revNums = new Map(), revGrams = new Map();
  for (const r of reviews) { const ts = toks(r.text); for (const x of numPairs(ts)) revNums.set(x, r.reviewer); for (const g of grams(ts)) revGrams.set(g, r.reviewer); }
  const copyOf = (p) => [p.hero?.eyebrow, p.hero?.sub, ...(p.sections || []).filter((x) => x.type !== "review").flatMap((x) => [x.heading, x.intro, x.text, ...(x.body || []), ...(x.list || []), ...(x.items || []).flatMap((i) => [i.title, i.text, i.a])])].filter(Boolean); // FAQ questions are the visitor's words
  const strings = [...pages.flatMap((p) => copyOf(p).map((t) => [p.route, t])), ...(pkg.services || []).map((sv) => [`services[${sv.name}]`, sv.blurb]), ["footer.about", pkg.footer?.about], ...(pkg.footer?.why || []).map((w) => ["footer.why", w])].filter(([, t]) => t);
  for (const [where, t] of strings) {
    const ts = toks(t);
    const hitN = numPairs(ts).filter((x) => revNums.has(x) && !ownNums.has(x));
    const hitG = grams(ts).filter((g) => revGrams.has(g));
    if (hitN.length || hitG.length) warn(`${where}: copy retells a review (${[...hitN.map((x) => `"${x}"`), ...hitG.slice(0, 2).map((g) => `"${g}"`)].join(", ")} from ${revNums.get(hitN[0]) || revGrams.get(hitG[0])}); state the benefit, let the review give the details: "${strip(t).slice(0, 80)}…"`);
  }
}

console.log(`# Words package check: ${dir}\n`);
for (const m of info) console.log(`info  ${m}`);
for (const m of warns) console.log(`WARN  ${m}`);
for (const m of fails) console.log(`FAIL  ${m}`);
console.log(`\n${fails.length ? "FAIL" : "PASS"}: ${fails.length} fail, ${warns.length} warn`);
process.exit(fails.length ? 1 : 0);
