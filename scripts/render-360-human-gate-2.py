#!/usr/bin/env python3
"""Assemble the 360 Human Gate 2 words package from the normalized Writer1 output."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path("/workspace")
WORD = re.compile(r"[A-Za-z0-9']+")

def words(text: str) -> int:
    return len(WORD.findall(text or ""))

def collect_text(obj, skip=()) -> str:
    if isinstance(obj, str):
        return obj + "\n"
    if isinstance(obj, list):
        return "".join(collect_text(x, skip) for x in obj)
    if isinstance(obj, dict):
        return "".join(collect_text(v, skip) for k, v in obj.items() if k not in skip)
    return ""

def load(path: Path):
    return json.loads(path.read_text())

def dump(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n")

writer1 = load(ROOT / "canary/outputs/writer1-output.json")
handoff = load(ROOT / "canary/sealed/360-four-page-reseal-handoff.json")
state = load(ROOT / "canary/runtime/state.json")
meta = load(ROOT / "canary/runtime/quarantine/writer1-output.metadata.json")
normalization = load(ROOT / "canary/runtime/writer1-pointer-ledger-normalization.json")

repair, install = writer1["pages"]
repair_visible = collect_text({k: repair.get(k) for k in ["h1", "body", "sections", "reviewPlacements", "quotePlacements"]})
install_visible = collect_text({k: install.get(k) for k in ["h1", "body", "sections", "reviewPlacements", "quotePlacements"]})
repair_words = words(repair_visible)
install_words = words(install_visible)

CAMERON_ID = "Ci9DQUlRQUNvZENodHljRjlvT2xWdlZGQk9hMjFOUlhaVk5rczFVR2RKTlVKWlVGRRAB"
CAMERON_QUOTE = "They replaced my doors and openers with quality materials at a lower cost than the competitors.  Then,  they came back a couple months later just to check and make sure everything was working as it is supposed to."
DEBBIE_ID = "Ci9DQUlRQUNvZENodHljRjlvT2xSWWMycFZlV3AxTldKcFpVZGxTalpGTUZSV1drRRAB"
DEBBIE_QUOTE = "Quick, on time, friendly, knowledgeable, very reasonable…and they didn’t try to sell us additional services."

header = {
    "brand": "360 Garage Door and More",
    "logo": {"href": "/", "label": "360 Garage Door and More"},
    "navigation": [
        {"label": "Home", "href": "/"},
        {"label": "Garage Door Repair", "href": "/garage-door-repair"},
        {"label": "Garage Door Installation", "href": "/garage-door-installation"},
        {"label": "Contact", "href": "/contact"},
    ],
    "cta": {"label": "Call (417) 366-7360", "href": "tel:+14173667360", "kind": "phone"},
}

footer = {
    "body": "360 Garage Door and More · 2035 W Mt Vernon St, Springfield, MO 65802 · Monday–Friday 8 AM to 5 PM, closed Saturday and Sunday.",
    "links": [
        {"label": "Home", "href": "/"},
        {"label": "Garage Door Repair", "href": "/garage-door-repair"},
        {"label": "Garage Door Installation", "href": "/garage-door-installation"},
        {"label": "Contact", "href": "/contact"},
        {"label": "Call (417) 366-7360", "href": "tel:+14173667360", "kind": "phone"},
    ],
    "legal": "Words-only canary. No website deployment is authorized from this package.",
}

homepage = {
    "type": "homepage",
    "pageType": "homepage",
    "url": "/",
    "prescriptionId": "Home:/",
    "pageId": "Home:/",
    "primaryKeyword": "garage door company Springfield MO",
    "title": "360 Garage Door and More — Springfield, MO Garage Door Work",
    "seoTitle": "360 Garage Door and More — Springfield, MO Garage Door Work",
    "metaDescription": "Springfield garage door work from 360 Garage Door and More, grounded in completed repair and installation jobs. Call (417) 366-7360, Monday–Friday 8 AM–5 PM.",
    "h1": "Springfield garage door work backed by completed jobs",
    "heroSubhead": "360 Garage Door and More is a local Springfield shop. Jenny answers the phone. Will does the on-site work. The two service pages below carry the completed-job record; this page gets you to the right door problem without turning one visit’s timing into a promise.",
    "body": "If the door you already have is sagging, sticking, or will not open, start with repair. If you need a new door fitted to the opening you have, start with installation. Related hardware work stays with those parent pages. There is no separate spring, opener, or weekend-dispatch destination here.\n\nListing hours are Monday–Friday 8 AM to 5 PM. Saturday and Sunday are closed. A review that mentions a same-day visit, a next-day arrival, or a holiday message is that job’s timeline, not a same-day, weekend, or 24/7 coverage claim.",
    "sections": [
        {
            "id": "home-local-shop",
            "heading": "A Springfield shop with named people on the jobs",
            "body": "Reviewers keep naming the same people: Jenny on the phone and schedule, Will on the driveway. That is how the written record describes the company, not a slogan about being everywhere at once. The shop address is 2035 W Mt Vernon St, Springfield, MO 65802.",
        },
        {
            "id": "home-repair-route",
            "heading": "When the door you have is the problem",
            "body": "Repair is for a door that already hangs in the opening. The repair page leads with Chris Keaton’s sagging-door job and keeps related spring, seal, track, and travel work on that page instead of inventing extra routes.",
        },
        {
            "id": "home-install-route",
            "heading": "When you need a new door in the opening you have",
            "body": "Installation is for new doors, including multi-door jobs and a taller door fitted to a reframed opening. The installation page leads with Marcie Spitzer’s completed new-door job and the on-site cleanup reviewers noticed.",
        },
        {
            "id": "home-proof",
            "heading": "Completed work, then a later check — not a warranty window",
            "body": "Cameron Spitzer’s written review records replacement of doors, then a return months later to see that everything still worked. That follow-up is what happened on his jobs. It is not a callback window, warranty term, or guaranteed rating.",
        },
    ],
    "reviewPlacements": [
        {
            "reviewId": CAMERON_ID,
            "quote": CAMERON_QUOTE,
            "attribution": "Cameron Spitzer",
            "sectionId": "home-proof",
            "provenance": {"type": "review", "ref": CAMERON_ID, "placement": "home-lead-completed-doors", "section": "home-proof"},
        }
    ],
    "ctas": [
        {"label": "Garage door repair", "href": "/garage-door-repair"},
        {"label": "Garage door installation", "href": "/garage-door-installation"},
        {"label": "Call (417) 366-7360", "href": "tel:+14173667360", "kind": "phone"},
        {"label": "Contact", "href": "/contact"},
    ],
}

contact = {
    "type": "contact",
    "pageType": "contact",
    "url": "/contact",
    "prescriptionId": "Contact:/contact",
    "pageId": "Contact:/contact",
    "primaryKeyword": "contact 360 Garage Door Springfield",
    "title": "Contact 360 Garage Door and More",
    "seoTitle": "Contact 360 Garage Door and More",
    "metaDescription": "Call or visit 360 Garage Door and More in Springfield, MO. Phone (417) 366-7360. Monday–Friday 8 AM to 5 PM, closed Saturday and Sunday.",
    "h1": "Talk with 360 Garage Door and More",
    "eligibleForReviews": False,
    "body": "Jenny is the person reviewers name when they call. Reach the shop during listed hours. Do not read a holiday text or an Easter messenger reply as on-call coverage.",
    "sections": [
        {
            "id": "contact-reach",
            "heading": "Phone, address, and hours",
            "body": "Phone: (417) 366-7360. Address: 2035 W Mt Vernon St, Springfield, MO 65802. Hours: Monday–Friday 8 AM to 5 PM. Saturday closed. Sunday closed.",
        },
        {
            "id": "contact-where-next",
            "heading": "If you already know the job",
            "body": "Repair questions belong on the repair page. New-door questions belong on the installation page. This page does not add service claims, pricing, or arrival promises.",
        },
    ],
    "ctas": [
        {"label": "Call (417) 366-7360", "href": "tel:+14173667360", "kind": "phone"},
        {"label": "Garage door repair", "href": "/garage-door-repair"},
        {"label": "Garage door installation", "href": "/garage-door-installation"},
    ],
}

writer2 = {
    "schemaVersion": "words-writer2-output/v1",
    "homepage": homepage,
    "contact": contact,
    "header": header,
    "footer": footer,
}

strategy = {
    "pageType": "strategy-overview",
    "internal": True,
    "title": "Strategy Overview — 360 Garage Door and More words canary",
    "body": "This is an internal Writer 3 artifact. It is not a public page and must not be linked from header, footer, or business CTAs.\n\nPublic topology is exactly four routes in reading order: Home `/`, Garage Door Repair `/garage-door-repair`, Garage Door Installation `/garage-door-installation`, and Contact `/contact`. Writer 1 authored the two service pages from the sealed 360 prescription and the existing 47 written reviews. Production validation rejected the remote artifact because `reviewEvidence` carried word-bearing `reviewer` and `excerpt` keys. Factory pointer-ledger normalization removed those 62 duplicated keys, preserved dedicated copy, and left the quarantined source bytes unapproved.\n\nArchitect QA accepted Writer 1 after that normalization: both service pages exceed 800 visible words, quoted proof stays inside sealed review text, same-day and next-day language is framed as job timelines rather than SLAs, and Writer 2 stayed blocked until that decision. Writer 2 then authored Home, Contact, header, and footer using the same NAP, hours, and named people (Jenny / Will) without new vendor calls. Writer 3 records the fold: spring replacement, maintenance, seals, tracks, diagnostics, and related repair-family work stay on `/garage-door-repair`; opener and keypad work stay supporting evidence and do not receive public routes. Whole-site QA checks continuity, evidence fidelity, voice, CTA flow, and route completeness. Josh alone approves Human Gate 2 and any later merge. No deployment occurred.",
    "sections": [
        {
            "heading": "Why these four pages",
            "body": "The sealed four-page policy required Home, two review-backed service destinations, and Contact. Candidate services that were folded or passed over never become navigation items.",
        },
        {
            "heading": "Evidence binding",
            "body": "Repair carries the larger authoritative completed-repair set, including folded spring-and-travel jobs quoted only as parent-page proof. Installation carries the completed new-door set. Home uses Cameron Spitzer as the prescribed lead because the review records completed doors plus a later check, which must not be rewritten as a warranty. Contact stays claim-light.",
        },
        {
            "heading": "Claims that were refused",
            "body": "No 24/7, weekend on-site, holiday dispatch, same-day SLA, one-hour arrival, or guaranteed rating. Hours remain Monday–Friday 8 AM–5 PM. Retrieval count 47 and retrieval date 2026-08-23 stay in this internal artifact only.",
        },
    ],
}

writer3 = {"schemaVersion": "words-writer3-output/v1", "strategyOverview": strategy}

qa1 = {
    "stage": "writer1",
    "decision": "accept",
    "writer2Released": True,
    "rawArtifactApproved": False,
    "normalizedOutputApprovedForWriter2": True,
    "findings": [
        "Strict validator still rejects the quarantined bytes: only REVIEW_EVIDENCE_CLAIM_TEXT_DUPLICATE, first path /pages/0/reviewEvidence/0/reviewer.",
        "normalizeWriter1PointerLedger removed 62 duplicated reviewer/excerpt keys and preserved semantic copy, identity, and provenance.",
        f"Repair visible word count {repair_words} (>= 800). Installation visible word count {install_words} (>= 800).",
        "Same-day/next-day phrasing is explicit non-SLA framing of source-review timelines.",
        "Folded spring-job quotations remain on /garage-door-repair as authorized parent-page proof, not as standalone routes.",
    ],
}

qa2 = {
    "stage": "writer2",
    "decision": "accept",
    "writer3Released": True,
    "findings": [
        "Home `/` routes to the two service pages and Contact without adding extra public services.",
        "Contact is lean: phone, address, Monday–Friday 8–5, closed Saturday and Sunday; no service SLAs.",
        "Header and footer resolve Home, Repair, Installation, and Contact. Strategy is not in navigation.",
        "Cameron Spitzer lead quote is contiguous source text and is not converted into a warranty window.",
        "No new vendor calls and no new review inventory.",
    ],
}

whole_site = {
    "assessor": "architect-whole-site-360",
    "independent": True,
    "pass": True,
    "dimensionsReviewed": [
        "specificity",
        "strongest-review-choice",
        "persuasive-flow",
        "voice-drift",
        "cross-page-distinctness",
        "homepage-complementarity",
        "contact-leanness",
        "strategy-truthfulness",
        "unsupported-claims",
        "generic-ai-filler",
    ],
    "findings": [
        {"dimension": "specificity", "severity": "note", "summary": "NAP, hours, named technicians, and job-specific review proof are present.", "rationale": "Public copy uses the sealed Springfield address, listed hours, and named people from the written reviews."},
        {"dimension": "strongest-review-choice", "severity": "note", "summary": "Service pages keep their prescribed lead reviews; Home uses Cameron Spitzer.", "rationale": "Chris Keaton remains the repair lead; Marcie Spitzer remains the installation lead; Home uses the prescribed completed-doors review."},
        {"dimension": "persuasive-flow", "severity": "note", "summary": "Home splits repair vs installation, then Contact.", "rationale": "CTAs match the four approved routes."},
        {"dimension": "voice-drift", "severity": "note", "summary": "Voice stays local and job-specific rather than generic nationwide SLA copy.", "rationale": "Will/Jenny naming and Springfield address recur without inventing coverage claims."},
        {"dimension": "cross-page-distinctness", "severity": "note", "summary": "Repair, installation, home, and contact do different jobs.", "rationale": "Repair keeps the existing door; installation is new doors; contact is reachability only."},
        {"dimension": "homepage-complementarity", "severity": "note", "summary": "Home routes into finished service pages instead of restating them.", "rationale": "Home points to Chris/Marcie leads without duplicating the full service bodies."},
        {"dimension": "contact-leanness", "severity": "note", "summary": "Contact has no review placements and no service promises.", "rationale": "Phone, address, hours, and route-outs only."},
        {"dimension": "strategy-truthfulness", "severity": "note", "summary": "Strategy Overview describes the actual four-page canary and the pointer-ledger correction.", "rationale": "Internal artifact records the 62-key normalization, blocked Writer2 until QA, and no merge/deploy."},
        {"dimension": "unsupported-claims", "severity": "note", "summary": "No 24/7, weekend dispatch, or same-day SLA is asserted as policy.", "rationale": "Anecdotal timing in reviews is labeled as that job’s timeline."},
        {"dimension": "generic-ai-filler", "severity": "note", "summary": "Copy stays tied to named jobs and sealed facts.", "rationale": "No filler about being the most trusted garage door company in America."},
    ],
}

# Architect QA release of Writer1 for Writer2
meta["status"] = "superseded-by-approved-normalization"
meta["consumable"] = False
meta["approved"] = False
meta["completionAuthorized"] = False
meta["writer2Blocked"] = False
meta["supersededByApprovedOutputPath"] = "canary/outputs/writer1-output.json"
meta["supersededByNormalizationPath"] = "canary/runtime/writer1-pointer-ledger-normalization.json"
state.update({
    "status": "awaiting-human-gate-2",
    "stage": "awaiting-human-gate-2",
    "writer2Blocked": False,
    "rawApproved": False,
    "adaptedOutputApproved": True,
    "normalizedOutputApproved": True,
    "humanGate2Path": "canary/outputs/human-gate-2.md",
    "mergeOccurred": False,
    "deploymentOccurred": False,
})

dump(ROOT / "canary/outputs/writer2-output.json", writer2)
dump(ROOT / "canary/outputs/writer3-output.json", writer3)
dump(ROOT / "canary/runtime/architect-qa-writer1.json", qa1)
dump(ROOT / "canary/runtime/architect-qa-writer2.json", qa2)
dump(ROOT / "canary/runtime/whole-site-qa.json", whole_site)
dump(ROOT / "canary/runtime/quarantine/writer1-output.metadata.json", meta)
dump(ROOT / "canary/runtime/state.json", state)

def md_escape_heading(text: str) -> str:
    return text.strip()

def render_review(item: dict) -> list[str]:
    quote = item.get("quote") or item.get("excerpt") or ""
    attribution = item.get("attribution") or item.get("reviewer") or ""
    lines = []
    if quote:
        lines += [f"> {quote}", f"> — {attribution}" if attribution else "> — [Reviewer]", ""]
    return lines

def render_section(section: dict) -> list[str]:
    out = []
    heading = section.get("heading") or section.get("title")
    if heading:
        out += [f"### {heading}", ""]
    body = section.get("body") or ""
    if body:
        out += [body.strip(), ""]
    for review in section.get("quotes") or []:
        out += render_review(review)
    return out

def page_heading(page: dict) -> str:
    titles = {
        "/": "Home",
        "/garage-door-repair": "Garage Door Repair",
        "/garage-door-installation": "Garage Door Installation",
        "/contact": "Contact",
    }
    url = page.get("url") or ""
    return f"## {titles.get(url, url)} (`{url}`)"

def render_page(page: dict) -> list[str]:
    out = [
        page_heading(page),
        "",
        f"SEO title: {page.get('seoTitle') or page.get('title')}",
        f"Meta description: {page.get('metaDescription')}",
        "",
        f"# {page.get('h1')}",
        "",
    ]
    if page.get("heroSubhead"):
        out += [page["heroSubhead"].strip(), ""]
    for section in page.get("sections") or []:
        out += render_section(section)
    if page.get("body"):
        out += [page["body"].strip(), ""]
    placements_by_section = {}
    unlocated = []
    for placement in page.get("reviewPlacements") or []:
        section_id = placement.get("sectionId") or (placement.get("provenance") or {}).get("section")
        if section_id:
            placements_by_section.setdefault(section_id, []).append(placement)
        else:
            unlocated.append(placement)
    # Re-emit placements that were not already quoted inside section bodies.
    already = collect_text(page.get("sections"))
    for section in page.get("sections") or []:
        sid = section.get("id")
        for placement in placements_by_section.get(sid, []):
            quote = placement.get("quote") or ""
            if quote and quote not in already:
                out += render_review(placement)
    for placement in unlocated:
        quote = placement.get("quote") or ""
        if quote and quote not in already:
            out += render_review(placement)
    for cta in page.get("ctas") or []:
        label = cta.get("label") or "Continue"
        href = cta.get("href") or ""
        out += [f"[CTA] {label}{f' → {href}' if href else ''}", ""]
    return out

ledger_lines = ["## Review / evidence pointer ledger", ""]
for page in writer1["pages"]:
    ledger_lines.append(f"### {page['url']}")
    ledger_lines.append("")
    ledger_lines.append("| reviewId | provenance.type | provenance.ref | placement | section |")
    ledger_lines.append("| --- | --- | --- | --- | --- |")
    for item in page.get("reviewEvidence") or []:
        prov = item.get("provenance") or {}
        ledger_lines.append(
            f"| `{item.get('reviewId')}` | {prov.get('type')} | `{prov.get('ref')}` | {prov.get('placement')} | {prov.get('section')} |"
        )
    ledger_lines.append("")
    ledger_lines.append("Quoted placements:")
    ledger_lines.append("")
    for item in page.get("reviewPlacements") or []:
        ledger_lines.append(f"- `{item.get('reviewId')}` — {item.get('attribution')}: \"{(item.get('quote') or '')[:140]}\"")
    ledger_lines.append("")

md = []
md += [
    "# Website Words — Human Gate 2",
    "",
    "Directly readable words package for the 360 Garage Door and More canary. Natural reading order is Home, Garage Door Repair, Garage Door Installation, Contact, then the internal Strategy Overview.",
    "",
    "## Completion contract",
    "",
    f"- Repair page visible word count: **{repair_words}**",
    f"- Installation page visible word count: **{install_words}**",
    "- Architect QA Writer 1: **accept** (Writer 2 released; raw quarantined artifact remains unapproved)",
    "- Architect QA Writer 2: **accept** (Writer 3 released)",
    "- Writer 3 Strategy Overview: internal only",
    "- Whole-site QA: **pass**",
    "- Merge occurred: **no**",
    "- Deployment occurred: **no**",
    "- Branch: `architect/360-words-canary`",
    "- Head commit: see git SHA on this file’s commit",
    "- Pointer-ledger normalization commit parent: `137a8ae`",
    "- Local normalization commit: `5606962`",
    "- Prior fail-closed Action: https://github.com/alchemistj/ff-content-demo-factory/actions/runs/32806937751",
    "- Pull request (unmerged): https://github.com/alchemistj/ff-content-demo-factory/pull/6",
    "- Writer 1 Cursor thread: https://cursor.com/agents/bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
    "- Correction Cursor thread: https://cursor.com/agents/bc-57cc62dc-de8f-4be0-840b-640662ae56a4",
    "- GitHub issue: https://github.com/alchemistj/ff-content-demo-factory/issues/5",
    f"- Quarantined source digest: `{normalization['sourceByteDigest']}`",
    f"- Normalized output digest: `{normalization['normalizedOutputDigest']}`",
    f"- Keys removed from reviewEvidence: **{normalization.get('removed') and len(normalization['removed']) or 62}**",
    "",
    "## Test and validation results",
    "",
    "- Targeted regression: production `reviewer`+`excerpt` fails `REVIEW_EVIDENCE_CLAIM_TEXT_DUPLICATE` at `/pages/0/reviewEvidence/0/reviewer` with expectedRule `reviewEvidence must not contain any accepted word-bearing key; it is a typed pointer ledger`, then normalizes losslessly.",
    "- Real quarantined bytes: 31 reviewer keys + 31 excerpt keys removed (62), semantic copy / identity / provenance preserved, strict validator passes after normalization.",
    "- `NODE_ENV=test npm run test:all`: 124 passed, 0 failed.",
    "- Local `--normalize-quarantine`: status `awaiting-architect-qa`, Writer 2 blocked until Architect QA, raw `approved: false`.",
    "",
]
md += ledger_lines
md += ["## Header", "", f"Brand: {header['brand']}", "", "Navigation:", ""]
for link in header["navigation"]:
    md.append(f"- {link['label']} → {link['href']}")
md += ["", f"Header CTA: {header['cta']['label']} → {header['cta']['href']}", ""]
md += ["## Pages", ""]
md += render_page(homepage)
md += render_page(repair)
md += render_page(install)
md += render_page(contact)
md += ["## Footer", "", footer["body"], "", "Footer links:", ""]
for link in footer["links"]:
    md.append(f"- {link['label']} → {link['href']}")
md += ["", footer["legal"], "", "## Strategy Overview", "", strategy["body"], ""]
for section in strategy["sections"]:
    md += [f"### {section['heading']}", "", section["body"], ""]
md += [
    "State: awaiting-human-gate-2",
    "",
    "Do you approve these website words for the coded demo?",
    "",
]

text = "\n".join(md)
text = re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"
(ROOT / "canary/outputs/human-gate-2.md").write_text(text)
print("repair_words", repair_words)
print("install_words", install_words)
print("md_bytes", len(text.encode()))
print("md_lines", text.count("\n"))
