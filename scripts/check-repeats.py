#!/usr/bin/env python3
"""Count repeated claims per page in a words doc (Markdown or saved Google Doc text).

Usage: python3 scripts/check-repeats.py outreach/words-2026-11-16/<slug>.md [more files]

Pages start at "## " headings that contain an em dash (business pages) or are
"Strategy page" / "Notes". Notes and the strategy page are skipped (strategy cards discuss claims by design). Review quotes (lines starting with
">") and "— Name" captions are skipped, because a customer's own words don't
count as us repeating ourselves. Any phrase group that appears more than twice
on one page prints FAIL. Exit code 1 if any FAIL.
"""
import re
import sys

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
    if not bad:
        print("OK: no claim group appears more than twice on any page")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
