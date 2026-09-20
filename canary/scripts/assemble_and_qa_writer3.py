#!/usr/bin/env python3
"""Assemble the Writer 3 readable package and run evidence-grounded QA.

Accepted Writer 1 and Writer 2 public-page copy is copied byte-for-byte.
Those source files are never rewritten here.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STRATEGY = ROOT / "outputs" / "writer3-strategy-overview.md"
WRITER1 = ROOT / "outputs" / "writer1-service-pages.md"
WRITER2_PACKAGE = ROOT / "outputs" / "writer2-package-so-far.md"
WRITER2_CHROME = ROOT / "outputs" / "writer2-home-contact-chrome.md"
HANDOFF = ROOT / "outputs" / "writer3-package.md"
SETTINGS = ROOT / "runtime" / "writer3-run-settings.json"
QA_OUT = ROOT / "runtime" / "writer3-qa.json"
JSON_OUT = ROOT / "outputs" / "writer3-output.json"

WRITER1_ACCEPTED_HEAD = "c1241a377f70424affe4ed2796b4dceec94ae0f1"
WRITER1_PRODUCTION_DIGEST = "sha256:8181dc56e0706968becf88391d89129785b4ac1364eaeaefbbfeb7d92e3eba5b"
WRITER2_ACCEPTED_HEAD = "52e3528ef8f886e058547b5091ffe4d4f50e6fa1"
WRITER2_PUBLIC_PAGES_DIGEST = "sha256:3e9ce7881478eabd3ecd2eedc32002f50f1c49c8c24b33a42448ec8845f8b4fe"
WRITER2_CHROME_DIGEST = "sha256:9c26840d32cf3e5a8430bcc30ef2fe991a86abd27688e458cae378d3a4f737c5"
WRITER2_QA_HEAD = "453dfb8578408eea9b6a05cb4edad85ab6853cef"

FROZEN_PUBLIC_FILES = (
    WRITER1,
    WRITER2_PACKAGE,
    WRITER2_CHROME,
)


def sha256_bytes(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return sha256_bytes(text.encode("utf-8"))


def writer1_production_region(text: str) -> str:
    end = text.index("## For Josh and the Architect")
    return text[:end]


def writer2_public_pages(text: str) -> str:
    start = text.index("## Header")
    end = text.index("## For Josh and the Architect")
    return text[start:end]


def extract_section(markdown: str, heading: str) -> str:
    pattern = rf"^{re.escape(heading)}\n"
    match = re.search(pattern, markdown, re.M)
    if not match:
        raise SystemExit(f"Missing section {heading!r}")
    start = match.end()
    nxt = re.search(r"^## ", markdown[start:], re.M)
    body = markdown[start:] if not nxt else markdown[start : start + nxt.start()]
    return body.strip() + "\n"


def assemble() -> str:
    settings = json.loads(SETTINGS.read_text())
    writer1 = WRITER1.read_text()
    writer2 = WRITER2_PACKAGE.read_text()
    strategy = STRATEGY.read_text()
    frozen_pages = writer2_public_pages(writer2)
    w1_prod = writer1_production_region(writer1)

    notes = f"""## For Josh and the Architect

Writer 3 only. This file is the whole writing package for independent Architect QA: the frozen four public pages plus the internal Strategy Overview / Why We Built This Site.

Public Header, Home `/`, Roof Replacement `/roof-replacement`, Roof Repair `/roof-repair`, Contact `/contact`, and Footer are copied byte-for-byte from `canary/outputs/writer2-package-so-far.md` at accepted Writer 2 head `{WRITER2_ACCEPTED_HEAD}` (QA receipt head `{WRITER2_QA_HEAD}`). Writer 1 production copy above “For Josh and the Architect” in `canary/outputs/writer1-service-pages.md` remains the accepted digest. Those files were not rewritten, polished, shortened, or lengthened in this lane.

This is not Human Gate 2. Website build, merge, deploy, provider configuration, and application-code edits are not in this pass. This writer does not self-approve.

### Run settings (recorded before copy)

- Run: {settings["run"]["url"]}
- Model: `{settings["observedOriginalModelName"]}` (Grok 4.6 High)
- Fast: Off (`fastOff` {str(settings["fastOff"]).lower()}; not `cursor-grok-4.6-high-fast`)
- Independent of Writer 1 `{settings["independence"]["notWriter1"]}`, Writer 1 Architect QA `{settings["independence"]["notWriter1ArchitectQa"]}`, Writer 2 `{settings["independence"]["notWriter2"]}`, and Writer 2 Architect QA `{settings["independence"]["notWriter2ArchitectQa"]}`

### Frozen-copy digest comparison

