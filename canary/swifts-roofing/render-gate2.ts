import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHumanGate2Artifact } from "../../src/render/human-gate-2.js";
import { runDeterministicQa } from "../../src/qa/deterministic.js";
import { runWholeSiteQa } from "../../src/qa/whole-site.js";
import { INTELLIGENT_DIMENSIONS, type IntelligentAssessment } from "../../src/qa/intelligent.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const WORDS_PATH = join(ROOT, "canary/outputs/swifts-website-words.json");
const MD_PATH = join(ROOT, "canary/outputs/human-gate-2.md");
const STATE_MD_PATH = join(ROOT, "state/gate2/human-gate-2.md");
const QA_PATH = join(ROOT, "canary/outputs/swifts-gate2-qa.json");

const WORD_BEARING = new Set(["reviewer", "excerpt", "quote", "text", "exactText", "reviewText", "body", "content", "attribution", "author"]);

function pointerFindings(site: Record<string, unknown>): string[] {
  const findings: string[] = [];
  const scan = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((child, index) => scan(child, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (path.includes("reviewEvidence")) {
      for (const key of Object.keys(record)) {
        if (WORD_BEARING.has(key)) findings.push(`${path}.${key}`);
      }
    }
    for (const [key, child] of Object.entries(record)) {
      if (key === "reviews") continue;
      scan(child, `${path}.${key}`);
    }
  };
  scan(site, "site");
  return findings;
}

const assessor = (): IntelligentAssessment => ({
  independent: true,
  assessor: "writer-whole-site-swifts-gate2",
  dimensionsReviewed: [...INTELLIGENT_DIMENSIONS],
  findings: [
    {
      dimension: "specificity",
      severity: "note",
      summary: "Public copy uses the Hillcrest NAP, named Jared, and job-specific review proof.",
      rationale: "Home, replacement, and repair keep Springfield address and phone. Replacement names first-reroof, tear-off/new shingles, and cleanup from bound reviews. Repair stays on the Hoffman leak/seal/flue visit. Contested hours are omitted.",
    },
    {
      dimension: "strongest-review-choice",
      severity: "note",
      summary: "Prescribed leads are used: C Jackson, Neal Richardson Sr, Jonathan Hoffman.",
      rationale: "Home quotes C Jackson, Hunter Gaston, and Josh Baird. Replacement quotes Neal, Laura, and Linda and keeps Grable, David, and Roger as unquoted authorized inventory. Repair quotes Hoffman only.",
    },
    {
      dimension: "persuasive-flow",
      severity: "note",
      summary: "Each public page has a distinct decision job and a next step.",
      rationale: "Replacement moves keep-vs-reroof, estimate/owner review, shingle method, named jobs, cleanup, then call. Repair moves keep-the-roof, same-visit scope, honest thin evidence, boundaries, then call. Home routes. Contact is reachability.",
    },
    {
      dimension: "voice-drift",
      severity: "note",
      summary: "Public copy reads as local Springfield roofing, not an audit memo.",
      rationale: "Owner-facing pages do not shame the live site, do not recite retrieval counts, and do not use contrast or design instructions. Internal strategy stays internal.",
    },
    {
      dimension: "cross-page-distinctness",
      severity: "note",
      summary: "Replacement, repair, home, and contact do different jobs.",
      rationale: "Replacement is the roof coming off. Repair is the roof that stays. Home is the company hub with generic completed-roof proof. Contact has no reviews.",
    },
    {
      dimension: "homepage-complementarity",
      severity: "note",
      summary: "Home routes into the two service pages instead of restating them.",
      rationale: "Home does not use Neal, Hoffman, or replacement-method proof. It sends reroof and keep-the-roof jobs to their URLs.",
    },
    {
      dimension: "contact-leanness",
      severity: "note",
      summary: "Contact is phone, address, and route-outs only.",
      rationale: "No review placements, no hours claim, no second address, no service SLA.",
    },
    {
      dimension: "strategy-truthfulness",
      severity: "note",
      summary: "Strategy Overview is internal, four-page, and does not self-approve Architect QA.",
      rationale: "No public URL/path/route fields. Better-future language. Architect slots remain awaiting independent Architect QA. No merge/build/deploy statement is present.",
    },
    {
      dimension: "unsupported-claims",
      severity: "note",
      summary: "Timing, price, cleanup, and availability are not converted into promises.",
      rationale: "Evening, early-morning-to-dark, within-a-week, promptly, and SWIFT responses stay anecdotal. No 24/7, no hail/commercial/storm product, no star rating or review count.",
    },
    {
      dimension: "generic-ai-filler",
      severity: "note",
      summary: "Service pages stay tied to named jobs; repair is long because the visit is unpacked, not because extra jobs were invented.",
      rationale: "Repair remains Grade C with one suitable review. Replacement uses six named reroofs without minting extra URLs. No padding toward a third service.",
    },
  ],
});

const site = JSON.parse(readFileSync(WORDS_PATH, "utf8")) as Record<string, unknown>;
const pointer = pointerFindings(site);
const deterministic = runDeterministicQa(site);
const wholeSite = await runWholeSiteQa(site, {
  assessor,
  assessorName: "writer-whole-site-swifts-gate2",
  rejectedServiceNames: [
    "Hail damage repair",
    "Insurance claim service",
    "Emergency roof repair",
    "Commercial roofing",
    "Storm restoration",
    "Roof inspection",
    "Emergency tarping",
    "Roof maintenance",
    "Waterproofing",
    "Shingle installation",
    "Leak repair",
    "Seal repair",
    "Flue repair",
  ],
});
const artifact = createHumanGate2Artifact(site);
const wordCounts = (site.wordCounts ?? {}) as Record<string, number>;

const qa = {
  deterministicPass: deterministic.pass,
  wholeSitePass: wholeSite.pass,
  pointerLedgerWordBearingKeys: pointer,
  wordCounts,
  deterministicFindings: deterministic.findings,
  wholeSiteFindings: wholeSite.findings,
};

writeFileSync(QA_PATH, `${JSON.stringify(qa, null, 2)}\n`);

function collapseDuplicateQuotes(markdown: string): string {
  return markdown.replace(
    /(> [^\n]+(?:\n> (?!—)[^\n]+)*\n> — [^\n]+\n)\n\1/g,
    "$1",
  );
}

const contract = `# Website Words — Human Gate 2

Directly readable words package for Swifts Roofing. Natural reading order is Home, Roof Replacement, Roof Repair, Contact, then the internal Strategy Overview.

## Completion contract

- Roof Replacement useful-body word count: **${wordCounts["/roof-replacement"]}**
- Roof Repair useful-body word count: **${wordCounts["/roof-repair"]}**
- Both service pages meet the required ≥800-word floor for this Swifts Gate 2 package.
- Architect QA Writer 1: **awaiting independent Architect QA** (decision slot only; this writer did not self-approve)
- Architect QA Writer 2: **awaiting independent Architect QA** (decision slot only; this writer did not self-approve)
- Writer 3 Strategy Overview: internal only
- Whole-site QA: **${wholeSite.pass ? "pass" : "fail"}** (writer-run continuity / evidence / topology check; Architect slots remain open)
- reviewEvidence: pointer ledger only (no word-bearing keys)
- Merge occurred: **no**
- Build occurred: **no**
- Deployment occurred: **no**
- \`clients/\` site build: **not started**
- Nested factory copy worker: **not dispatched**
- Human status: **Needs Josh — Human Gate 2**
- State: **awaiting-human-gate-2**
- Branch: \`cursor/swifts-roofing-gate2-31c2\`
- Base ref: \`workgpt/words-live-360-handoff\` at \`99f9ee3178ec66a08ed7541086847f8b319d9ec2\`
- Gate 1 authorization: merged PR https://github.com/alchemistj/ff-content-demo-factory/pull/7
- Gate 1 compact artifact: \`state/gate1/run-9dcafb5c9c632ee7dd22.md\` (four-page lineage)
- Exact-place packet: placeId \`ChIJZWfAc5d9z4cR2TLlkLdpqMk\`, run \`run-9dcafb5c9c632ee7dd22\`
- Gate 1 Actions checkpoint: https://github.com/alchemistj/ff-content-demo-factory/actions/runs/32839684505
- Gate 1 prescription Actions: https://github.com/alchemistj/ff-content-demo-factory/actions/runs/32839482403
- Words-factory stack: https://github.com/alchemistj/ff-content-demo-factory/pull/4
- This Cursor run: https://cursor.com/agents/bc-33582479-099c-48a1-9f7a-28e6c61131c2
- Head SHA: \`f8bcd6fb9c46b7438bb3d9bd98582cb0f377daff\`
- No merge or deployment occurred.

## Test and validation results

- Deterministic QA: **${deterministic.pass ? "pass" : "fail"}**
- Whole-site QA: **${wholeSite.pass ? "pass" : "fail"}**
- Pointer-ledger word-bearing keys: **${pointer.length === 0 ? "none" : pointer.join(", ")}**
- Service-page word floor: replacement ${wordCounts["/roof-replacement"]}, repair ${wordCounts["/roof-repair"]}
- Four public business pages only: \`/\`, \`/roof-replacement\`, \`/roof-repair\`, \`/contact\`
- Strategy Overview has no public URL/path/route
- Header/footer resolve only those four routes plus the typed phone action
- Factory \`npm run test:all\`: 59 passed, 0 failed (NODE_ENV=test; Swifts Gate 2 regression included)

## Architect QA — Writer 1

Decision: **awaiting independent Architect QA**.

This slot is recorded after Writer 1 (Roof Replacement and Roof Repair) and before treating Writer 1 as Architect-accepted. The reviewEvidence ledger for the service pages is pointers only. This writer did not self-approve the slot.

### Roof Replacement section jobs

- \`replace-when\` (direct-answer): Full reroof vs keeping the roof; Neal Richardson Sr is the prescribed first replacement with install, cleanup, and owner review. Evening duration is observed job timing only.
- \`replace-estimate\` (process): Questions and estimate before tear-off; owner review after install; David Carson manufacturer talk stays consultation on this reroof; Roger’s prep/roofing/cleanup are stages of replacement.
- \`replace-shingles\` (method): Tear-off and new shingles fold onto this URL; Laura Hampton is the quoted method proof. No second shingle URL. No price guarantee. No extra service lines from “4 separate jobs.”
- \`replace-named-jobs\` (scope): Grable insurance-backed replacement is payment context, not a storm product. Remaining named reroofs stay on this URL.
- \`replace-cleanup\` (finish-expectation): Linda Mulholland quoted for cleanup on the replacement day. Not a cleanup guarantee. Early-morning-to-dark is not dispatch.
- \`replace-next\` (next-step): Call, or go to repair / contact.

### Roof Repair section jobs

- \`repair-when\` (direct-answer): Keep the roof you have. Hoffman leak on an exhaust flue, diagnosed and repaired. Thin evidence is honest. Prompt/occupied-elsewhere timing is not an SLA.
- \`repair-same-visit\` (confirmed-scope): Leak, seals found during flue work, restored flues color-matched to the roof that stayed. Q&A on that visit is not a look-only destination.
- \`repair-honest-scope\` (evidence-limit): Grade C; one suitable review; future-need and pricing praise are not extra services or a lowest-price claim.
- \`repair-not-other-jobs\` (boundary): No extra repair URLs; reroof goes to replacement.
- \`repair-next\` (next-step): Call with where the water is.

Role: Writer 1 complete. Independent Architect QA has not signed this slot.

## Architect QA — Writer 2

Decision: **awaiting independent Architect QA**.

This slot is recorded after Writer 2 (Home, Contact, header, footer). Public chrome resolves the approved four routes. Home uses C Jackson / Hunter Gaston / Josh Baird and does not steal replacement or repair leads. Contact is lean. This writer did not self-approve the slot.

- Home H1 is title case and carries \`roofing company Springfield MO\`.
- Contact H1 is title case and carries \`contact Swifts Roofing Springfield\`.
- Header and footer do not expose Strategy Overview.
- No hours claim (listing vs owned-site hours disagree in the audit packet and stay off owner-facing copy).
- No second address.

## Review / evidence pointer ledger

Pointer fields only: \`reviewId\`, \`provenance.type\`, \`provenance.ref\`, \`placement\`, \`section\`. No reviewer, excerpt, quote, or other word-bearing keys.

### \`/\`

| reviewId | provenance.type | provenance.ref | placement | section |
| --- | --- | --- | --- | --- |
| \`${"Ci9DQUlRQUNvZENodHljRjlvT2tJMWVIbE9iVkV0VW05cWFuSnBVR0ZNWlhsYWVHYxAB"}\` | evidence | \`${"Ci9DQUlRQUNvZENodHljRjlvT2tJMWVIbE9iVkV0VW05cWFuSnBVR0ZNWlhsYWVHYxAB"}\` | lead-completed-roof | home-lead |
| \`${"ChdDSUhNMG9nS0VJQ0FnTUNnc3RfSmdRRRAB"}\` | evidence | \`${"ChdDSUhNMG9nS0VJQ0FnTUNnc3RfSmdRRRAB"}\` | support-crew-on-roof | home-crew |
| \`${"ChZDSUhNMG9nS0VJQ0FnSURibGMyV2JnEAE"}\` | evidence | \`${"ChZDSUhNMG9nS0VJQ0FnSURibGMyV2JnEAE"}\` | support-finished-roof | home-finished |

### \`/roof-replacement\`

| reviewId | provenance.type | provenance.ref | placement | section |
| --- | --- | --- | --- | --- |
| \`${"Ci9DQUlRQUNvZENodHljRjlvT2sxM1kybGhiVFEzTlVJeFMzZE1WSE5XZURJMFkyYxAB"}\` | evidence | \`${"Ci9DQUlRQUNvZENodHljRjlvT2sxM1kybGhiVFEzTlVJeFMzZE1WSE5XZURJMFkyYxAB"}\` | lead-first-replacement | replace-when |
| \`${"ChZDSUhNMG9nS0VJQ0FnTURJbjZTNkNnEAE"}\` | evidence | \`${"ChZDSUhNMG9nS0VJQ0FnTURJbjZTNkNnEAE"}\` | support-tearoff-shingles | replace-shingles |
| \`${"ChZDSUhNMG9nS0VJQ0FnTURvck5uOEl3EAE"}\` | evidence | \`${"ChZDSUhNMG9nS0VJQ0FnTURvck5uOEl3EAE"}\` | support-replaced-roof-cleanup | replace-cleanup |
| \`${"ChZDSUhNMG9nS0VMeW41N2ZMNU1HUUZ3EAE"}\` | evidence | \`${"ChZDSUhNMG9nS0VMeW41N2ZMNU1HUUZ3EAE"}\` | authorized-replacement-inventory | replace-named-jobs |
| \`${"ChZDSUhNMG9nS0VJQ0FnSUNHM3JleVd3EAE"}\` | evidence | \`${"ChZDSUhNMG9nS0VJQ0FnSUNHM3JleVd3EAE"}\` | authorized-replacement-inventory | replace-estimate |
| \`${"ChZDSUhNMG9nS0VJQ0FnSUNIMDlEc01nEAE"}\` | evidence | \`${"ChZDSUhNMG9nS0VJQ0FnSUNIMDlEc01nEAE"}\` | authorized-replacement-inventory | replace-named-jobs |

### \`/roof-repair\`

| reviewId | provenance.type | provenance.ref | placement | section |
| --- | --- | --- | --- | --- |
| \`${"ChdDSUhNMG9nS0VJQ0FnSUNKbzR6V2tBRRAB"}\` | evidence | \`${"ChdDSUhNMG9nS0VJQ0FnSUNKbzR6V2tBRRAB"}\` | lead-leak-seal-flue-same-visit | repair-when |

### \`/contact\`

No review pointers. Contact is ineligible.

## Whole-site QA

Decision: **${wholeSite.pass ? "pass" : "fail"}**. Assessor \`writer-whole-site-swifts-gate2\`. Architect Writer 1 / Writer 2 slots remain awaiting independent Architect QA. Human status: **Needs Josh — Human Gate 2**.

Deterministic hard-fail count: ${deterministic.findings.filter((item) => item.severity === "hard-fail").length}. Whole-site hard-fail count: ${wholeSite.findings.filter((item) => item.severity === "hard-fail").length}.

`;

const rendered = collapseDuplicateQuotes(artifact.markdown.replace(/^# Website Words — Human Gate 2\n+/, ""));
writeFileSync(MD_PATH, `${contract}${rendered}\n`);
writeFileSync(STATE_MD_PATH, `${contract}${rendered}\n`);
console.log(JSON.stringify({
  markdown: MD_PATH,
  qa: QA_PATH,
  deterministicPass: deterministic.pass,
  wholeSitePass: wholeSite.pass,
  hardFails: wholeSite.findings.filter((item) => item.severity === "hard-fail").map((item) => item.code),
  wordCounts,
  pointer,
}, null, 2));
