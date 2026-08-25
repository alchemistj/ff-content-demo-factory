/**
 * Fresh Writer 1 production copy for the sealed 360 canary.
 * This agent (Grok 4.6, high, fast off) authors the two service pages.
 * It does not restore the rejected rendered-words digest and does not call vendors.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { parseAndValidateFreshWriter1Output, validateSealed, writer1Projection } from "./360-words-canary.ts";
import { writer1RenderedWordsDigest } from "../src/pipeline/cursor-writer.ts";

const REJECTED_RENDERED_WORDS_DIGEST = "sha256:165d310ae1e30225b6278cc0fbde7d2cab23a60f186157c59734257519c01f89";
const WORD = /[A-Za-z0-9']+/g;
const ROOT = process.cwd();

type Dict = Record<string, any>;

function words(text: string): number {
  return (text.match(WORD) || []).length;
}

function visiblePageWords(page: Dict): number {
  const parts = [page.h1, page.body, ...(page.sections || []).flatMap((section: Dict) => [section.heading, section.body]), ...(page.reviewPlacements || []).flatMap((placement: Dict) => [placement.quote, placement.attribution])];
  return words(parts.filter((value): value is string => typeof value === "string").join("\n"));
}

function excerpt(source: string, needle: string, label: string): string {
  const normalizedSource = source.replace(/[“”"']/gu, "'").replace(/\s+/gu, " ");
  const normalizedNeedle = needle.replace(/[“”"']/gu, "'").replace(/\s+/gu, " ");
  if (!source.includes(needle) && !normalizedSource.includes(normalizedNeedle)) {
    throw new Error(`quote for ${label} is not contained in sealed source text`);
  }
  return needle;
}

function pointer(reviewId: string, placement: string, section: string): Dict {
  return { reviewId, provenance: { type: "evidence", ref: reviewId, placement, section } };
}

function reviewPlacement(reviewId: string, quote: string, attribution: string, placement: string, section: string): Dict {
  return { reviewId, quote, attribution, provenance: { type: "review", ref: reviewId, placement, section } };
}

function claim(text: string, ref: string, placement: string, section: string): Dict {
  return { claim: text, provenance: { type: "evidence", ref, placement, section } };
}

const sealed = validateSealed(ROOT);
const projection = writer1Projection(sealed);
const byId = new Map<string, { reviewer: string; text: string }>();
for (const service of projection.services) {
  for (const entry of service.reviewEvidence) {
    byId.set(entry.review.id, { reviewer: entry.review.author, text: entry.review.text });
  }
}
for (const folded of projection.foldedSupport) {
  for (const entry of folded.reviewEvidence) {
    byId.set(entry.review.id, { reviewer: entry.review.author, text: entry.review.text });
  }
}
function source(id: string): { reviewer: string; text: string } {
  const review = byId.get(id);
  if (!review) throw new Error(`missing sealed review ${id}`);
  return review;
}

const CHRIS = "Ci9DQUlRQUNvZENodHljRjlvT201TVdWZGZSak00ZUhSQ2VVdHNYMWxFYTBFdE9XYxAB";
const JUDI = "Ci9DQUlRQUNvZENodHljRjlvT2xoRE1HZ3lUMWRpVWt3d1dsVXhjVE5XZEc1VWVuYxAB";
const KELSIE = "ChdDSUhNMG9nS0VQcUM5dGpxNjRxcHJBRRAB";
const JASON = "Ci9DQUlRQUNvZENodHljRjlvT2taQlh6VlZabU5OWjFKc2JISklTa1pXUlVwVGVuYxAB";
const MARCIE = "Ci9DQUlRQUNvZENodHljRjlvT25jM2NVNTZlVzF0YVhCNVdXSlVZVEpmYW05UExYYxAB";
const CHRISTINE = "Ci9DQUlRQUNvZENodHljRjlvT2pBMU5rSktSMmhHV1RKb2NVdE1TVXBOVFRsS01YYxAB";
const MATTHEW = "Ci9DQUlRQUNvZENodHljRjlvT2xjeVFtOTRMV3BTTUc1Qk5VeFNhVTlJYW1GcFMwRRAB";
const SCOTT = "ChZDSUhNMG9nS0VJNng0b1B1N3NEY0ZBEAE";

const chris = source(CHRIS);
const judi = source(JUDI);
const kelsie = source(KELSIE);
const jason = source(JASON);
const marcie = source(MARCIE);
const christine = source(CHRISTINE);
const matthew = source(MATTHEW);
const scott = source(SCOTT);

const chrisQuote = excerpt(chris.text, "Will did a fantastic job on our old huge garage door that was sagging from age. He thoroughly explained the problem and the best solution along with a great estimate, the work was completed quickly.", "Chris Keaton");
const judiQuote = excerpt(judi.text, "They gave me options and let me choose what I wanted done, what had to be repaired now and what could wait.", "Judi Wills");
const kelsieQuote = excerpt(kelsie.text, "His recommendations were mindful to ensure that our garage was not only working properly, but that it was stabilized and safe. Will had everything he needed to complete our repair on his truck, so it was quick and efficient.", "Kelsie Bates");
const jasonQuote = excerpt(jason.text, "I am very happy with the job Will did on our garage door spring replacement. My door works better now than ever.", "jason tourville");
const marcieQuote = excerpt(marcie.text, "We got our new garage doors installed yesterday and they look amazing!  Very professional and the gentleman that did the installation was very polite and kept things picked up while he worked.", "Marcie Spitzer");
const christineQuote = excerpt(christine.text, "Jenny is a doll, a big help with choosing a garage door you want and very budget friendly! Will installs them.", "Christine Kallmbah");
const matthewQuote = excerpt(matthew.text, "We are painting the door and the technician left the trim loose for the perfect application for paint.", "Matthew Smith");
const scottQuote = excerpt(scott.text, "My project was replacing a 1980 7ft overhead door with a 9’-6” tall door for my reframed opening so we could fit our new camper van.", "Scott Heffern");

const repairQuoted = new Set([CHRIS, JUDI, KELSIE, JASON]);
const installQuoted = new Set([MARCIE, CHRISTINE, MATTHEW, SCOTT]);

const repair = {
  type: "service",
  url: "/garage-door-repair",
  prescriptionId: "Service:/garage-door-repair",
  primaryKeyword: "garage door repair Springfield MO",
  title: "Garage Door Repair in Springfield, MO",
  seoTitle: "Garage Door Repair in Springfield, MO | 360 Garage Door and More",
  metaDescription: "Springfield garage door repair for doors that sag, stick, or will not open. Call (417) 366-7360, Monday–Friday 8 AM–5 PM.",
  h1: "Garage door repair for doors that sag, stick, or will not open",
  body: "The door you already have is the job. If it sags in the opening, sticks on the way up, sits on the floor, or will not open at all, start here. 360 Garage Door and More works from 2035 W Mt Vernon St in Springfield. Jenny is the person homeowners name on the phone. Will is the person they name in the garage. A new door belongs on the installation page. Springs, seals, tracks, rollers, and wiring stay on this page with the door that is already hanging.",
  sections: [
    {
      id: "repair-when-to-call",
      heading: "When the door you have is the problem",
      body: "Call for repair when you intend to keep the door that is already in the opening. The clearest completed example is an old, oversized door that had started to sag with age. Will explained what was wrong, what would actually fix it, and what the work would cost before he started. That is the decision this page is for: get the opening working again, not shop a new slab.\n\nIf the door is off its usual travel, opening on one side only, or refusing to lift, say that when you call. Homeowners also come in after something has gone wrong in the garage itself — an animal getting into the wiring, a door that suddenly will not move — and need both doors traveling again. The point is the same. The door stays. The hardware that failed gets diagnosed on site.",
    },
    {
      id: "repair-whats-in-scope",
      heading: "What stays on this repair visit",
      body: "Repair covers the door that is already hanging and the hardware that makes it travel. Completed jobs include sagging doors, doors that would not open, broken springs, bottom seals, tracks and rollers, and wiring put back after it was disturbed. If a spring is why the door will not lift, it is still a repair visit.\n\nSpring replacement is the most common related failure homeowners describe. Will replaced the spring, and the door worked better afterward. You do not need a different shop for that work.",
    },
    {
      id: "repair-visit",
      heading: "Diagnosis, options, then the work you choose",
      body: "The useful part of a repair visit is the conversation before anyone starts swapping parts. One homeowner was given a split: what had to be repaired now, and what could wait. She chose to do everything at once. Nobody pushed her into that choice, and the work was explained as it happened.\n\nThat same visit shape shows up when the door simply needs to open and close consistently. Homeowners notice the crew does not load the appointment with extras they did not ask for. Ask for the split — now versus later — before you agree to a longer list of parts.",
    },
    {
      id: "repair-equipped",
      heading: "What they can finish while they are there",
          body: "When the needed part is already on the truck, the repair can finish in that visit. One homeowner’s recommendations were about a door that would stay stable and safe, and Will already had what he needed with him. On a routine maintenance stop, he has also spotted a couple of areas that would help the door run, explained the recommendation with pricing, and had the materials on hand.\n\nIf a part is not on the truck, Jenny schedules the follow-up so the work can finish when the part arrives.",
    },
    {
      id: "repair-local-crew",
      heading: "A Springfield shop with named people",
      body: "Homeowners keep naming the same two people. Jenny handles the call, the text, and the schedule. Will does the on-site work; a spring install also names Blake on the job with him. Callers come back because this is a local Springfield business, not a chain, and because the person who diagnosed the door is the person who repaired it.\n\nThe shop address is 2035 W Mt Vernon St. If you already know you need a new door rather than a repair, use the installation page. This page stays with the door you have.",
    },
    {
      id: "repair-next",
      heading: "Call with what the door is doing",
      body: "Reach Jenny at (417) 366-7360. Shop hours are Monday through Friday, 8 AM to 5 PM. Saturday and Sunday the shop is closed. Tell her whether the door will not open, sags in the opening, sticks, or needs a spring or seal. If a door they already repaired starts acting up later, call the same shop.",
    },
  ],
  reviewPlacements: [
    reviewPlacement(CHRIS, chrisQuote, chris.reviewer, "lead-sagging-door", "repair-when-to-call"),
    reviewPlacement(JASON, jasonQuote, jason.reviewer, "folded-spring-replacement", "repair-whats-in-scope"),
    reviewPlacement(JUDI, judiQuote, judi.reviewer, "options-without-pressure", "repair-visit"),
    reviewPlacement(KELSIE, kelsieQuote, kelsie.reviewer, "parts-on-truck", "repair-equipped"),
  ],
  reviewEvidence: [
    pointer(CHRIS, "lead-sagging-door", "repair-when-to-call"),
    pointer(JASON, "folded-spring-replacement", "repair-whats-in-scope"),
    pointer(JUDI, "options-without-pressure", "repair-visit"),
    pointer(KELSIE, "parts-on-truck", "repair-equipped"),
    ...projection.services[0].reviewEvidence
      .map((entry: Dict) => String(entry.review.id))
      .filter((id: string) => !repairQuoted.has(id))
      .map((id: string) => pointer(id, "authorized-repair-inventory", "repair-whats-in-scope")),
  ],
  claims: [
    claim("Completed Springfield jobs include sagging doors, doors that would not open, and repairs that restored consistent open-and-close.", "garage-door-repair", "completed-repair-scope", "repair-whats-in-scope"),
    claim("Homeowners describe on-site diagnosis, options without pressure, and repairs finished in the visit when the needed parts were already on the truck.", "Service:/garage-door-repair", "visit-shape", "repair-visit"),
  ],
};

const install = {
  type: "service",
  url: "/garage-door-installation",
  prescriptionId: "Service:/garage-door-installation",
  primaryKeyword: "garage door installation Springfield MO",
  title: "Garage Door Installation in Springfield, MO",
  seoTitle: "Garage Door Installation in Springfield, MO | 360 Garage Door and More",
  metaDescription: "New garage doors installed for the opening you have in Springfield, MO. Call (417) 366-7360, Monday–Friday 8 AM–5 PM.",
  h1: "New garage doors installed for the opening you have",
  body: "This page is for a new door, or more than one, fitted to the opening you already have. It is not the troubleshooting page for a door you intend to keep. Jenny helps homeowners choose. Will installs. The shop is 360 Garage Door and More at 2035 W Mt Vernon St, Springfield.",
  sections: [
    {
      id: "install-when",
      heading: "When you need a new door, not a repair",
      body: "Choose installation when the slab is done, the opening needs a different door, or you are putting doors on a house that does not have the ones you want. The straightforward completed example is new garage doors — more than one on the same visit — installed, looking the way they should, with the installer keeping the site picked up while he worked.\n\nIf the door you have still belongs in that opening and just will not travel, start on the repair page instead. This page stays with a new door in the opening you have. Households that found the shop through a local Facebook group describe the same end state: a completed new door in the opening, not a repair patch on the old one.",
    },
    {
      id: "install-selection",
      heading: "Choosing a door you can live with",
      body: "Selection is a considered purchase, not a parts swap. One homeowner asked around, then worked with Jenny on the door she actually wanted. Will installed it. That split — Jenny on selection and schedule, Will on the install — is how completed jobs describe the company.\n\nBudget comes up in those conversations because Jenny is the person who walks the choice. This page does not list prices. Bring the look you want, the opening size if you know it, and whether you are replacing one door or more than one.",
    },
    {
      id: "install-opening",
      heading: "Fitted to the opening you have",
          body: "Not every opening is a catalog size. One completed job replaced a 1980 7-foot door with a 9-foot-6 door so a camper van would clear. The opening had already been reframed. Will and Jenny came out to size the door to that opening; they did not build the framing.\n\nIf your opening is taller, shorter, or simply not a standard size, the useful next step is that same on-site size conversation before anyone orders a door.",
    },
    {
      id: "install-onsite",
      heading: "How the install visit is left",
      body: "On a considered purchase, the last hour of the visit matters as much as the first. One household was going to paint, so the technician left the trim loose for that work. The door was in, the site was usable, and the finish work they still planned to do was not blocked.\n\nAsk how the opening will be left at the end of the day: debris, trim, whether the door is ready to paint, and whether you can use the garage that evening. Cleanup during the install shows up in completed jobs, not as a separate add-on. If you are replacing two doors, ask whether both openings are finished in the same visit or staged.",
    },
    {
      id: "install-next",
      heading: "Start with the opening you have",
      body: "Call (417) 366-7360 during Monday through Friday, 8 AM to 5 PM hours. The shop is closed Saturday and Sunday. Have the opening width and height if you know them, say whether you are replacing one door or more than one, and mention if the opening was reframed or will be painted after the door is in. Repair for a door you intend to keep is on the repair page.",
    },
  ],
  reviewPlacements: [
    reviewPlacement(MARCIE, marcieQuote, marcie.reviewer, "lead-new-doors", "install-when"),
    reviewPlacement(CHRISTINE, christineQuote, christine.reviewer, "selection-help", "install-selection"),
    reviewPlacement(SCOTT, scottQuote, scott.reviewer, "taller-door-reframed-opening", "install-opening"),
    reviewPlacement(MATTHEW, matthewQuote, matthew.reviewer, "paint-ready-trim", "install-onsite"),
  ],
  reviewEvidence: [
    pointer(MARCIE, "lead-new-doors", "install-when"),
    pointer(CHRISTINE, "selection-help", "install-selection"),
    pointer(SCOTT, "taller-door-reframed-opening", "install-opening"),
    pointer(MATTHEW, "paint-ready-trim", "install-onsite"),
    ...projection.services[1].reviewEvidence
      .map((entry: Dict) => String(entry.review.id))
      .filter((id: string) => !installQuoted.has(id))
      .map((id: string) => pointer(id, "authorized-installation-inventory", "install-when")),
  ],
  claims: [
    claim("Completed jobs include new garage doors, more than one door at a time, and a taller door fitted to a reframed opening.", "garage-door-installation", "completed-install-scope", "install-opening"),
    claim("Homeowners describe help choosing a door, paint-ready trim left loose, and cleanup while the install is underway.", "Service:/garage-door-installation", "install-visit-shape", "install-onsite"),
  ],
};

const output = {
  schemaVersion: "words-writer1-output/v1",
  pages: [repair, install],
};

const validated = parseAndValidateFreshWriter1Output(output, projection);
const renderedWordsDigest = writer1RenderedWordsDigest(validated);
if (renderedWordsDigest === REJECTED_RENDERED_WORDS_DIGEST) {
  throw new Error("fresh Writer1 copy still hashes to the rejected rendered-words digest");
}

const repairWords = visiblePageWords(validated.pages[0]);
const installWords = visiblePageWords(validated.pages[1]);

function renderReview(item: Dict): string[] {
  return [`> ${item.quote}`, `> — ${item.attribution}`, ""];
}

function renderPage(page: Dict): string[] {
  const out = [
    `## ${page.url === "/garage-door-repair" ? "Garage Door Repair" : "Garage Door Installation"} (\`${page.url}\`)`,
    "",
    `SEO title: ${page.seoTitle}`,
    `Meta description: ${page.metaDescription}`,
    "",
    `# ${page.h1}`,
    "",
    page.body,
    "",
  ];
  const bySection = new Map<string, Dict[]>();
  for (const placement of page.reviewPlacements || []) {
    const section = placement.provenance.section;
    bySection.set(section, [...(bySection.get(section) || []), placement]);
  }
  for (const section of page.sections || []) {
    out.push(`### ${section.heading}`, "", section.body, "");
    for (const placement of bySection.get(section.id) || []) {
      if (!section.body.includes(placement.quote)) out.push(...renderReview(placement));
    }
  }
  return out;
}

const md = [
  "# Writer 1 service-page checkpoint — 360 Garage Door and More",
  "",
  "Fresh Writer 1 production copy. This checkpoint is the two prescribed service pages only. Home, Contact, header/footer, and Strategy Overview remain blocked until Architect QA accepts this Writer 1 pass.",
  "",
  "## Diagnostic word counts",
  "",
  `- Garage Door Repair useful-body words: **${repairWords}** (guidance 650–900+; not an acceptance reason)`,
  `- Garage Door Installation useful-body words: **${installWords}** (guidance 650–900+; not an acceptance reason)`,
  `- Rendered-words digest: \`${renderedWordsDigest}\``,
  `- Rejected lineage digest (must not match): \`${REJECTED_RENDERED_WORDS_DIGEST}\``,
  "- Writer: Grok 4.6, high effort, fast off, this Cursor thread",
  "- No merge. No deploy. No vendor calls.",
  "",
  "## Pages",
  "",
  ...renderPage(validated.pages[0]),
  ...renderPage(validated.pages[1]),
  "## Review / evidence pointer ledger",
  "",
];
for (const page of validated.pages) {
  md.push(`### ${page.url}`, "", "| reviewId | provenance.type | provenance.ref | placement | section |", "| --- | --- | --- | --- | --- |");
  for (const item of page.reviewEvidence || []) {
    const prov = item.provenance || {};
    md.push(`| \`${item.reviewId}\` | ${prov.type} | \`${prov.ref}\` | ${prov.placement} | ${prov.section} |`);
  }
  md.push("", "Quoted placements:", "");
  for (const item of page.reviewPlacements || []) {
    md.push(`- \`${item.reviewId}\` — ${item.attribution}: "${String(item.quote).slice(0, 140)}"`);
  }
  md.push("");
}

mkdirSync(path.join(ROOT, "canary/outputs"), { recursive: true });
writeFileSync(path.join(ROOT, "canary/outputs/writer1-output.json"), `${JSON.stringify(validated, null, 2)}\n`);
writeFileSync(path.join(ROOT, "canary/outputs/writer1-service-pages.md"), `${md.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`);

const summary = {
  schemaVersion: "words-writer1-fresh-copy/v1",
  status: "writer1-copy-authored",
  writer2Blocked: true,
  rawRejectedLineageRestored: false,
  renderedWordsDigest,
  rejectedRenderedWordsDigest: REJECTED_RENDERED_WORDS_DIGEST,
  repairUsefulBodyWords: repairWords,
  installationUsefulBodyWords: installWords,
  quotedReviewIds: {
    repair: [...repairQuoted],
    installation: [...installQuoted],
  },
  threadUrl: "https://cursor.com/agents/bc-2486f645-c31c-4532-8145-fbe3af1d45a8",
  model: "cursor-grok-4.6-high",
  fast: false,
  effort: "high",
  mergeOccurred: false,
  deploymentOccurred: false,
};
mkdirSync(path.join(ROOT, "canary/runtime"), { recursive: true });
writeFileSync(path.join(ROOT, "canary/runtime/writer1-fresh-copy.json"), `${JSON.stringify(summary, null, 2)}\n`);

console.log(JSON.stringify({
  status: "valid",
  renderedWordsDigest,
  rejectedMatch: renderedWordsDigest === REJECTED_RENDERED_WORDS_DIGEST,
  repairWords,
  installWords,
  outputSha256: `sha256:${createHash("sha256").update(JSON.stringify(validated)).digest("hex")}`,
}, null, 2));
