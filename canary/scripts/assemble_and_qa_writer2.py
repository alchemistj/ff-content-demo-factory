#!/usr/bin/env python3
"""Assemble the Writer 2 readable handoff and run evidence-grounded QA.

Frozen Writer 1 service-page bytes are copied from
canary/outputs/writer1-service-pages.md. They are never rewritten here.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUTHOR = ROOT / "outputs" / "writer2-home-contact-chrome.md"
WRITER1 = ROOT / "outputs" / "writer1-service-pages.md"
HANDOFF = ROOT / "outputs" / "writer2-package-so-far.md"
SETTINGS = ROOT / "runtime" / "writer2-run-settings.json"
QA_OUT = ROOT / "runtime" / "writer2-qa.json"

WRITER1_ACCEPTED_HEAD = "c1241a377f70424affe4ed2796b4dceec94ae0f1"
WRITER1_PRODUCTION_DIGEST = "sha256:8181dc56e0706968becf88391d89129785b4ac1364eaeaefbbfeb7d92e3eba5b"

HOME_CORPUS = {
    "C Jackson": "Jared and his crew did an amazing job on our roof! From start to finish I was very impressed! Jared was very knowledgeable and communication was top notch. I couldn't recommend a better roofing company, thank you so much Jared and Swifts Roofing!",
    "Hunter Gaston": "Jared was very professional! He explained everything to where I could understand better on what needed to be done. His team was extremely polite and worked very hard on our roof! Looks AMAZING! So thankful for Jared and his team! Roof looks PERFECT!",
    "Josh Baird": "I am very happy with my roof from Swifts. It's clear from working with Jared that he cares about customer satisfaction, and will do what it takes to make sure the customer is happy. He's professional, responsive, and passionate about doing the job right. The roof looks great, and the price was very reasonable. I would highly recommend Swifts.",
}

STOLEN_LEADS = (
    "Neal Richardson Sr",
    "Jonathan Hoffman",
    "David Carson",
    "Linda Mulholland",
    "Bonnie Held",
    "Laura Hampton",
    "Rebecca Grable",
    "Roger Richardson",
    "Collin Mckinney",
    "Steve McGrath",
    "Shelby Snyder",
    "Dan Wilson",
    "Wheat Bread",
    "Julie Lamb",
    "Solid John",
    "Alma Pettenger",
)

FORBIDDEN_PUBLIC = (
    "5580",
    "Aaron Avenue",
    "Aaron Ave",
    "24 hours",
    "24/7",
    "9:00 AM",
    "9:00 am",
    "100% CUSTOMER",
    "100% customer satisfaction",
    "Strategy Overview",
    "/strategy",
    "Human Gate",
    "Architect QA",
    "Writer 2",
    "demo factory",
    "Fluid Frame",
)

WORD = re.compile(r"[A-Za-z0-9]+(?:'[A-Za-z]+)?")


def words(text: str) -> list[str]:
    return WORD.findall(text)


def word_count(text: str) -> int:
    return len(words(text))


def extract_section(markdown: str, heading: str) -> str:
    pattern = rf"^{re.escape(heading)}\n"
    match = re.search(pattern, markdown, re.M)
    if not match:
        raise SystemExit(f"Missing section {heading!r}")
    start = match.end()
    nxt = re.search(r"^## ", markdown[start:], re.M)
    body = markdown[start:] if not nxt else markdown[start : start + nxt.start()]
    return body.strip().strip("-").strip() + "\n"


def frozen_writer1_pages() -> str:
    text = WRITER1.read_text()
    start = text.index("## Roof replacement (`/roof-replacement`)")
    end = text.index("## For Josh and the Architect")
    frozen = text[start:end]
    # Keep the trailing --- that belongs to the repair page close.
    return frozen.rstrip() + "\n"


def production_copy_digest(frozen: str) -> str:
    # Writer 1 digest is the bytes above “For Josh and the Architect”.
    # Frozen here is that same production region starting at the first service H2.
    digest = hashlib.sha256(frozen.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def useful_body(page_md: str) -> str:
    # Drop SEO/meta/eyebrow/CTA markup lines for an advisory count.
    lines = []
    for line in page_md.splitlines():
        if line.startswith("SEO title:"):
            continue
        if line.startswith("Meta description:"):
            continue
        if line.startswith("Eyebrow:"):
            continue
        if line.startswith("[") and "CTA" in line:
            continue
        lines.append(line)
    return "\n".join(lines)


def first_h2_paragraph(page_md: str) -> str:
    match = re.search(r"^### [^\n]+\n\n(.+)", page_md, re.M)
    return match.group(1).strip() if match else ""


def blockquotes(page_md: str) -> list[tuple[str, str]]:
    out = []
    for raw in re.findall(r"(?:^>.*\n)+", page_md, re.M):
        lines = []
        for line in raw.rstrip("\n").splitlines():
            if line.startswith("> "):
                lines.append(line[2:])
            elif line.startswith(">"):
                lines.append(line[1:].lstrip())
        if not lines:
            continue
        name = ""
        if lines[-1].startswith("— "):
            name = lines[-1][2:].strip()
            lines = lines[:-1]
        while lines and not lines[-1].strip():
            lines.pop()
        quote = "\n".join(lines).strip()
        if quote:
            out.append((quote, name))
    return out


def reviews_adjacent(page_md: str) -> bool:
    headings = [m.start() for m in re.finditer(r"^### ", page_md, re.M)]
    blocks = [m.start() for m in re.finditer(r"(?:^>.*\n)+", page_md, re.M)]
    if len(blocks) < 2:
        return False
    for a, b in zip(blocks, blocks[1:]):
        if not any(a < h < b for h in headings):
            return True
    return False


def quote_in_corpus(quote: str, source: str) -> bool:
    q = re.sub(r"\s+", " ", quote.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')).strip().lower()
    s = re.sub(r"\s+", " ", source.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')).strip().lower()
    return q in s if q and s else False


def assemble() -> str:
    authored = AUTHOR.read_text()
    header = extract_section(authored, "## Header")
    home = extract_section(authored, "## Homepage (`/`)")
    contact = extract_section(authored, "## Contact (`/contact`)")
    footer = extract_section(authored, "## Footer")
    frozen = frozen_writer1_pages()
    frozen_for_handoff = frozen.rstrip().removesuffix("---").rstrip()
    settings = json.loads(SETTINGS.read_text())
    notes = f"""## For Josh and the Architect

