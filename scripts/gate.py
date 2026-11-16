#!/usr/bin/env python3
"""Demo gate (Josh's guardrail 1, Nov 16: "just pick, own it"). Run before ANY writer starts a business.

Usage: python3 scripts/gate.py <prospect folder> <batch name>
  e.g. python3 scripts/gate.py prospects/rockford-roofing/premium-roofing-solutions 2026-11-17-a

Exit 0 and print "GO" only if both gates pass. Otherwise print "BLOCK: <reason>" and exit 1.
Nobody overrides either gate, FF Architect included. Only Josh changes the outcome:
by editing qualify.md himself, or by creating the batch approval file.

Gate (a) qualify: <folder>/qualify.md must have a verdict line that says PASS, and nothing
  in the file may say the business is not a fit ("not a demo", "do not pick", "doubtful",
  "skip", "decision for josh", "the site is not weak").
Gate (b) batch hold: each batch is tracked in docs/batches/<batch>.txt (one prospect folder
  per line, added by this script on GO). A new batch, or the first batch after a brief change,
  stops after 3 docs until docs/batches/<batch>.JOSH-APPROVED exists. The brief commit is
  recorded on the batch's first line; if DOC-WRITE-BRIEF.md changes mid-batch, the batch is
  BLOCKED (no rule changes mid-run: start a new batch, which gets its own 3-doc hold).
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRIEF = "docs/briefs/DOC-WRITE-BRIEF.md"
HOLD = 3

BLOCK_PHRASES = [
    (r"not a demo", "says 'not a demo'"),
    (r"do not pick", "says 'do not pick'"),
    (r"\bdoubtful\b", "says 'doubtful'"),
    (r"decision for josh", "leaves the decision to Josh"),
    (r"the site is not weak", "says the site is not weak"),
    (r"\bskip\b", "says SKIP"),
]


def brief_sha():
    out = subprocess.run(["git", "-C", ROOT, "log", "-1", "--format=%h", "--", BRIEF],
                         capture_output=True, text=True)
    return out.stdout.strip() or "uncommitted"


def gate_qualify(folder):
    q = os.path.join(folder, "qualify.md")
    if not os.path.isfile(q):
        return "no qualify.md"
    text = open(q, encoding="utf-8").read()
    verdicts = [l for l in text.splitlines()
                if re.match(r"^[\W_]*(verdict|fit|recommendation)\b", l.strip(), re.I)]
    if not any(re.search(r"\bPASS\b", l) for l in verdicts):
        return "qualify.md has no PASS verdict line"
    for n, l in enumerate(text.splitlines(), 1):
        if re.search(r"SKIP\s*=\s*fails", l, re.I):
            continue  # the legend line "(PASS = passes that test; SKIP = fails it)"
        for pat, why in BLOCK_PHRASES:
            if re.search(pat, l, re.I):
                return f"qualify.md {why} (line {n})"
    return None


def gate_batch(folder, batch):
    d = os.path.join(ROOT, "docs", "batches")
    os.makedirs(d, exist_ok=True)
    log = os.path.join(d, f"{batch}.txt")
    approved = os.path.exists(os.path.join(d, f"{batch}.JOSH-APPROVED"))
    sha = brief_sha()
    rel = os.path.relpath(os.path.abspath(folder), ROOT)
    lines = open(log).read().split("\n") if os.path.exists(log) else []
    lines = [l for l in lines if l.strip()]
    if lines and lines[0].startswith("brief "):
        if lines[0] != f"brief {sha}":
            return f"brief changed mid-batch ({lines[0][6:]} -> {sha}); start a new batch", None
        done = lines[1:]
    else:
        done = lines
        lines = [f"brief {sha}"] + lines
    if rel in done:
        return None, None  # already admitted; re-running is fine
    if len(done) >= HOLD and not approved:
        return (f"batch hold: {len(done)} docs written in batch '{batch}'; waiting for Josh "
                f"to approve them (create docs/batches/{batch}.JOSH-APPROVED)"), None
    return None, (log, lines + [rel])


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    folder, batch = sys.argv[1], sys.argv[2]
    why = gate_qualify(folder)
    if why:
        print(f"BLOCK: {why}")
        return 1
    why, write = gate_batch(folder, batch)
    if why:
        print(f"BLOCK: {why}")
        return 1
    if write:
        open(write[0], "w").write("\n".join(write[1]) + "\n")
    print(f"GO (brief {brief_sha()})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
