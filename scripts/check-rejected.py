#!/usr/bin/env python3
"""Check a words file against docs/REJECTED.md (Josh's rejected lines).

Usage: python3 scripts/check-rejected.py outreach/<run>/<slug>.md [more files]
Prints FAIL lines and exits 1 if any rule with a regex (or the keyword-stuffing check) matches.
Page detection matches check-repeats.py: "## Home — …", "## <Service> — …", "## Contact — …".
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_rules():
    text = open(os.path.join(ROOT, "docs", "REJECTED.md"), encoding="utf-8").read()
    rules = []
    for block in re.split(r"\n(?=### )", text):
        m = re.match(r"### (R\d+): (.+)", block)
        if not m:
            continue
        r = {"id": m.group(1), "title": m.group(2).strip()}
        for key in ("pages", "where", "regex", "check", "level"):
            km = re.search(rf"^- {key}: (.+)$", block, re.M)
            if km:
                r[key] = km.group(1).strip()
        if "regex" in r or "check" in r:
            rules.append(r)
    return rules


def pages(text):
    cur, name = [], None
    for line in text.splitlines():
        if line.startswith("## "):
            if name is not None:
                yield name, cur
            name, cur = line[3:].strip(), []
            continue
        if name is not None:
            cur.append(line)
    if name is not None:
        yield name, cur


def kind(name):
    n = name.lower()
    if n.startswith("strategy"):
        return "strategy"
    if n.startswith("notes"):
        return "notes"
    if n.startswith("home"):
        return "home"
    if n.startswith("contact"):
        return "contact"
    return "service" if "—" in name else "other"


def applies(rule, k):
    p = rule.get("pages", "business")
    if p == "all":
        return k not in ("notes", "other")
    if p == "business":
        return k in ("home", "service", "contact")
    return k in [x.strip() for x in p.split(",")]


def parts(lines):
    """Return (hero lines, heading lines, body lines), quotes and captions excluded."""
    hero, heads, body, seen_head = [], [], [], False
    for l in lines:
        s = l.strip()
        if not s or s.startswith(">") or s.startswith("— ") or s.startswith("# "):
            continue
        if s.lower().lstrip("*").startswith(("buttons", "button:", "strip", "trust bar", "badge")):
            continue
        if s.startswith("#"):
            seen_head = True
            heads.append(s.lstrip("#").strip())
            continue
        body.append(s)
        if not seen_head:
            hero.append(s)
    return hero, heads, body


def main(paths):
    rules = load_rules()
    bad = False
    for path in paths:
        fn = os.path.basename(path)
        for name, lines in pages(open(path, encoding="utf-8").read()):
            k = kind(name)
            hero, heads, body = parts(lines)
            for r in rules:
                if not applies(r, k):
                    continue
                where = {"hero": hero, "heading": heads, "body": body}.get(r.get("where", "body"), body)
                if "regex" in r:
                    for s in where:
                        m = re.search(r["regex"], s, re.I)
                        if m:
                            lvl = "WARN" if r.get("level") == "warn" else "FAIL"
                            bad = bad or lvl == "FAIL"
                            print(f"{lvl} {fn} | {name[:40]} | {r['id']} {r['title'][:50]} | …{s[max(0, m.start()-30):m.end()+30]}…")
                if r.get("check", "").startswith("keyword-stuffing"):
                    joined = " ".join(body)
                    for phrase in set(re.findall(r"\b((?:[A-Z][\w&'-]*\s){1,4}in [A-Z][a-z]+(?: [A-Z][a-z]+)?, [A-Z]{2})\b", joined)):
                        n = joined.count(phrase)
                        if n > 2:
                            bad = True
                            print(f"FAIL {fn} | {name[:40]} | {r['id']} keyword stuffing | '{phrase}' x{n}")
    if not bad:
        print("OK: no rejected lines")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