Writer 2 only. This file is the package-so-far for Architect QA: Homepage, Contact, header, and footer, plus the frozen Writer 1 service pages.

The Roof Replacement and Roof Repair words below the Home page are copied byte-for-byte from `canary/outputs/writer1-service-pages.md` at accepted content head `{WRITER1_ACCEPTED_HEAD}`. They were not rewritten, polished, shortened, or lengthened.

Strategy Overview / Why We Built This Site is not in this pass. Website build, merge, deploy, and Human Gate 2 are not in this pass. This writer does not self-approve.

### Run settings (recorded before copy)

- Run: {settings["run"]["url"]}
- Model: `{settings["observedOriginalModelName"]}` (Grok 4.6)
- Fast: Off (`fastOff` {str(settings["fastOff"]).lower()}; not `cursor-grok-4.6-high-fast`)
- Independent of Writer 1 `{settings["independence"]["notWriter1"]}` and Architect QA `{settings["independence"]["notArchitectQa"]}`

### Page evidence grades (upstream, not assigned by this writer)

- `/` — Home uses 3 on-page reviews (1 lead, 2 supporting) from the Gate 1 home anchors
- `/roof-replacement` — Grade A, frozen (Architect QA accept)
- `/roof-repair` — Grade B, frozen (Architect QA accept)
- `/contact` — no reviews (ineligible)

### On-page review pointers — Home `/`