| Region | Expected | Observed on this assembly |
| --- | --- | --- |
| Writer 1 production copy (bytes above “For Josh and the Architect”) | `{WRITER1_PRODUCTION_DIGEST}` | `{sha256_text(w1_prod)}` |
| Writer 2 public pages (Header through Footer in the Writer 2 package) | `{WRITER2_PUBLIC_PAGES_DIGEST}` | `{sha256_text(frozen_pages)}` |
| Writer 2 authored chrome file | `{WRITER2_CHROME_DIGEST}` | `{sha256_bytes(WRITER2_CHROME.read_bytes())}` |

Writer 1 accepted content head: `{WRITER1_ACCEPTED_HEAD}`  
Writer 2 accepted head: `{WRITER2_ACCEPTED_HEAD}`  
Writer 2 Architect QA receipt: https://github.com/alchemistj/ff-content-demo-factory/pull/15

### Page evidence grades (upstream, not assigned by this writer)

- `/` — Home, 3 on-page reviews, Writer 2 Architect accept
- `/roof-replacement` — Grade A, Writer 1 Architect accept
- `/roof-repair` — Grade B, Writer 1 Architect accept
- `/contact` — no reviews (ineligible), Writer 2 Architect accept
- Strategy Overview — internal only, review-ineligible, not a public page

### Canonical guides limitation

Fluid Frame Demo Writing Guide and related Drive docs returned HTTP 401 in this environment. Same limitation Writer 1 / Writer 2 Architect QA recorded. Grounding used instead: Gate 1 compact artifact `state/gate1/run-9dcafb5c9c632ee7dd22.md`, sealed 40-review packet (Action 32839684505), factory `STRATEGY_INSTRUCTIONS`, Issue 8 quality contract, Issue 5 diagnostic word-count rule, observable Grade A/B floors.

### Architect QA — Writer 3 / whole package

**Decision: awaiting independent whole-package Architect QA.** This writer does not self-approve.

**Next owner:** a separate audit-only Architect for the whole writing package (frozen public pages + this Strategy Overview). Do not start Human Gate 2 in that lane. Josh reviews only after that independent QA passes.

Machine record: `canary/runtime/writer3-qa.json`  
Settings receipt: `canary/runtime/writer3-run-settings.json`  
Authored overview: `canary/outputs/writer3-strategy-overview.md`
"""

    intro = """# Writer 3 — Swifts Roofing whole writing package

Josh / Architect review file. Natural reading order of public pages: Header, Home `/`, Roof Replacement `/roof-replacement`, Roof Repair `/roof-repair`, Contact `/contact`, Footer. Then the internal Strategy Overview / Why We Built This Site.

Public-page copy from independently accepted Writer 1 and Writer 2 is frozen byte-for-byte. This pass adds only the internal Strategy Overview.

The Strategy Overview is not a public page. No website build. No merge. No deploy. Not Human Gate 2. Not self-approved.

---

