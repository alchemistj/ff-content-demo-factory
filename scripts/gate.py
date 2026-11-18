#!/usr/bin/env python3
"""Demo gate (Josh's guardrail 1, Nov 16: "just pick, own it"). Run before ANY writer starts a business.

Usage:
  python3 scripts/gate.py <prospect folder> <batch name>   -> GO or BLOCK
  python3 scripts/gate.py --version                         -> the briefs version (for the Notes stamp)

Exit 0 and print "GO (briefs <sha>)" only if both gates pass. Otherwise print "BLOCK: <reason>" and exit 1.
Nobody overrides either gate, FF Architect included.

Gate (a) qualify: <folder>/qualify.md must have a verdict/fit/recommendation line that says PASS,
  and nothing in it may say the business is not a fit ("not a demo", "do not pick", "doubtful",
  "skip", "decision for josh", "the site is not weak").
Gate (b) hold, keyed to the BRIEFS VERSION (not the batch name, so splitting a run into
  batches can't dodge it). The briefs version is the latest commit touching any file that
  shapes the copy (BRIEF_FILES below). Under each version, only the first 3 docs (across all
  batches) may proceed. After that, GO needs docs/batches/brief-<sha>.JOSH-APPROVED, which must
  hold Josh's own words, where he said them, and a doc cap:
      Josh said: "<his exact words>"
      Where: <session or channel>, <date and time>
      max_docs: <N>
  An empty or incomplete approval file is refused. Past max_docs, a new approval is needed.
  Optional, one line per folder, only when Josh names that business for the run:
      override_qualify: <prospect folder> — <Josh's reason>
  lets that one folder through gate (a) and prints the override in the GO line. qualify.md is
  never edited for an override.
  Every admitted doc is logged in docs/batches/brief-<sha>.txt with its batch name.
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRIEF_FILES = [
    "docs/briefs/DOC-WRITE-BRIEF.md",
    "docs/briefs/DOC-CHECK-BRIEF.md",
    "docs/briefs/TASTE-CHECK-BRIEF.md",
    "docs/REJECTED.md",
    "docs/writer-guides/FULL_BUILD_LINES.md",
]
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
    out = subprocess.run(["git", "-C", ROOT, "log", "-1", "--format=%h", "--"] + BRIEF_FILES,
                         capture_output=True, text=True)
    sha = out.stdout.strip() or "uncommitted"
    dirty = subprocess.run(["git", "-C", ROOT, "status", "--porcelain", "--"] + BRIEF_FILES,
                           capture_output=True, text=True).stdout.strip()
    return sha + ("-dirty" if dirty else "")


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


def read_approval(path):
    """Return (max_docs, None) for a valid approval file, else (None, reason)."""
    if not os.path.exists(path):
        return None, None
    t = open(path, encoding="utf-8").read()
    said = re.search(r'^Josh said:\s*"(.{8,})"\s*$', t, re.M)
    where = re.search(r"^Where:\s*(\S.{5,})$", t, re.M)
    cap = re.search(r"^max_docs:\s*(\d+)\s*$", t, re.M)
    if not (said and where and cap):
        return None, (f"approval file {os.path.relpath(path, ROOT)} must hold 'Josh said: \"<his words>\"', "
                      "'Where: <session, time>' and 'max_docs: <N>'")
    return int(cap.group(1)), None


def qualify_overrides():
    """{folder: reason} from the current version's approval file (validated in gate_batch)."""
    path = os.path.join(ROOT, "docs", "batches", f"brief-{brief_sha()}.JOSH-APPROVED")
    if not os.path.exists(path):
        return {}
    out = {}
    for m in re.finditer(r"^override_qualify:\s*(\S+)\s*[—-]+\s*(\S.{5,})$", open(path, encoding="utf-8").read(), re.M):
        out[m.group(1).strip().removeprefix("prospects/").rstrip("/")] = m.group(2).strip()
    return out


def gate_batch(folder, batch):
    d = os.path.join(ROOT, "docs", "batches")
    os.makedirs(d, exist_ok=True)
    sha = brief_sha()
    if sha.endswith("-dirty") or sha == "uncommitted":
        return "briefs have uncommitted changes; a rule doesn't count until it is committed", None
    log = os.path.join(d, f"brief-{sha}.txt")
    rel = os.path.relpath(os.path.abspath(folder), ROOT)
    done = [l.split("\t")[0] for l in open(log).read().splitlines() if l.strip()] if os.path.exists(log) else []
    if rel in done:
        return None, None  # already admitted under this version
    cap, bad = read_approval(os.path.join(d, f"brief-{sha}.JOSH-APPROVED"))
    if bad:
        return bad, None
    if len(done) >= HOLD and cap is None:
        return (f"hold: {len(done)} docs written under briefs {sha}; waiting for Josh to approve them "
                f"(docs/batches/brief-{sha}.JOSH-APPROVED)"), None
    if cap is not None and len(done) >= max(cap, HOLD):
        return f"cap reached: {len(done)} of max_docs {cap} under briefs {sha}; doc {len(done)+1} needs a new approval", None
    return None, (log, rel + "\t" + batch)


def main():
    if sys.argv[1:] == ["--version"]:
        print(brief_sha())
        return 0
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    folder, batch = sys.argv[1], sys.argv[2]
    why = gate_qualify(folder)
    note = ""
    if why:
        key = os.path.relpath(os.path.abspath(folder), os.path.join(ROOT, "prospects"))
        reason = qualify_overrides().get(key)
        if not reason:
            print(f"BLOCK: {why}")
            return 1
        note = f"; QUALIFY OVERRIDE by Josh: {reason} (gate said: {why})"
    why, write = gate_batch(folder, batch)
    if why:
        print(f"BLOCK: {why}")
        return 1
    if write:
        with open(write[0], "a") as f:
            f.write(write[1] + "\n")
    print(f"GO (briefs {brief_sha()}){note}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