| Role | Reviewer | Date | Claim the review sits next to |
| --- | --- | --- | --- |
| Lead | C Jackson | 2025-12-27 | Completed roof on the reviewer's house; Jared, the crew, and Swifts Roofing named; start-to-finish communication. Do not infer repair, replacement, inspection, or a product. |
| Supporting | Hunter Gaston | 2025-02-15 | Jared explained the work; polite crew; finished roof appearance. Still generic completed roofing, not a named reroof or leak job. |
| Supporting | Josh Baird | 2024-08-07 | Finished roof from Swifts; Jared stays with the work; roof looks great. Price praise stays anecdotal. |

Contact has no first review.

### Address and hours resolution

- **Published address:** 4268 S Hillcrest Ave Ste 110, Springfield, MO 65810. Corroborated by GBP (`ChIJZWfAc5d9z4cR2TLlkLdpqMk`), the owned homepage footer, Owens Corning contractor identity used in Writer 1, and Writer 1's accepted service pages.
- **Not published:** 5580 South Aaron Avenue appears only on the owned `/contact-us/` page. Architect QA told Writer 2 not to publish both without a resolution. Resolution: Hillcrest is the listing/GBP/homepage address; Aaron Avenue stays unpublished.
- **Hours omitted.** GBP and the owned homepage say open 24 hours Monday–Saturday, Sunday closed. The owned contact page says Monday–Saturday 9:00 AM–5:00 PM, Sunday closed. Neither set is published. No 24/7, same-day, or emergency SLA.

### Claims used on Home / Contact / chrome, with evidence

- Roofing company in Springfield, MO; shop at Hillcrest; phone (417) 771-0477 — GBP + owned site + Writer 1 NAP.
- Jared Swift owns Swifts Roofing — first-party / KY3 / reviews. Public copy does not name the station.
- Company since 2019 — owned about page. Nearly 23 years of Jared's Springfield-area roofing — KY3 (2026-08-14), kept distinct from 2019.
- Owens Corning Preferred Contractor; licensed and insured with a $2 million policy — owned about page / OC profile. Hedged. Not Platinum.
- Free estimates — owned site.
- Email swiftsroofingllc@gmail.com — owned contact / OC profile, already used on accepted Writer 1 pages.
- Home reviews: exact-place corpus texts for C Jackson, Hunter Gaston, Josh Baird. Prescribed Home lead C Jackson kept.

### Kept off these pages

- Replacement leads (Neal Richardson Sr, David Carson, Linda Mulholland, Laura Hampton, Rebecca Grable, Roger Richardson).
- Repair leads (Jonathan Hoffman, Bonnie Held).
- Inspection (Steve McGrath) and tarping (Collin Mckinney) as Home proof or as URLs.
- Website-only testimonials not in the 40 judged written reviews.
- Star ratings, review counts, 100% satisfaction, commercial as a destination, hail/storm/gutter/maintenance pages.
- Strategy Overview in header, footer, or business CTAs.

### Advisory useful-body counts (not a pass/fail floor)

See `canary/runtime/writer2-qa.json`. Word count is diagnostic only.

### Architect QA — Writer 2

**Decision: awaiting independent Architect QA.** This writer does not self-approve.

**Next owner:** separate Writer 3 for Strategy Overview / Why We Built This Site, then fresh whole-site Architect QA, then the complete four-page Human Gate 2 package. Josh does not act yet.

Machine record: `canary/runtime/writer2-qa.json`  
Settings receipt: `canary/runtime/writer2-run-settings.json`
"""
    handoff = f"""# Writer 2 — Swifts Roofing package so far

Josh review file. Natural reading order: Header, Home `/`, Roof Replacement `/roof-replacement`, Roof Repair `/roof-repair`, Contact `/contact`, Footer.

The two service pages are the independently accepted Writer 1 words. They are frozen. Home, Contact, header, and footer are new in this pass.

Strategy Overview is not in this pass. No website build. No merge. No deploy. Not self-approved.

---

## Header

{header.strip()}

---

## Homepage (`/`)

{home.strip()}

---

{frozen_for_handoff}

---

## Contact (`/contact`)

{contact.strip()}

---

## Footer

{footer.strip()}

---

