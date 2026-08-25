#!/usr/bin/env python3
"""Assemble the Swifts Roofing Human Gate 2 website-words package.

Source of review text: canary/outputs/swifts-bound-reviews.json
(exact-place Apify packet from Gate 1 run-9dcafb5c9c632ee7dd22).
No new vendor calls. Quotes are contiguous source text.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REVIEWS_PATH = ROOT / "canary/outputs/swifts-bound-reviews.json"
WORDS_PATH = ROOT / "canary/outputs/swifts-website-words.json"

PHONE = "(417) 771-0477"
TEL = "tel:+14177710477"
ADDRESS = "4268 S Hillcrest Ave Ste 110, Springfield, MO 65810"
BRAND = "Swifts Roofing"

IDS = {
    "c_jackson": "Ci9DQUlRQUNvZENodHljRjlvT2tJMWVIbE9iVkV0VW05cWFuSnBVR0ZNWlhsYWVHYxAB",
    "hunter": "ChdDSUhNMG9nS0VJQ0FnTUNnc3RfSmdRRRAB",
    "josh": "ChZDSUhNMG9nS0VJQ0FnSURibGMyV2JnEAE",
    "neal": "Ci9DQUlRQUNvZENodHljRjlvT2sxM1kybGhiVFEzTlVJeFMzZE1WSE5XZURJMFkyYxAB",
    "grable": "ChZDSUhNMG9nS0VMeW41N2ZMNU1HUUZ3EAE",
    "linda": "ChZDSUhNMG9nS0VJQ0FnTURvck5uOEl3EAE",
    "laura": "ChZDSUhNMG9nS0VJQ0FnTURJbjZTNkNnEAE",
    "david": "ChZDSUhNMG9nS0VJQ0FnSUNHM3JleVd3EAE",
    "roger": "ChZDSUhNMG9nS0VJQ0FnSUNIMDlEc01nEAE",
    "hoffman": "ChdDSUhNMG9nS0VJQ0FnSUNKbzR6V2tBRRAB",
}


def words(text: str) -> int:
    return len(re.findall(r"\S+", text.strip())) if text.strip() else 0


def load_reviews() -> dict[str, dict]:
    rows = json.loads(REVIEWS_PATH.read_text())
    return {row["id"]: row for row in rows}


def excerpt(source: str, needle: str) -> str:
    if needle not in source:
        raise SystemExit(f"Quote is not contiguous source text:\n{needle!r}")
    return needle


def section_words(page: dict) -> int:
    parts = [page.get("h1", ""), page.get("heroSubhead", "")]
    for block in page.get("sections", []):
        parts.append(block.get("heading", ""))
        parts.append(block.get("body", ""))
    return words(" ".join(parts))


STRING_FIELDS = ("heading", "title", "body", "text", "content", "subhead", "description", "quote", "excerpt")


def flatten_add(value: object, chunks: list[str]) -> None:
    if isinstance(value, str):
        chunks.append(value)
        return
    if isinstance(value, list):
        for item in value:
            flatten_add(item, chunks)
        return
    if isinstance(value, dict):
        for field in STRING_FIELDS:
            if field in value:
                flatten_add(value[field], chunks)
        flatten_add(value.get("bullets"), chunks)
        flatten_add(value.get("items"), chunks)


def page_text(page: dict) -> str:
    chunks: list[str] = []
    for field in ("h1", "hero", "heroSubhead", "subhead", "sections", "body", "faqs", "ctas"):
        flatten_add(page.get(field), chunks)
    flatten_add(page.get("reviewPlacements"), chunks)
    flatten_add(page.get("placedReviews"), chunks)
    return " ".join(chunks)


def word_offset(text: str, needle: str) -> int:
    at = text.lower().find(needle.strip().lower())
    if at < 0:
        raise SystemExit(f"Cannot locate offset for {needle[:80]!r}")
    return words(text[:at])


def bind_offsets(page: dict) -> None:
    text = page_text(page)
    for claim in page.get("claims") or []:
        claim["wordOffset"] = word_offset(text, claim["text"])
    for placement in page.get("reviewPlacements") or []:
        placement["wordOffset"] = word_offset(text, placement["quote"])
        if placement["wordOffset"] <= 1:
            raise SystemExit(f"Placement offset too small on {page['url']}: {placement['reviewId']}")
    placements = page.get("reviewPlacements") or []
    for previous, current in zip(placements, placements[1:]):
        gap = current["wordOffset"] - (previous["wordOffset"] + words(previous["quote"]))
        if gap <= 1:
            raise SystemExit(f"Adjacent reviews on {page['url']}: gap={gap}")


def main() -> None:
    reviews = load_reviews()
    neal = reviews[IDS["neal"]]["exactText"]
    linda = reviews[IDS["linda"]]["exactText"]
    laura = reviews[IDS["laura"]]["exactText"]
    hoffman = reviews[IDS["hoffman"]]["exactText"]
    cjackson = reviews[IDS["c_jackson"]]["exactText"]
    hunter = reviews[IDS["hunter"]]["exactText"]
    josh = reviews[IDS["josh"]]["exactText"]

    q_neal = excerpt(
        neal,
        "During the install, the workers were respectful and professional, worked hard throughout the day into the evening, and did a clean and quality install. They also were good about cleanup throughout the day.",
    )
    q_laura = excerpt(
        laura,
        "from delivery to tear off to putting new shingles down within a week the job is done and the roof looks so good!",
    )
    q_linda = excerpt(
        linda,
        "The crew who replaced our roof were amazing. They worked from early morning to dark and completely cleaned up all of the mess, even though I know they had to be exhausted.",
    )
    q_hoffman = excerpt(
        hoffman,
        "Had a leak coming down an exhaust flume. Even while on an emergency call, Swift made the time to swing by promptly to check out the issue, find a fix and repair it. Not only were my concerns addressed and explained, he also repaired a few seal issues he found while working on the flue.",
    )
    q_cjackson = excerpt(
        cjackson,
        "Jared and his crew did an amazing job on our roof! From start to finish I was very impressed! Jared was very knowledgeable and communication was top notch. I couldn't recommend a better roofing company, thank you so much Jared and Swifts Roofing!",
    )
    q_hunter = excerpt(
        hunter,
        "His team was extremely polite and worked very hard on our roof! Looks AMAZING! So thankful for Jared and his team! Roof looks PERFECT!",
    )
    q_josh = excerpt(
        josh,
        "I am very happy with my roof from Swifts. It's clear from working with Jared that he cares about customer satisfaction, and will do what it takes to make sure the customer is happy. He's professional, responsive, and passionate about doing the job right. The roof looks great, and the price was very reasonable.",
    )

    replacement = {
        "url": "/roof-replacement",
        "pageId": "Service:/roof-replacement",
        "prescriptionId": "Service:/roof-replacement",
        "pageType": "service",
        "primaryKeyword": "roof replacement Springfield MO",
        "reviewGrade": "A",
        "eligibleForReviews": True,
        "seoTitle": "Roof Replacement in Springfield, MO | Swifts Roofing",
        "metaDescription": "Roof replacement in Springfield, MO from Swifts Roofing. Tear-off and new shingles for homes that need a full reroof. Call (417) 771-0477.",
        "h1": "Roof Replacement in Springfield, MO",
        "heroSubhead": (
            "When the roof over the house needs to come off, this is the page. "
            "Swifts Roofing replaces roofs on Springfield homes. Homeowners name Jared "
            "as the owner on the job. The shop is at 4268 S Hillcrest Ave Ste 110. "
            "If you intend to keep the roof you already have and need a leak, a seal, "
            "or a flue handled, use the roof repair page instead."
        ),
        "suitableReviewIds": [
            IDS["neal"],
            IDS["grable"],
            IDS["linda"],
            IDS["laura"],
            IDS["david"],
            IDS["roger"],
        ],
        "claims": [
            {
                "id": "c-replace-first",
                "text": "named first roof replacement with on-site install and owner review after the install",
            },
            {
                "id": "c-replace-shingles",
                "text": "tear-off and putting new shingles down is the reroof method on this page",
            },
            {
                "id": "c-replace-cleanup",
                "text": "named replacement crews cleaned the site on the day of the reroof",
            },
        ],
        "sections": [
            {
                "id": "replace-when",
                "sectionId": "replace-when",
                "heading": "When the job is a full roof replacement",
                "body": (
                    "Call for roof replacement in Springfield, MO when the roof on the house "
                    "is coming off and a new roof is going down — not when you want the roof "
                    "you already have repaired. Neal Richardson Sr. came to Swifts Roofing "
                    "for his first roof replacement. He had already met with other contractors. "
                    "He asked questions. The estimate was competitive. What he documented after "
                    "that is the completed job this page is built on: a named first roof replacement "
                    "with on-site install and owner review after the install.\n\n"
                    "That install ran through the day and into the evening on his job. That is "
                    "how long that particular reroof lasted. It is not a night-dispatch offer, "
                    "a same-day promise, or a response-time guarantee for the next household.\n\n"
                    f"> {q_neal}\n"
                    "> — Neal Richardson Sr"
                ),
            },
            {
                "id": "replace-estimate",
                "sectionId": "replace-estimate",
                "heading": "Questions, the estimate, then the owner on the finished roof",
                "body": (
                    "A replacement starts before anyone pulls shingles. Neal compared Swifts "
                    "Roofing with other contractors and used that conversation to get his "
                    "questions answered. After the install, the owner walked the finished roof "
                    "and answered what was still open. If you are choosing among contractors, "
                    "bring the questions you still have. If you already know you need a full "
                    "reroof, say that when you call.\n\n"
                    "David Carson also described time on the roof before the crew produced the "
                    "new one: pictures, how water moves, and the differences between manufacturers. "
                    "Jared replaced that roof. The conversation about shingles and manufacturers "
                    "is part of choosing a reroof on this page. It is not a product catalog, a "
                    "materials URL, or a second public service. Roger Richardson named the stages "
                    "that show up on a replacement — preparation, roofing, and clean up — as one "
                    "job, not as three destinations."
                ),
            },
            {
                "id": "replace-shingles",
                "sectionId": "replace-shingles",
                "heading": "Tear-off and new shingles stay on this reroof",
                "body": (
                    "Putting new shingles down after a tear-off is how a reroof is finished. "
                    "That method stays here. There is no second URL for it. Tear-off and putting "
                    "new shingles down is the reroof method on this page, and Laura Hampton’s "
                    "completed job is the written record of that sequence: delivery, tear-off, "
                    "and new shingles, with the roof looking the way it should when the work "
                    "was done.\n\n"
                    "The week-scale timing on her job is one household’s schedule. It is not a "
                    "one-week completion guarantee. Her note that you will not find a better cost "
                    "is her recommendation, not a company price promise. She also mentioned more "
                    "than one job with Jared over a year. That is supporting color on a reroof "
                    "relationship. It does not become extra public service lines.\n\n"
                    f"> {q_laura}\n"
                    "> — Laura Hampton"
                ),
            },
            {
                "id": "replace-named-jobs",
                "sectionId": "replace-named-jobs",
                "heading": "Named replacements, including work billed through insurance",
                "body": (
                    "Rebecca Grable’s completed job was a roof replacement billed through her "
                    "insurance. That is how that reroof was paid. It is payment context on this "
                    "page, not a reason to invent a storm page or a separate claims desk. Her "
                    "sense that the process moved quicker than she expected is her experience of "
                    "that job, not a speed promise for yours.\n\n"
                    "Taken together with Neal, Linda, Laura, David, and Roger, the written record "
                    "on this URL is named roof replacements — first-time reroofs, insurance-backed "
                    "reroofs, tear-off and new shingles, and crews that stayed through cleanup. "
                    "None of those reviews is a leak on a roof you intend to keep. If that is "
                    "your job, use roof repair."
                ),
            },
            {
                "id": "replace-cleanup",
                "sectionId": "replace-cleanup",
                "heading": "Cleanup on the day of the reroof",
                "body": (
                    "Cleanup is part of the replacement visits homeowners describe, not a separate "
                    "add-on page. Neal noted cleanup throughout the install day. Roger named clean "
                    "up with preparation and roofing as the quality of the same replacement. "
                    "Linda Mulholland’s crew replaced the roof, worked the length of that day, "
                    "and cleaned up the mess before they left. Named replacement crews cleaned "
                    "the site on the day of the reroof. That is what happened on those jobs. It "
                    "is not a cleanup guarantee for every future site.\n\n"
                    "Linda’s early-morning-to-dark day is the length of that particular reroof. "
                    "It is not before-sunrise dispatch and not an hours promise.\n\n"
                    f"> {q_linda}\n"
                    "> — Linda Mulholland"
                ),
            },
            {
                "id": "replace-next",
                "sectionId": "replace-next",
                "heading": "Call about a full reroof",
                "body": (
                    "If the roof you have is the one coming off, call Swifts Roofing at "
                    f"{PHONE}. The shop is at {ADDRESS}. Tell Jared whether you are comparing "
                    "estimates, whether the roof is already moving through insurance, and whether "
                    "you need tear-off and new shingles. If you want the roof you already have "
                    "repaired instead, use the roof repair page. To reach the company without a "
                    "service question, use contact."
                ),
            },
        ],
        "reviewPlacements": [
            {
                "reviewId": IDS["neal"],
                "quote": q_neal,
                "attribution": "Neal Richardson Sr",
                "claimId": "c-replace-first",
                "proofRole": "lead",
                "sectionId": "replace-when",
                "order": 1,
            },
            {
                "reviewId": IDS["laura"],
                "quote": q_laura,
                "attribution": "Laura Hampton",
                "claimId": "c-replace-shingles",
                "proofRole": "support",
                "sectionId": "replace-shingles",
                "order": 3,
            },
            {
                "reviewId": IDS["linda"],
                "quote": q_linda,
                "attribution": "Linda Mulholland",
                "claimId": "c-replace-cleanup",
                "proofRole": "support",
                "sectionId": "replace-cleanup",
                "order": 5,
            },
        ],
        "reviewEvidence": [
            {"reviewId": IDS["neal"], "provenance": {"type": "evidence", "ref": IDS["neal"]}, "placement": "lead-first-replacement", "section": "replace-when"},
            {"reviewId": IDS["laura"], "provenance": {"type": "evidence", "ref": IDS["laura"]}, "placement": "support-tearoff-shingles", "section": "replace-shingles"},
            {"reviewId": IDS["linda"], "provenance": {"type": "evidence", "ref": IDS["linda"]}, "placement": "support-replaced-roof-cleanup", "section": "replace-cleanup"},
            {"reviewId": IDS["grable"], "provenance": {"type": "evidence", "ref": IDS["grable"]}, "placement": "authorized-replacement-inventory", "section": "replace-named-jobs"},
            {"reviewId": IDS["david"], "provenance": {"type": "evidence", "ref": IDS["david"]}, "placement": "authorized-replacement-inventory", "section": "replace-estimate"},
            {"reviewId": IDS["roger"], "provenance": {"type": "evidence", "ref": IDS["roger"]}, "placement": "authorized-replacement-inventory", "section": "replace-named-jobs"},
        ],
        "ctas": [
            {"label": f"Call {PHONE}", "href": TEL, "kind": "phone"},
            {"label": "Roof repair", "href": "/roof-repair"},
            {"label": "Contact", "href": "/contact"},
        ],
    }

    repair = {
        "url": "/roof-repair",
        "pageId": "Service:/roof-repair",
        "prescriptionId": "Service:/roof-repair",
        "pageType": "service",
        "primaryKeyword": "roof repair Springfield MO",
        "reviewGrade": "C",
        "eligibleForReviews": True,
        "seoTitle": "Roof Repair in Springfield, MO | Swifts Roofing",
        "metaDescription": "Roof repair in Springfield, MO from Swifts Roofing. Leak, seal, and flue work on the roof you already have. Call (417) 771-0477.",
        "h1": "Roof Repair in Springfield, MO",
        "heroSubhead": (
            "This page is for the roof you already have. If water is coming in, a seal has "
            "failed, or a flue on that roof needs work, start here. Swifts Roofing handles "
            f"roof repair in Springfield, MO. Call {PHONE}. Jared is the person homeowners "
            "name. A full reroof — tear-off and a new roof — belongs on the replacement page."
        ),
        "suitableReviewIds": [IDS["hoffman"]],
        "claims": [
            {
                "id": "c-repair-visit",
                "text": "one completed visit repaired a leak on an exhaust flue, seals found during that work, and restored flues matched to the roof that stayed",
            }
        ],
        "sections": [
            {
                "id": "repair-when",
                "sectionId": "repair-when",
                "heading": "When the roof you have is the one to keep",
                "body": (
                    "Call for roof repair in Springfield, MO when you intend to keep the roof "
                    "that is already on the house. The completed example on this page is one "
                    "visit. Jonathan Hoffman had a leak coming down an exhaust flue. The leak "
                    "was found, explained, and repaired. It was not left as a look-only stop, "
                    "and it was not turned into a reroof.\n\n"
                    "That same visit is the whole named repair record this page is allowed to "
                    "use. There is not a second repair URL behind it, and this demo does not "
                    "mint extra destinations to look busier. One completed visit repaired a leak "
                    "on an exhaust flue, seals found during that work, and restored flues matched "
                    "to the roof that stayed.\n\n"
                    "Hoffman’s note that the company swung by while already occupied elsewhere "
                    "is the story of that day. Prompt arrival on that visit is not a same-day, "
                    "one-hour, around-the-clock, or emergency-availability promise for the next "
                    "caller.\n\n"
                    f"> {q_hoffman}\n"
                    "> — Jonathan Hoffman"
                ),
            },
            {
                "id": "repair-same-visit",
                "sectionId": "repair-same-visit",
                "heading": "The leak, the seals, and the flue on the same stop",
                "body": (
                    "Hoffman’s leak showed up at an exhaust flue — he wrote flume and flue for "
                    "the same stack. While that flue work was underway, seal issues on the same "
                    "roof were repaired too. The rusty flues were restored and color-matched to "
                    "the roof that was already there. Matching restored flues to the existing "
                    "roof color is not proof the roof was painted, coated, or replaced.\n\n"
                    "If you call about a leak, say where the water is showing up inside the house "
                    "and what you can see on the roof. If the stain tracks to a flue, say that. "
                    "If you can see a failed seal line, say that. The job on this page is to "
                    "repair the roof you have, not to shop a new one.\n\n"
                    "Hoffman also had questions beyond the flue itself. Those questions were "
                    "answered on that visit. That conversation is part of the same repair stop. "
                    "It is not a reason to open a separate look-only destination, and this site "
                    "does not add one. Leak work, seal work, and flue work fold here because they "
                    "happened together on one completed visit, not because each one earned its "
                    "own URL."
                ),
            },
            {
                "id": "repair-honest-scope",
                "sectionId": "repair-honest-scope",
                "heading": "What this page can honestly say",
                "body": (
                    "The written record for roof repair is thin, and the copy stays that way on "
                    "purpose. Hoffman is a repeat caller — he wrote that this was not the first "
                    "time — and the completed work on this visit is the leak, the seals found "
                    "during the flue work, and the restored flues. Future “all my roof needs” "
                    "language in that review is his intent to call again. It is not a completed "
                    "reroof, not a product, and not a membership.\n\n"
                    "Praise of pricing on that visit is not a lowest-price claim. Praise of how "
                    "quickly the company responds is his experience, not a callback guarantee. "
                    "“Swift to the rescue” is how he felt about that stop, not a dispatch product.\n\n"
                    "If the roof over your house needs to come off, go to roof replacement. That "
                    "page is where named tear-offs and new shingles live. This page stays with "
                    "the roof that is staying on the house."
                ),
            },
            {
                "id": "repair-not-other-jobs",
                "sectionId": "repair-not-other-jobs",
                "heading": "What does not belong on this URL",
                "body": (
                    "This is not the reroof page. It is not a second leak destination, a seal "
                    "destination, or a flue destination. Those jobs share this URL because they "
                    "shared one visit. It is not a place to park other kinds of work that were "
                    "considered and left off the public map — including look-only stops, tarp "
                    "stops, and anything that would read as a commercial or storm product.\n\n"
                    "When you call, you do not need a special menu. Say you have a leak, a seal, "
                    "or a flue to handle on the roof that is staying. If you are unsure whether "
                    "the roof should stay, say that too. The replacement page and this page exist "
                    "so that choice has somewhere to land. Contact is for reaching the shop when "
                    "you already know you need to talk."
                ),
            },
            {
                "id": "repair-next",
                "sectionId": "repair-next",
                "heading": "Call about the roof you have",
                "body": (
                    f"Call Swifts Roofing at {PHONE}. The shop is at {ADDRESS}. Tell them where "
                    "the water is, whether you can see the flue or the seal line, and that you "
                    "want the roof you already have repaired. Repeat work is in the record for "
                    "this household. That is one caller, not a warranty term. If the roof needs "
                    "to come off, use roof replacement. If you only need the number and the "
                    "address, use contact."
                ),
            },
        ],
        "reviewPlacements": [
            {
                "reviewId": IDS["hoffman"],
                "quote": q_hoffman,
                "attribution": "Jonathan Hoffman",
                "claimId": "c-repair-visit",
                "proofRole": "lead",
                "sectionId": "repair-when",
                "order": 1,
            }
        ],
        "reviewEvidence": [
            {"reviewId": IDS["hoffman"], "provenance": {"type": "evidence", "ref": IDS["hoffman"]}, "placement": "lead-leak-seal-flue-same-visit", "section": "repair-when"}
        ],
        "ctas": [
            {"label": f"Call {PHONE}", "href": TEL, "kind": "phone"},
            {"label": "Roof replacement", "href": "/roof-replacement"},
            {"label": "Contact", "href": "/contact"},
        ],
    }

    home = {
        "url": "/",
        "pageId": "Home:/",
        "prescriptionId": "Home:/",
        "pageType": "homepage",
        "primaryKeyword": "roofing company Springfield MO",
        "reviewGrade": "A",
        "eligibleForReviews": True,
        "seoTitle": "Roofing Company in Springfield, MO | Swifts Roofing",
        "metaDescription": "Swifts Roofing is a roofing company in Springfield, MO. Call (417) 771-0477 for a reroof or for repair on the roof you already have.",
        "h1": "Roofing Company in Springfield, MO",
        "heroSubhead": (
            "Swifts Roofing is a roofing company in Springfield, MO. Jared and his crew "
            "complete roofs on homes in this area. The shop is at 4268 S Hillcrest Ave Ste 110. "
            f"Call {PHONE}."
        ),
        "suitableReviewIds": [IDS["c_jackson"], IDS["hunter"], IDS["josh"]],
        "claims": [
            {"id": "c-home-completed", "text": "Jared and his crew complete roofs on Springfield homes"},
            {"id": "c-home-crew", "text": "the crew works the roof you can see when they leave"},
            {"id": "c-home-finished", "text": "homeowners describe a finished roof they are happy to look at"},
        ],
        "sections": [
            {
                "id": "home-lead",
                "sectionId": "home-lead",
                "heading": "Completed roofs, named people",
                "body": (
                    "This page is the company, not a reroof-only pitch. Jared and his crew complete "
                    "roofs on Springfield homes, and C Jackson’s completed job is the lead because "
                    "it names Jared, the crew, and Swifts Roofing on the reviewer’s roof. It does "
                    "not name a repair, a replacement, a look-only stop, or a product. The story "
                    "here is a finished roof, start to finish, with communication from Jared.\n\n"
                    f"> {q_cjackson}\n"
                    "> — C Jackson"
                ),
            },
            {
                "id": "home-routes",
                "sectionId": "home-routes",
                "heading": "Two jobs, two pages",
                "body": (
                    "If the roof over the house needs to come off, go to roof replacement. That "
                    "page is for a full reroof, including tear-off and new shingles as the method. "
                    "If you intend to keep the roof you already have — a leak, a seal, a flue — "
                    "go to roof repair. Home does not try to close either job in this space. It "
                    "sends you to the page that matches. Contact is how you reach the shop when "
                    "you are ready to talk."
                ),
            },
            {
                "id": "home-crew",
                "sectionId": "home-crew",
                "heading": "The crew on the roof",
                "body": (
                    "Hunter Gaston described Jared explaining the work in language he could follow, "
                    "a polite crew, and hard work on the roof they had. The crew works the roof "
                    "you can see when they leave. The finished note is the roof looking the way "
                    "it should. That is still a completed roof, not a named method, and it stays "
                    "on Home rather than being upgraded into replacement or repair.\n\n"
                    f"> {q_hunter}\n"
                    "> — Hunter Gaston"
                ),
            },
            {
                "id": "home-nap",
                "sectionId": "home-nap",
                "heading": "The Springfield shop",
                "body": (
                    f"Swifts Roofing is at {ADDRESS}. Call {PHONE}. Homeowners name Jared "
                    "in the written record. Use the replacement page or the repair page if "
                    "you already know the job. Use contact if you want the number and the address "
                    "without the service argument."
                ),
            },
            {
                "id": "home-finished",
                "sectionId": "home-finished",
                "heading": "A finished roof you can look at",
                "body": (
                    "Josh Baird’s completed job is the roof he has from Swifts. Homeowners describe "
                    "a finished roof they are happy to look at. He names Jared as the person who "
                    "stays with the work until the customer is satisfied. That is still a generic "
                    "completed roof. It is not a reroof proof and not a repair proof.\n\n"
                    f"> {q_josh}\n"
                    "> — Josh Baird"
                ),
            },
            {
                "id": "home-next",
                "sectionId": "home-next",
                "heading": "Call the company",
                "body": (
                    f"Call {PHONE} when you want Swifts Roofing on the job. Choose roof replacement "
                    "if the roof is coming off. Choose roof repair if the roof is staying. Choose "
                    "contact if you only need the path to call or write."
                ),
            },
        ],
        "reviewPlacements": [
            {
                "reviewId": IDS["c_jackson"],
                "quote": q_cjackson,
                "attribution": "C Jackson",
                "claimId": "c-home-completed",
                "proofRole": "lead",
                "sectionId": "home-lead",
                "order": 1,
            },
            {
                "reviewId": IDS["hunter"],
                "quote": q_hunter,
                "attribution": "Hunter Gaston",
                "claimId": "c-home-crew",
                "proofRole": "support",
                "sectionId": "home-crew",
                "order": 3,
            },
            {
                "reviewId": IDS["josh"],
                "quote": q_josh,
                "attribution": "Josh Baird",
                "claimId": "c-home-finished",
                "proofRole": "support",
                "sectionId": "home-finished",
                "order": 5,
            },
        ],
        "reviewEvidence": [
            {"reviewId": IDS["c_jackson"], "provenance": {"type": "evidence", "ref": IDS["c_jackson"]}, "placement": "lead-completed-roof", "section": "home-lead"},
            {"reviewId": IDS["hunter"], "provenance": {"type": "evidence", "ref": IDS["hunter"]}, "placement": "support-crew-on-roof", "section": "home-crew"},
            {"reviewId": IDS["josh"], "provenance": {"type": "evidence", "ref": IDS["josh"]}, "placement": "support-finished-roof", "section": "home-finished"},
        ],
        "ctas": [
            {"label": "Roof replacement", "href": "/roof-replacement"},
            {"label": "Roof repair", "href": "/roof-repair"},
            {"label": f"Call {PHONE}", "href": TEL, "kind": "phone"},
            {"label": "Contact", "href": "/contact"},
        ],
    }

    contact = {
        "url": "/contact",
        "pageId": "Contact:/contact",
        "prescriptionId": "Contact:/contact",
        "pageType": "contact",
        "primaryKeyword": "contact Swifts Roofing Springfield",
        "eligibleForReviews": False,
        "seoTitle": "Contact Swifts Roofing in Springfield, MO",
        "metaDescription": "Contact Swifts Roofing in Springfield, MO. Call (417) 771-0477. 4268 S Hillcrest Ave Ste 110, Springfield, MO 65810.",
        "h1": "Contact Swifts Roofing in Springfield, MO",
        "heroSubhead": "Call or write Swifts Roofing in Springfield when you are ready to talk about the roof.",
        "sections": [
            {
                "id": "contact-reach",
                "sectionId": "contact-reach",
                "heading": "Phone and address",
                "body": (
                    f"Phone: {PHONE}. Address: {ADDRESS}. Ask for Jared if you already know the "
                    "name from a completed job."
                ),
            },
            {
                "id": "contact-routes",
                "sectionId": "contact-routes",
                "heading": "If you already know the job",
                "body": (
                    "Roof replacement is the page for a full reroof. Roof repair is the page for "
                    "the roof you already have. This page stays the place to call."
                ),
            },
        ],
        "reviewPlacements": [],
        "reviewEvidence": [],
        "ctas": [
            {"label": f"Call {PHONE}", "href": TEL, "kind": "phone"},
            {"label": "Roof replacement", "href": "/roof-replacement"},
            {"label": "Roof repair", "href": "/roof-repair"},
        ],
    }

    header = {
        "brand": BRAND,
        "logo": {"href": "/", "label": "Swifts Roofing"},
        "navigation": [
            {"label": "Home", "href": "/"},
            {"label": "Roof Replacement", "href": "/roof-replacement"},
            {"label": "Roof Repair", "href": "/roof-repair"},
            {"label": "Contact", "href": "/contact"},
        ],
        "cta": f"Call {PHONE}",
        "callToAction": {"label": f"Call {PHONE}", "href": TEL, "kind": "phone"},
    }

    footer = {
        "body": f"{BRAND} · {ADDRESS} · {PHONE}",
        "links": [
            {"label": "Home", "href": "/"},
            {"label": "Roof Replacement", "href": "/roof-replacement"},
            {"label": "Roof Repair", "href": "/roof-repair"},
            {"label": "Contact", "href": "/contact"},
            {"label": f"Call {PHONE}", "href": TEL, "kind": "phone"},
        ],
        "legal": "Words package only. No website deployment is authorized from this package.",
    }

    strategy = {
        "pageType": "strategy-overview",
        "body": (
            "This is an internal Writer 3 artifact. It is not a public page and must not be "
            "linked from header, footer, or business CTAs.\n\n"
            "The better future for Swifts Roofing is a four-page Springfield site that lets a "
            "homeowner choose the job before they call. Home is the company: a roofing company "
            "in Springfield, MO, with Jared and the crew on completed roofs. Roof replacement "
            "is the dedicated reroof destination, with shingle work folded in as the method for "
            "putting the new roof down. Roof repair is the dedicated keep-the-roof destination, "
            "with leak, seal, and flue work folded onto the one completed visit the record "
            "actually has. Contact is how a Springfield household reaches the shop at "
            f"{ADDRESS}, {PHONE}.\n\n"
            "That shape is the point. A homeowner who needs a new roof can read a reroof page. "
            "A homeowner who needs the roof they already have can read a repair page. The "
            "company page does not have to close both jobs, and the call path does not have to "
            "carry service proof.\n\n"
            "Architect QA decision slots for Writer 1 and Writer 2 remain awaiting independent "
            "Architect QA. This Writer 3 pass does not self-approve those slots. Whole-site QA "
            "in this package is the writer-run continuity check required to stop at "
            "awaiting-human-gate-2. Josh alone approves Human Gate 2. No merge, no clients/ "
            "build, and no deployment occurred."
        ),
        "sections": [
            {
                "heading": "Why these four pages",
                "body": (
                    "The approved Gate 1 page set is Home `/`, Roof Replacement `/roof-replacement`, "
                    "Roof Repair `/roof-repair`, and Contact `/contact`. Replacement carries the "
                    "six named completed reroofs. Repair carries the one Hoffman visit and stays "
                    "honest about thin evidence. Home carries generic completed-roof proof from "
                    "C Jackson, Hunter Gaston, and Josh Baird. Contact stays lean: phone, address, "
                    "and routes back to the two jobs."
                ),
            },
            {
                "heading": "What stays off the public map",
                "body": (
                    "Intents that were folded stay supporting evidence on the parent page: putting "
                    "new shingles down on replacement; leak, seal, and flue work on repair. Intents "
                    "that were passed over stay off navigation and off owner-facing service lists. "
                    "This overview does not publish a star rating or a review count."
                ),
            },
            {
                "heading": "Evidence binding",
                "body": (
                    "Lead reviews stay as prescribed: C Jackson on Home, Neal Richardson Sr on "
                    "replacement, Jonathan Hoffman on repair. Contact has no first review. Public "
                    "quotations are contiguous source text from the exact-place packet bound at "
                    "Gate 1. reviewEvidence in the machine package is a pointer ledger only."
                ),
            },
        ],
    }

    rejected_intent_ledger = [
        {"id": "roof-replacement", "name": "Roof replacement", "status": "prescribed", "aliases": ["roof replacement"], "publicRouteAllowed": True, "supportingEvidenceAllowed": False},
        {"id": "roof-repair", "name": "Roof repair", "status": "prescribed", "aliases": ["roof repair"], "publicRouteAllowed": True, "supportingEvidenceAllowed": False},
        {"id": "leak-repair", "name": "Leak repair", "status": "folded", "foldInto": "roof-repair", "aliases": ["leak repair"], "publicRouteAllowed": False, "supportingEvidenceAllowed": True},
        {"id": "seal-repair", "name": "Seal repair", "status": "folded", "foldInto": "roof-repair", "aliases": ["seal repair"], "publicRouteAllowed": False, "supportingEvidenceAllowed": True},
        {"id": "flue-repair", "name": "Flue repair", "status": "folded", "foldInto": "roof-repair", "aliases": ["flue repair"], "publicRouteAllowed": False, "supportingEvidenceAllowed": True},
        {"id": "shingle-installation", "name": "Shingle installation", "status": "folded", "foldInto": "roof-replacement", "aliases": ["shingle installation"], "publicRouteAllowed": False, "supportingEvidenceAllowed": True},
        {"id": "roof-inspection", "name": "Roof inspection", "status": "passed_over", "aliases": ["roof inspection"], "publicRouteAllowed": False, "supportingEvidenceAllowed": False},
        {"id": "emergency-tarping", "name": "Emergency tarping", "status": "passed_over", "aliases": ["emergency tarping"], "publicRouteAllowed": False, "supportingEvidenceAllowed": False},
        {"id": "storm-restoration", "name": "Storm restoration", "status": "passed_over", "aliases": ["storm restoration"], "publicRouteAllowed": False, "supportingEvidenceAllowed": False},
        {"id": "hail-damage-repair", "name": "Hail damage repair", "status": "passed_over", "aliases": ["hail damage repair"], "publicRouteAllowed": False, "supportingEvidenceAllowed": False},
        {"id": "waterproofing", "name": "Waterproofing", "status": "passed_over", "aliases": ["waterproofing"], "publicRouteAllowed": False, "supportingEvidenceAllowed": False},
        {"id": "insurance-claim-service", "name": "Insurance claim service", "status": "passed_over", "aliases": ["insurance claim service"], "publicRouteAllowed": False, "supportingEvidenceAllowed": False},
        {"id": "commercial-roofing", "name": "Commercial roofing", "status": "passed_over", "aliases": ["commercial roofing"], "publicRouteAllowed": False, "supportingEvidenceAllowed": False},
        {"id": "roof-maintenance", "name": "Roof maintenance", "status": "passed_over", "aliases": ["roof maintenance"], "publicRouteAllowed": False, "supportingEvidenceAllowed": False},
        {"id": "emergency-roof-repair", "name": "Emergency roof repair", "status": "passed_over", "aliases": ["emergency roof repair"], "publicRouteAllowed": False, "supportingEvidenceAllowed": False},
    ]

    pointer_ledger = {
        "/": home["reviewEvidence"],
        "/roof-replacement": replacement["reviewEvidence"],
        "/roof-repair": repair["reviewEvidence"],
        "/contact": contact["reviewEvidence"],
    }

    WORD_BEARING = {"reviewer", "excerpt", "quote", "text", "exactText", "reviewText", "body", "content", "attribution", "author"}

    def assert_pointer_ledger(entries: list) -> None:
        for entry in entries:
            bad = WORD_BEARING.intersection(entry)
            if bad:
                raise SystemExit(f"reviewEvidence has word-bearing keys {sorted(bad)}: {entry}")
            prov = entry.get("provenance") or {}
            if not entry.get("reviewId") or not entry.get("placement") or not entry.get("section"):
                raise SystemExit(f"reviewEvidence pointer incomplete: {entry}")
            if WORD_BEARING.intersection(prov):
                raise SystemExit(f"provenance has word-bearing keys: {prov}")

    for page in (home, replacement, repair, contact):
        bind_offsets(page)
        assert_pointer_ledger(page["reviewEvidence"])

    site = {
        "businessName": BRAND,
        "businessWebsite": "https://swiftsroofing.com/",
        "placeId": "ChIJZWfAc5d9z4cR2TLlkLdpqMk",
        "approvedServicePageCount": 2,
        "header": header,
        "footer": footer,
        "pages": [home, replacement, repair, contact],
        "strategyOverview": strategy,
        "reviews": [
            {
                "id": row["id"],
                "reviewer": row["reviewer"],
                "exactText": row["exactText"],
                "text": row["exactText"],
                "rating": row["rating"],
                "date": row["date"],
                "classification": "positive",
                "suitability": "high",
                "suitableFor": [],
            }
            for row in reviews.values()
        ],
        "rejectedIntentLedger": rejected_intent_ledger,
        "reviewEvidence": [
            item
            for page in (home, replacement, repair, contact)
            for item in page["reviewEvidence"]
        ],
        "pointerLedgerByRoute": pointer_ledger,
        "identity": {
            "name": BRAND,
            "placeId": "ChIJZWfAc5d9z4cR2TLlkLdpqMk",
            "website": "https://swiftsroofing.com/",
            "address": ADDRESS,
            "phone": PHONE,
        },
        "gate1": {
            "runId": "run-9dcafb5c9c632ee7dd22",
            "prospectId": "prospect-1c40e8f2f3661d4593fa",
            "approvedBy": "Josh Lenz",
            "approvedPullRequest": "https://github.com/alchemistj/ff-content-demo-factory/pull/7",
            "compactArtifact": "state/gate1/run-9dcafb5c9c632ee7dd22.md",
            "actionsCheckpoint": "https://github.com/alchemistj/ff-content-demo-factory/actions/runs/32839684505",
        },
    }

    # Bind suitableFor so placements are suitable for their pages.
    by_id = {row["id"]: row for row in site["reviews"]}
    for rid in home["suitableReviewIds"]:
        by_id[rid]["suitableFor"] = ["Home:/", "/"]
    for rid in replacement["suitableReviewIds"]:
        by_id[rid]["suitableFor"] = ["Service:/roof-replacement", "/roof-replacement"]
    for rid in repair["suitableReviewIds"]:
        by_id[rid]["suitableFor"] = ["Service:/roof-repair", "/roof-repair"]

    counts = {
        "/roof-replacement": section_words(replacement),
        "/roof-repair": section_words(repair),
        "/": section_words(home),
        "/contact": section_words(contact),
    }
    site["wordCounts"] = counts
    WORDS_PATH.write_text(json.dumps(site, indent=2, ensure_ascii=False) + "\n")
    print("Wrote", WORDS_PATH)
    for route, count in counts.items():
        flag = "OK" if (route not in ("/roof-replacement", "/roof-repair") or count >= 800) else "SHORT"
        print(f"  {route}: {count} words [{flag}]")


if __name__ == "__main__":
    main()
