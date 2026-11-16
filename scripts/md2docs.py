#!/usr/bin/env python3
"""Turn a words Markdown file into Google Docs batchUpdate requests that REPLACE a doc's body in place.

Usage: python3 scripts/md2docs.py <file.md> <current body endIndex> > requests.json
  <current body endIndex>: the endIndex of the last element in body.content from read_doc (use 1 for an empty doc).
Output: a JSON list for mcp__Google_Docs__update_doc: delete old body, insert new text, then paragraph styles,
bullets, bold/italic and links. "# "→HEADING_1, "## "→HEADING_2, "### "→HEADING_3, "#### "→HEADING_4,
"- "→bullet, "> " quote lines→plain paragraphs, **bold**, *italic*, [text](url)→link. Blank lines are dropped.
"""
import json
import re
import sys


def u16(s):
    return len(s.encode("utf-16-le")) // 2


def inline(text):
    """Strip **bold**, *italic* and [t](u); return plain text and spans (start, end, kind, url)."""
    spans, out, i = [], "", 0
    pat = re.compile(r"\*\*(.+?)\*\*|(?<![\*\w])\*(?!\s)(.+?)(?<!\s)\*(?![\*\w])|\[([^\]]+)\]\(([^)]+)\)")
    for m in pat.finditer(text):
        out += text[i:m.start()]
        start = u16(out)
        if m.group(1) is not None:
            inner, kind, url = m.group(1), "bold", None
            # nested link inside bold: [t](u)
            lm = re.fullmatch(r"\[([^\]]+)\]\(([^)]+)\)", inner)
            if lm:
                inner, url = lm.group(1), lm.group(2)
                spans.append((start, start + u16(inner), "link", url))
        elif m.group(2) is not None:
            inner, kind, url = m.group(2), "italic", None
        else:
            inner, kind, url = m.group(3), "link", m.group(4)
        out += inner
        spans.append((start, start + u16(inner), kind, url))
        i = m.end()
    out += text[i:]
    out = out.replace("\\!", "!").replace("\\&", "&").replace("\\.", ".")
    return out, spans


def main(path, end):
    paras = []
    for raw in open(path, encoding="utf-8").read().splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue
        style, bullet = "NORMAL_TEXT", False
        m = re.match(r"^(#{1,4}) (.*)$", line)
        if m:
            style = {1: "HEADING_1", 2: "HEADING_2", 3: "HEADING_3", 4: "HEADING_4"}[len(m.group(1))]
            line = m.group(2)
        elif re.match(r"^\s*[-*] ", line):
            bullet, line = True, re.sub(r"^\s*[-*] ", "", line)
        elif re.match(r"^\s*>\s?", line):
            line = re.sub(r"^\s*>\s?", "", line)
            if not line.strip():
                continue
        elif re.match(r"^\s*\d+\. ", line):
            pass
        text, spans = inline(line)
        paras.append((text, style, bullet, spans))

    reqs = []
    if end > 2:
        reqs.append({"deleteContentRange": {"range": {"startIndex": 1, "endIndex": end - 1}}})
    full = "".join(t + "\n" for t, _, _, _ in paras)
    reqs.append({"insertText": {"location": {"index": 1}, "text": full}})
    idx, bullets = 1, []
    for text, style, bullet, spans in paras:
        n = u16(text)
        rng = {"startIndex": idx, "endIndex": idx + n + 1}
        reqs.append({"updateParagraphStyle": {"range": rng, "paragraphStyle": {"namedStyleType": style}, "fields": "namedStyleType"}})
        reqs.append({"updateTextStyle": {"range": {"startIndex": idx, "endIndex": idx + n + 1},
                                         "textStyle": {"bold": False, "italic": False}, "fields": "bold,italic,link"}})
        for s, e, kind, url in spans:
            r = {"startIndex": idx + s, "endIndex": idx + e}
            if kind == "link":
                reqs.append({"updateTextStyle": {"range": r, "textStyle": {"link": {"url": url}}, "fields": "link"}})
            else:
                reqs.append({"updateTextStyle": {"range": r, "textStyle": {kind: True}, "fields": kind}})
        if bullet:
            bullets.append(rng)
        idx += n + 1
    # merge adjacent bullet paragraphs into one list each
    merged = []
    for r in bullets:
        if merged and merged[-1]["endIndex"] == r["startIndex"]:
            merged[-1]["endIndex"] = r["endIndex"]
        else:
            merged.append(dict(r))
    for r in reversed(merged):  # createParagraphBullets doesn't shift indices, order is safe
        reqs.append({"createParagraphBullets": {"range": r, "bulletPreset": "BULLET_DISC_CIRCLE_SQUARE"}})
    json.dump(reqs, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]))