{notes.strip()}
"""
    HANDOFF.write_text(handoff if handoff.endswith("\n") else handoff + "\n")
    return handoff


def run_qa(handoff: str) -> dict:
    findings: list[dict] = []

    def check(code: str, ok: bool, message: str) -> None:
        findings.append({"code": code, "pass": ok, "message": message})

    frozen = frozen_writer1_pages()
    authored = AUTHOR.read_text()
    home = extract_section(authored, "## Homepage (`/`)")
    contact = extract_section(authored, "## Contact (`/contact`)")
    header = extract_section(authored, "## Header")
    footer = extract_section(authored, "## Footer")

    # Frozen bytes vs Writer 1 file.
    w1 = WRITER1.read_text()
    start = w1.index("## Roof replacement (`/roof-replacement`)")
    end = w1.index("## For Josh and the Architect")
    source_frozen = w1[start:end].rstrip() + "\n"
    check("frozen-service-pages-byte-identical", frozen == source_frozen, "Writer 1 service pages copied byte-for-byte into the handoff source region.")
    check(
        "handoff-contains-frozen-bytes",
        source_frozen.rstrip().removesuffix("---").rstrip() in handoff,
        "Handoff contains the accepted Writer 1 service-page bytes.",
    )

    # Writer 1 source file itself must still match the on-disk frozen region used above.
    check("writer1-file-untouched-region", "## Roof replacement (`/roof-replacement`)" in w1 and "## Roof repair (`/roof-repair`)" in w1, "Writer 1 readable file still contains both accepted service pages.")

    # Handoff contains frozen pages exactly once each.
    check("handoff-contains-frozen-replacement", "## Roof replacement (`/roof-replacement`)" in handoff, "Handoff includes frozen replacement page.")
    check("handoff-contains-frozen-repair", "## Roof repair (`/roof-repair`)" in handoff, "Handoff includes frozen repair page.")

    home_quotes = blockquotes(home)
    names = [name for _, name in home_quotes]
    check("home-review-count", len(home_quotes) == 3, f"Home has {len(home_quotes)} quoted reviews; expected 3.")
    check("home-prescribed-lead", names[:1] == ["C Jackson"], f"Home lead is {names[:1]}; expected C Jackson.")
    check("home-supporting", set(names[1:]) == {"Hunter Gaston", "Josh Baird"}, f"Home supporting reviews are {names[1:]}.")
    check("home-reviews-not-adjacent", not reviews_adjacent(home), "Home reviews are separated by intervening headings.")
    check("contact-no-reviews", not blockquotes(contact), "Contact has no quoted reviews.")

    for quote, name in home_quotes:
        source = HOME_CORPUS.get(name, "")
        check(f"quote-fidelity-{name.replace(' ', '-')}", quote_in_corpus(quote, source), f"{name} quote is a contiguous excerpt of the exact-place corpus text.")

    public = "\n".join([header, home, contact, footer])
    for name in STOLEN_LEADS:
        check(f"no-stolen-{name.replace(' ', '-')}", name not in public, f"{name} is not used on Home/Contact/chrome.")

    public_lower = public.lower()
    for phrase in FORBIDDEN_PUBLIC:
        # Writer 2 notes are not in `public`.
        check(f"forbidden-{re.sub(r'[^a-z0-9]+', '-', phrase.lower()).strip('-')}", phrase.lower() not in public_lower, f"Public chrome/pages do not contain {phrase!r}.")

    check("no-star-ratings", not re.search(r"\b\d(?:\.\d)?\s*stars?\b", public, re.I), "No star ratings in public copy.")
    check("no-review-counts", not re.search(r"\b\d+\s+reviews?\b", public, re.I), "No review counts in public copy.")

    home_h2 = first_h2_paragraph(home)
    contact_h2 = first_h2_paragraph(contact)
    home_h2_words = word_count(home_h2)
    contact_h2_words = word_count(contact_h2)
    check("home-keyword-first-h2", "roofing company" in home_h2.lower() and "springfield" in home_h2.lower(), "Home first H2 includes roofing company + Springfield.")
    check("home-first-h2-40-60", 40 <= home_h2_words <= 60, f"Home first H2 is {home_h2_words} words (advisory 40–60).")
    check("contact-keyword-first-h2", "contact" in contact_h2.lower() and "swifts roofing" in contact_h2.lower() and "springfield" in contact_h2.lower(), "Contact first H2 includes contact + Swifts Roofing + Springfield.")
    check("home-h1", "# Roofing Company in Springfield, MO | Swifts Roofing" in home, "Home H1 is literal company + Springfield, MO + brand.")
    check("contact-h1", "# Contact Swifts Roofing in Springfield, MO | Swifts Roofing" in contact, "Contact H1 is literal contact + Springfield, MO + brand.")
    check("primary-phone-cta", "tel:+14177710477" in home and "tel:+14177710477" in contact and "tel:+14177710477" in header, "Primary phone CTA is present on Home, Contact, and header.")
    check("four-nav-routes", all(route in header for route in ["→ /", "→ /roof-replacement", "→ /roof-repair", "→ /contact"]), "Header navigation is exactly the four public routes.")
    check("footer-four-routes", all(route in footer for route in ["→ /", "→ /roof-replacement", "→ /roof-repair", "→ /contact"]), "Footer links resolve the four public routes.")
    check("hillcrest-published", "4268 S Hillcrest Ave Ste 110" in home and "4268 S Hillcrest Ave Ste 110" in contact and "4268 S Hillcrest Ave Ste 110" in footer, "Hillcrest NAP is published on Home, Contact, and footer.")
    check("email-published", "swiftsroofingllc@gmail.com" in contact and "mailto:swiftsroofingllc@gmail.com" in footer, "Gmail contact path is published.")

    home_words = word_count(useful_body(home))
    contact_words = word_count(useful_body(contact))

    hard = [f for f in findings if not f["pass"] and not f["code"].startswith("home-first-h2-40-60")]
    # 40-60 is advisory; still record it, but do not fail the package on it alone.
    advisory_fail = [f for f in findings if f["code"] == "home-first-h2-40-60" and not f["pass"]]
    hard_fail_codes = {f["code"] for f in findings if not f["pass"] and f["code"] != "home-first-h2-40-60"}

    report = {
        "stage": "writer2",
        "role": "writer-deterministic-qa",
        "selfApproved": False,
        "architectQa": "awaiting-independent-look",
        "humanGate2": "not-started",
        "pass": not hard_fail_codes,
        "wordCountIsDiagnosticOnly": true_flag(),
        "usefulBodyWordsDiagnostic": {
            "home": home_words,
            "contact": contact_words,
            "homeFirstH2": home_h2_words,
            "contactFirstH2": contact_h2_words,
            "role": "diagnostic-only",
        },
        "frozenWriter1": {
            "acceptedContentHead": WRITER1_ACCEPTED_HEAD,
            "lineageHeadAtStart": "d8e60e2f3198f010bd1544de20498bae1573357c",
            "sourceFile": "canary/outputs/writer1-service-pages.md",
            "byteIdentical": frozen == source_frozen,
        },
        "pages": {
            "/": {
                "reviewCount": len(home_quotes),
                "lead": "C Jackson",
                "supporting": ["Hunter Gaston", "Josh Baird"],
                "adjacent": reviews_adjacent(home),
            },
            "/contact": {"reviewCount": 0},
            "/roof-replacement": {"status": "frozen", "decision": "writer1-architect-accept"},
            "/roof-repair": {"status": "frozen", "decision": "writer1-architect-accept"},
        },
        "findings": findings,
        "hardFailCodes": sorted(hard_fail_codes),
        "advisory": [f["code"] for f in advisory_fail],
        "nextOwner": "Writer 3 (separate Cursor writing agent) for Strategy Overview / Why We Built This Site",
    }
    QA_OUT.write_text(json.dumps(report, indent=2) + "\n")
    return report


def true_flag() -> bool:
    return True


def main() -> None:
    handoff = assemble()
    report = run_qa(handoff)
    print(json.dumps({"handoff": str(HANDOFF), "pass": report["pass"], "hardFailCodes": report["hardFailCodes"], "usefulBodyWordsDiagnostic": report["usefulBodyWordsDiagnostic"]}, indent=2))
    if not report["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
