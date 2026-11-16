#!/usr/bin/env python3
"""Count repeated claims per page in a words doc (Markdown or saved Google Doc text).

Usage: python3 scripts/check-repeats.py outreach/words-2026-11-16/<slug>.md [more files]

Pages start at "## " headings that contain an em dash (business pages) or are
"Strategy page" / "Notes". Notes and the strategy page are skipped (strategy cards discuss claims by design). Review quotes (lines starting with
">") and "— Name" captions are skipped, because a customer's own words don't
count as us repeating ourselves. Any phrase group that appears more than twice
on one page prints FAIL. Exit code 1 if any FAIL.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def _norm(l):
    l = l.strip().lstrip("-*").strip().strip("*").strip()
    return l.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')


def canonical_full_build():
    t = open(os.path.join(HERE, "..", "docs", "writer-guides", "FULL_BUILD_LINES.md"), encoding="utf-8").read()
    block = t.split("<!-- FULL-BUILD-START -->")[1].split("<!-- FULL-BUILD-END -->")[0]
    return [_norm(l) for l in block.splitlines() if l.strip()]


def check_full_build(text, fname):
    """Return list of problems: the list after 'What a full build includes' must match canonical exactly."""
    lines = text.splitlines()
    idx = [i for i, l in enumerate(lines) if _norm(l.lstrip("#")) == "What a full build includes"]
    if not idx:
        return [f"FAIL {fname} | full-build list: heading 'What a full build includes' not found"]
    want = canonical_full_build()
    got = []
    start = idx[0] + 1
    for j in range(idx[0] + 1, min(idx[0] + 6, len(lines))):
        if _norm(lines[j].lstrip("#")).startswith("Gets you found"):
            start = j
            break
    for l in lines[start:]:
        n = _norm(l.lstrip("#"))
        if not n:
            continue
        if n.startswith("What we") or n.startswith("##") or len(got) >= len(want):
            break
        got.append(n)
    probs = []
    for i, w in enumerate(want):
        g = got[i] if i < len(got) else "(missing)"
        if g != w:
            probs.append(f"FAIL {fname} | full-build line {i+1}: expected '{w[:70]}' got '{g[:70]}'")
    return probs

GROUPS = {
    "speed": r"same[- ]day|next[- ]day|within (a|one|24) (day|hours?)|within hours|within a few hours|within two hours|the same day",
    "24/7": r"24/7|24-hour|24 hours a day|around the clock|nights and weekends",
    "free estimate": r"free (estimate|inspection|quote)s?",
    "warranty": r"warrant(y|ies)",
    "insurance": r"insurance (company|claim)|your insurer|the insurer",
}
LIMIT = 2
HARD = {"speed", "24/7"}  # FAIL above LIMIT on business pages; others WARN (some pages are about them)


def pages(text):
    cur, name = [], None
    for line in text.splitlines():
        s = line.lstrip("#").strip()
        is_md = line.startswith("## ") and ("—" in line or "Strategy" in line or line.startswith("## Notes"))
        is_plain = (not line.startswith(("#", ">")) and (s == "Strategy page" or s.startswith("Notes (not page copy)") or s == "Notes"
                    or re.match(r"^[^—]{2,40} — [^—]+ — ", s) is not None))
        if is_md or is_plain:
            if name is not None:
                yield name, cur
            name, cur = s, []
            continue
        if name is not None:
            cur.append(line)
    if name is not None:
        yield name, cur


def main(paths):
    bad = False
    for path in paths:
        text = open(path, encoding="utf-8").read()
        for name, lines in pages(text):
            if name.startswith("Notes") or name.startswith("Strategy"):
                continue
            body = "\n".join(
                l for l in lines
                if not l.lstrip().startswith(">") and not l.lstrip().startswith("— ")
            ).lower()
            for group, pat in GROUPS.items():
                n = len(re.findall(pat, body))
                if n > LIMIT:
                    hard = group in HARD
                    bad = bad or hard
                    print(f"{'FAIL' if hard else 'WARN'} {path.split('/')[-1]} | {name[:40]} | {group}: {n} (limit {LIMIT})")
        fname = path.split('/')[-1]
        for p_ in check_full_build(text, fname):
            bad = True
            print(p_)
        for name, lines in pages(text):
            if name.startswith("Notes"):
                continue
            for l in lines:
                if not l.lstrip().startswith(">") and re.search(r"\b[1-5]\.\d\b[^.\n]{0,40}(google|yelp|angi|stars?|rating|bbb)|\b\d[\d,]* (google |online |five-star |5-star )?reviews\b|\brated [1-5]\.\d", l, re.I):
                    bad = True
                    print(f"FAIL {fname} | {name[:40]} | rating or review count in copy: {l.strip()[:70]}")
                for tgt in re.findall(r"\]\(([^)]*)\)", l):
                    if not tgt.startswith(("http://", "https://", "mailto:", "tel:", "about:blank")) or "docs.google.com" in tgt:
                        bad = True
                        print(f"FAIL {fname} | {name[:40]} | link target '{tgt[:40]}' becomes a docs.google.com link in Google Docs (use about:blank)")
                if "docs.google.com" in l:
                    bad = True
                    print(f"FAIL {fname} | {name[:40]} | docs.google.com link in page copy (use about:blank): {l.strip()[:60]}")
        # Strip / trust bar lines outside Home, and FAQ questions repeated across pages
        faq = {}
        for name, lines in pages(text):
            if name.startswith("Notes") or name.startswith("Strategy"):
                continue
            for l in lines:
                s = l.strip().strip("*").strip()
                if re.match(r"^(strip|trust bar|differentiators)\s*(:|$)", s, re.I) and not name.lower().startswith("home"):
                    bad = True
                    print(f"FAIL {path.split('/')[-1]} | {name[:40]} | strip/trust bar outside Home: {s[:60]}")
                if s.endswith("?") and len(s) < 160 and not l.lstrip().startswith(">"):
                    q = re.sub(r"[^a-z ]", "", s.lower()).strip()
                    faq.setdefault(q, set()).add(name[:30])
        for q, where in faq.items():
            if len(where) > 1:
                bad = True
                print(f"FAIL {path.split('/')[-1]} | FAQ on {len(where)} pages: '{q[:60]}' ({', '.join(sorted(where))})")
    if not bad:
        print("OK: no claim group appears more than twice on any page")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