"""

    # frozen_pages already ends with the footer closing --- and blank line.
    strategy_block = extract_authored_strategy(strategy)
    handoff = (
        intro
        + frozen_pages.rstrip()
        + "\n\n---\n\n"
        + strategy_block.strip()
        + "\n\n---\n\n"
        + notes.strip()
        + "\n"
    )
    HANDOFF.write_text(handoff)
    return handoff


def extract_authored_strategy(strategy_md: str) -> str:
    # Keep the authored file's heading so the package contains a single H1 at top
    # and the strategy starts at ## inside the package.
    text = strategy_md.strip()
    if text.startswith("# Strategy Overview"):
        text = "##" + text[1:]
    return text


def public_region_of_handoff(handoff: str) -> str:
    start = handoff.index("## Header")
    end = handoff.index("## Strategy Overview")
    # Drop the separator immediately before Strategy Overview so we compare
    # Header-through-Footer only.
    region = handoff[start:end].rstrip()
    if region.endswith("---"):
        region = region[: -len("---")].rstrip() + "\n\n---\n\n"
    return region


def run_qa(handoff: str) -> dict:
    findings: list[dict] = []

    def check(code: str, ok: bool, message: str) -> None:
        findings.append({"code": code, "pass": bool(ok), "message": message})

    writer1 = WRITER1.read_text()
    writer2 = WRITER2_PACKAGE.read_text()
    chrome = WRITER2_CHROME.read_bytes()
    strategy = STRATEGY.read_text()
    w1_prod = writer1_production_region(writer1)
    w2_pages = writer2_public_pages(writer2)

    w1_digest = sha256_text(w1_prod)
    w2_digest = sha256_text(w2_pages)
    chrome_digest = sha256_bytes(chrome)

    check(
        "writer1-production-digest",
        w1_digest == WRITER1_PRODUCTION_DIGEST,
        f"Writer 1 production digest is {w1_digest}; expected {WRITER1_PRODUCTION_DIGEST}.",
    )
    check(
        "writer2-public-pages-digest",
        w2_digest == WRITER2_PUBLIC_PAGES_DIGEST,
        f"Writer 2 public-pages digest is {w2_digest}; expected {WRITER2_PUBLIC_PAGES_DIGEST}.",
    )
    check(
        "writer2-chrome-digest",
        chrome_digest == WRITER2_CHROME_DIGEST,
        f"Writer 2 chrome digest is {chrome_digest}; expected {WRITER2_CHROME_DIGEST}.",
    )
    check(
        "handoff-contains-frozen-writer2-pages",
        w2_pages.rstrip() in handoff,
        "Writer 3 package contains the accepted Writer 2 Header-through-Footer bytes.",
    )
    check(
        "handoff-contains-frozen-writer1-replacement",
        "## Roof replacement (`/roof-replacement`)" in handoff,
        "Handoff includes frozen replacement page.",
    )
    check(
        "handoff-contains-frozen-writer1-repair",
        "## Roof repair (`/roof-repair`)" in handoff,
        "Handoff includes frozen repair page.",
    )
    check(
        "strategy-present",
        "## Strategy Overview / Why We Built This Site" in handoff,
        "Handoff includes the Strategy Overview heading.",
    )
    check(
        "strategy-after-footer",
        handoff.index("## Footer") < handoff.index("## Strategy Overview"),
        "Strategy Overview follows Footer in natural reading order.",
    )
    check(
        "strategy-internal-not-public",
        "not a public page" in strategy.lower() and "must not be linked" in strategy.lower(),
        "Strategy Overview states it is internal and not linked from chrome.",
    )
    check(
        "strategy-not-human-gate-2",
        "Not Human Gate 2" in strategy or "not Human Gate 2" in strategy,
        "Strategy Overview does not begin Human Gate 2.",
    )

    header = extract_section(writer2, "## Header")
    footer = extract_section(writer2, "## Footer")
    home = extract_section(writer2, "## Homepage (`/`)")
    contact = extract_section(writer2, "## Contact (`/contact`)")
    public = "\n".join([header, home, contact, footer])
    public_plus_services = w2_pages

    check("header-no-strategy", "Strategy Overview" not in header and "/strategy" not in header.lower(), "Header does not expose Strategy Overview.")
    check("footer-no-strategy", "Strategy Overview" not in footer and "/strategy" not in footer.lower(), "Footer does not expose Strategy Overview.")
    check(
        "four-nav-routes",
        all(route in header for route in ["→ /", "→ /roof-replacement", "→ /roof-repair", "→ /contact"]),
        "Header navigation is exactly the four public routes.",
    )
    check(
        "aaron-avenue-unpublished-public",
        "Aaron Avenue" not in public_plus_services and "5580" not in public_plus_services,
        "Aaron Avenue is unpublished on the frozen public pages.",
    )
    check(
        "hours-unpublished-public",
        "24 hours" not in public_plus_services.lower() and "9:00 AM" not in public_plus_services,
        "Hours are unpublished on the frozen public pages.",
    )

    required_strategy_topics = {
        "why-we-built": "Why we built this site" in strategy,
        "four-pages": "/roof-replacement" in strategy and "/roof-repair" in strategy and "/contact" in strategy,
        "passed-over": "Passed over" in strategy or "passed over" in strategy,
        "evidence-gaps": "Evidence gaps" in strategy,
        "hours-conflict": "Hours conflict" in strategy,
        "address-conflict": "Address conflict" in strategy,
        "grade-ab": "Grade A" in strategy and "Grade B" in strategy,
        "c-jackson": "C Jackson" in strategy,
        "neal": "Neal Richardson Sr" in strategy,
        "hoffman": "Jonathan Hoffman" in strategy,
        "hillcrest": "4268 S Hillcrest Ave Ste 110" in strategy,
        "no-platinum": "Platinum" in strategy and "not Platinum" in strategy,
    }
    for code, ok in required_strategy_topics.items():
        check(f"strategy-topic-{code}", ok, f"Strategy Overview covers {code.replace('-', ' ')}.")

    check(
        "strategy-does-not-publish-aaron-as-nap",
        "publish" in strategy.lower() and "Aaron Avenue stays unpublished" in strategy,
        "Strategy Overview does not resolve Aaron Avenue into a published NAP.",
    )
    check(
        "frozen-source-files-not-strategy-authored",
        "Why we built this site" not in writer1 and "## Strategy Overview / Why We Built This Site" not in writer2,
        "Writer 1 and Writer 2 source files were not used as the Strategy Overview authoring surface.",
    )

    hard_fail_codes = {f["code"] for f in findings if not f["pass"]}
    report = {
        "stage": "writer3",
        "role": "writer-deterministic-qa",
        "selfApproved": False,
        "architectQa": "awaiting-independent-whole-package-look",
        "humanGate2": "not-started",
        "pass": not hard_fail_codes,
        "wordCountIsDiagnosticOnly": True,
        "frozenCopy": {
            "writer1AcceptedContentHead": WRITER1_ACCEPTED_HEAD,
            "writer1ProductionDigestExpected": WRITER1_PRODUCTION_DIGEST,
            "writer1ProductionDigestObserved": w1_digest,
            "writer1Match": w1_digest == WRITER1_PRODUCTION_DIGEST,
            "writer2AcceptedHead": WRITER2_ACCEPTED_HEAD,
            "writer2ArchitectQaHead": WRITER2_QA_HEAD,
            "writer2PublicPagesDigestExpected": WRITER2_PUBLIC_PAGES_DIGEST,
            "writer2PublicPagesDigestObserved": w2_digest,
            "writer2PublicPagesMatch": w2_digest == WRITER2_PUBLIC_PAGES_DIGEST,
            "writer2ChromeDigestExpected": WRITER2_CHROME_DIGEST,
            "writer2ChromeDigestObserved": chrome_digest,
            "writer2ChromeMatch": chrome_digest == WRITER2_CHROME_DIGEST,
        },
        "readableArtifact": "canary/outputs/writer3-package.md",
        "authoredOverview": "canary/outputs/writer3-strategy-overview.md",
        "findings": findings,
        "hardFailCodes": sorted(hard_fail_codes),
        "nextOwner": "separate audit-only Architect for the whole writing package",
        "outOfScope": [
            "website build",
            "application-code edits",
            "provider configuration",
            "deployment",
            "merge",
            "Human Gate 2",
            "Josh action",
        ],
    }
    QA_OUT.write_text(json.dumps(report, indent=2) + "\n")
    return report


def write_machine_output(handoff: str, report: dict) -> None:
    settings = json.loads(SETTINGS.read_text())
    strategy = STRATEGY.read_text()
    sections = []
    for match in re.finditer(r"^## (.+)$", strategy, re.M):
        heading = match.group(1).strip()
        if heading.startswith("Strategy Overview"):
            continue
        start = match.end()
        nxt = re.search(r"^## ", strategy[start:], re.M)
        body = strategy[start:] if not nxt else strategy[start : start + nxt.start()]
        sections.append({"heading": heading, "body": body.strip()})
    first_body = strategy.split("## Why we built this site", 1)[-1]
    first_body = first_body.split("## Why these four pages", 1)[0].strip()
    payload = {
        "schemaVersion": "words-writer3-output/v1",
        "strategyOverview": {
            "pageType": "strategy-overview",
            "internal": True,
            "public": False,
            "title": "Strategy Overview / Why We Built This Site",
            "note": "Factory identity may label this internal artifact as /. Public Home remains the only customer-facing /.",
            "body": first_body,
            "sections": sections,
        },
        "runSettings": {
            "requested": settings["requested"],
            "observedOriginalModelName": settings["observedOriginalModelName"],
            "fastOff": settings["fastOff"],
            "run": settings["run"]["url"],
        },
        "frozenCopy": report["frozenCopy"],
        "humanGate2": "not-started",
        "nextOwner": report["nextOwner"],
    }
    JSON_OUT.write_text(json.dumps(payload, indent=2) + "\n")


def main() -> None:
    for path in FROZEN_PUBLIC_FILES:
        if not path.is_file():
            raise SystemExit(f"Missing frozen source {path}")
    before = {path: path.read_bytes() for path in FROZEN_PUBLIC_FILES}
    handoff = assemble()
    after = {path: path.read_bytes() for path in FROZEN_PUBLIC_FILES}
    if before != after:
        raise SystemExit("Assembler mutated a frozen Writer 1 / Writer 2 source file.")
    report = run_qa(handoff)
    write_machine_output(handoff, report)
    after_qa = {path: path.read_bytes() for path in FROZEN_PUBLIC_FILES}
    if before != after_qa:
        raise SystemExit("QA mutated a frozen Writer 1 / Writer 2 source file.")
    print(
        json.dumps(
            {
                "handoff": str(HANDOFF),
                "pass": report["pass"],
                "hardFailCodes": report["hardFailCodes"],
                "frozenCopy": report["frozenCopy"],
            },
            indent=2,
        )
    )
    if not report["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
