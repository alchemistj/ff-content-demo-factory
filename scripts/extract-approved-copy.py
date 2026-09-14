#!/usr/bin/env python3
"""Faithful HTML-to-Markdown extraction for approved Fluid Frame copy examples.

Reads prerendered page HTML and emits customer-facing Markdown: headings,
paragraphs, lists, links, body emphasis, CTAs, FAQ answers, and attributed
quotations. Shared header/footer chrome is omitted from page files.
"""

from __future__ import annotations

import html as htmlmod
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

SKIP_TAGS = {
    "script",
    "style",
    "svg",
    "path",
    "noscript",
    "iframe",
    "picture",
}
VOID_TAGS = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}
SKIP_CHROME_TAGS = {"header", "footer"}
BLOCK_TAGS = {
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "blockquote",
    "div",
    "section",
    "article",
    "main",
    "ul",
    "ol",
    "figcaption",
    "dt",
    "dd",
}


def load_jsonld(raw: str) -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = []
    for match in re.finditer(
        r"<script[^>]*type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>",
        raw,
        re.S | re.I,
    ):
        try:
            docs.append(json.loads(htmlmod.unescape(match.group(1))))
        except json.JSONDecodeError:
            continue
    return docs


def walk_graph(node: Any) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    if isinstance(node, dict):
        found.append(node)
        for value in node.values():
            found.extend(walk_graph(value))
    elif isinstance(node, list):
        for item in node:
            found.extend(walk_graph(item))
    return found


def faq_map(raw: str) -> dict[str, str]:
    answers: dict[str, str] = {}
    for doc in load_jsonld(raw):
        for node in walk_graph(doc):
            if node.get("@type") != "FAQPage":
                continue
            for entity in node.get("mainEntity") or []:
                if not isinstance(entity, dict):
                    continue
                question = normalize_space(entity.get("name") or "")
                answer = (entity.get("acceptedAnswer") or {}).get("text") or ""
                answer = normalize_space(htmlmod.unescape(answer))
                if question and answer:
                    answers[question.casefold()] = answer
    return answers


def normalize_space(text: str) -> str:
    return re.sub(r"[ \t\r\n]+", " ", text).strip()


def looks_like_chrome(attrs: dict[str, str]) -> bool:
    cls = f"{attrs.get('class', '')} {attrs.get('id', '')}".lower()
    tests = (
        "mobile-bottom",
        "bottom-bar",
        "fixed inset-x-0 bottom-0",
        "data-testid=\"mobile-menu",
    )
    return any(token in cls for token in tests)


class PageExtractor(HTMLParser):
    def __init__(self, faq: dict[str, str]) -> None:
        super().__init__(convert_charrefs=True)
        self.faq = faq
        self.skip = 0
        self.chrome = 0
        self.in_main = False
        self.seen_main_or_root = False
        self.stack: list[str] = []
        self.fmt: list[str] = []
        self.blocks: list[tuple[str, str]] = []
        self.cur_kind: str | None = None
        self.cur_parts: list[str] = []
        self.list_type: list[str] = []
        self.pending_faq: str | None = None
        self.emitted_faq: set[str] = set()
        self.link_href: str | None = None
        self.link_buf: list[str] = []
        self.in_cite = False
        self.cite_buf: list[str] = []
        self.quote_attr: str | None = None
        self.capture_root = False

    def handle_startendtag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        if tag in VOID_TAGS or tag in SKIP_TAGS:
            if tag == "br" and not self.skip and not self.chrome:
                self.add_text("\n")
            return
        self.handle_starttag(tag, attrs_list)
        self.handle_endtag(tag)

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {k: (v or "") for k, v in attrs_list}
        if tag in VOID_TAGS:
            if tag == "br" and not self.skip and not self.chrome:
                self.add_text("\n")
            return
        self.stack.append(tag)
        cls = attrs.get("class", "")
        role = attrs.get("role", "")
        aria = attrs.get("aria-label", "")

        if tag in SKIP_TAGS:
            self.skip += 1
            return
        if tag == "form":
            self.skip += 1
            return
        if tag in SKIP_CHROME_TAGS or looks_like_chrome(attrs):
            # Review cards use <footer> for attribution; keep those.
            if tag == "footer" and self.cur_kind == "quote":
                return
            self.chrome += 1
            return
        if self.skip or self.chrome:
            return

        if tag == "main":
            self.in_main = True
            self.seen_main_or_root = True
            self.flush_block()
            return
        if attrs.get("id") == "root" and not self.seen_main_or_root:
            self.capture_root = True
            self.seen_main_or_root = True

        if tag == "body":
            # Body is not chrome; wait for main or #root.
            return
        if not self.in_main and not self.capture_root:
            return

        if tag in {"ul", "ol"}:
            self.flush_block()
            self.list_type.append("ol:0" if tag == "ol" else "ul")
            return
        if tag == "li":
            self.flush_block()
            self.start_block("li")
            return
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self.flush_block()
            self.start_block(tag)
            return
        if tag == "p":
            self.flush_block()
            self.start_block("p")
            return
        if tag == "blockquote":
            self.flush_block()
            self.start_block("quote")
            self.quote_attr = None
            return
        if tag in {"strong", "b"}:
            self.fmt.append("strong")
            return
        if tag in {"em", "i"}:
            self.fmt.append("em")
            return
        if tag == "br":
            self.add_text("\n")
            return
        if tag == "a":
            href = attrs.get("href") or ""
            self.link_href = href
            self.link_buf = []
            return
        if tag == "cite":
            self.in_cite = True
            self.cite_buf = []
            return
        if tag == "button" and role != "presentation":
            # FAQ questions live in buttons; keep heading children.
            return
        if tag in {"span"} and "gp-eyebrow" in cls:
            self.flush_block()
            self.start_block("eyebrow")
            return
        if tag == "span" and "gp-customer-review-mark" in cls:
            return
        # Ignore decorative buttons/icons.
        _ = (aria, role)

    def handle_endtag(self, tag: str) -> None:
        if tag in SKIP_TAGS or tag == "form":
            if self.skip:
                self.skip -= 1
            if self.stack and self.stack[-1] == tag:
                self.stack.pop()
            return
        if tag in SKIP_CHROME_TAGS:
            if tag == "footer" and self.cur_kind == "quote":
                if self.stack and self.stack[-1] == tag:
                    self.stack.pop()
                return
            if self.chrome:
                self.chrome -= 1
            if self.stack and self.stack[-1] == tag:
                self.stack.pop()
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        if self.skip or self.chrome:
            return
        if tag == "main":
            self.flush_block()
            self.in_main = False
            return
        if tag == "a" and self.link_href is not None:
            label = normalize_space("".join(self.link_buf))
            href = self.link_href
            self.link_href = None
            self.link_buf = []
            if not label:
                return
            if href.startswith("tel:") or href.startswith("mailto:") or href.startswith("/"):
                md = f"[{label}]({href})"
            elif href.startswith("http"):
                md = f"[{label}]({href})"
            else:
                md = label
            self.add_text(md)
            return
        if tag == "cite":
            self.in_cite = False
            cite = normalize_space("".join(self.cite_buf))
            self.cite_buf = []
            if cite:
                self.quote_attr = cite
            return
        if tag in {"strong", "b", "em", "i"}:
            if self.fmt and self.fmt[-1] in {"strong", "em"}:
                self.fmt.pop()
            return
        if tag in {"ul", "ol"}:
            self.flush_block()
            if self.list_type:
                self.list_type.pop()
            return
        if tag in {"p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"}:
            self.flush_block()
            if tag == "blockquote" and self.quote_attr:
                self.blocks.append(("attribution", self.quote_attr))
                self.quote_attr = None
            return
        if tag == "span" and self.cur_kind == "eyebrow":
            self.flush_block()

    def handle_data(self, data: str) -> None:
        if self.skip or self.chrome:
            return
        if not self.in_main and not self.capture_root:
            return
        if self.in_cite:
            self.cite_buf.append(data)
            return
        if self.link_href is not None:
            formatted = self.apply_fmt(data)
            self.link_buf.append(formatted)
            return
        self.add_text(self.apply_fmt(data))

    def apply_fmt(self, text: str) -> str:
        if not text:
            return ""
        if "strong" in self.fmt:
            stripped = text.strip("\n")
            if stripped:
                text = text.replace(stripped, f"**{stripped}**", 1)
        elif "em" in self.fmt:
            stripped = text.strip("\n")
            if stripped:
                text = text.replace(stripped, f"*{stripped}*", 1)
        return text

    def add_text(self, text: str) -> None:
        if self.cur_kind is None:
            if not text.strip():
                return
            self.start_block("p")
        self.cur_parts.append(text)

    def start_block(self, kind: str) -> None:
        self.cur_kind = kind
        self.cur_parts = []

    def flush_block(self) -> None:
        if self.cur_kind is None:
            return
        raw = "".join(self.cur_parts)
        text = collapse_inline(raw)
        kind = self.cur_kind
        self.cur_kind = None
        self.cur_parts = []
        if not text:
            return
        if kind in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            # Headings never carry markdown bold.
            text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
            self.blocks.append((kind, text))
            key = text.casefold()
            if key in self.faq:
                self.pending_faq = text
            return
        if kind == "li":
            if text in {"+", "−", "-", "—", "★", "★★★★★", "“", "”", '"'} or re.fullmatch(r"[★+−\-–—]+", text):
                return
            if self.list_type and self.list_type[-1].startswith("ol"):
                n = int(self.list_type[-1].split(":")[1]) + 1
                self.list_type[-1] = f"ol:{n}"
                bullet = f"{n}."
            else:
                bullet = "-"
            self.blocks.append(("li", f"{bullet} {text.rstrip('·').strip()}"))
            return
        if kind == "quote":
            self.blocks.append(("quote", text))
            return
        if kind == "eyebrow":
            self.blocks.append(("eyebrow", text))
            return
        if kind == "p":
            if re.fullmatch(r"[★“”\"+−\-–—]+", text) or text in {"+", "−", "-", "—"}:
                return
            self.blocks.append(("p", text.rstrip("·").strip()))
            if self.pending_faq:
                self.emitted_faq.add(self.pending_faq.casefold())
                self.pending_faq = None
            return
        self.blocks.append((kind, text))


def collapse_inline(text: str) -> str:
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Fix missing spaces around markdown links created from HTML comments.
    text = re.sub(r"([A-Za-z0-9.,;:])(\[)", r"\1 \2", text)
    text = re.sub(r"(\])([A-Za-z0-9])", r"\1 \2", text)
    return text.strip()


def blocks_to_markdown(blocks: list[tuple[str, str]], faq: dict[str, str]) -> str:
    lines: list[str] = []
    emitted_faq: set[str] = set()
    heading_map = {"h1": "#", "h2": "##", "h3": "###", "h4": "####", "h5": "#####", "h6": "######"}
    i = 0
    while i < len(blocks):
        kind, text = blocks[i]
        if kind == "eyebrow":
            lines.append(f"*{text}*")
            lines.append("")
        elif kind in heading_map:
            lines.append(f"{heading_map[kind]} {text}")
            lines.append("")
            key = text.casefold()
            next_kind = blocks[i + 1][0] if i + 1 < len(blocks) else None
            next_text = blocks[i + 1][1] if i + 1 < len(blocks) else ""
            if key in faq and (
                next_kind not in {"p", "li", "quote"}
                or (next_kind == "p" and next_text in {"+", "−", "-", "—"})
            ):
                lines.append(faq[key])
                lines.append("")
                emitted_faq.add(key)
        elif kind == "p":
            extra = paragraph_lines(text, faq, emitted_faq)
            if extra:
                lines.extend(extra)
                # Skip immediately following duplicate JSON-LD answer paragraphs.
                answer = faq.get(text.rstrip("−+-").strip().casefold(), "")
                while answer and i + 1 < len(blocks) and blocks[i + 1][0] == "p":
                    nxt = blocks[i + 1][1].strip()
                    if nxt == answer or answer.startswith(nxt[:80]) or nxt.startswith(answer[:80]):
                        i += 1
                        continue
                    break
        elif kind == "li":
            while i < len(blocks) and blocks[i][0] == "li":
                lines.extend(list_item_lines(blocks[i][1], faq))
                i += 1
            lines.append("")
            continue
        elif kind == "quote":
            quote = text.strip().strip("“”\"")
            if not quote and i + 1 < len(blocks) and blocks[i + 1][0] in {"p", "quote"}:
                i += 1
                quote = blocks[i][1].strip().strip("“”\"")
            if not quote:
                i += 1
                continue
            attr = None
            if i + 1 < len(blocks) and blocks[i + 1][0] == "attribution":
                attr = blocks[i + 1][1]
                i += 1
            elif i + 1 < len(blocks) and blocks[i + 1][0] == "p" and len(blocks[i + 1][1].split()) <= 6:
                maybe = blocks[i + 1][1]
                if not maybe.endswith(".") and not maybe.startswith("[") and "http" not in maybe:
                    attr = maybe
                    i += 1
            lines.append(as_quote(quote, attr))
            lines.append("")
        elif kind == "attribution":
            lines.append(f"— {text}")
            lines.append("")
        i += 1

    md = "\n".join(lines)
    md = re.sub(r"\](\([^)]+\))\[", r"]\1\n\n[", md)
    md = re.sub(r"\n{3,}", "\n\n", md).strip() + "\n"
    md = re.sub(r"^> “\s*$", "", md, flags=re.M)
    md = re.sub(r"\n{3,}", "\n\n", md).strip() + "\n"
    return md


def paragraph_lines(text: str, faq: dict[str, str], emitted_faq: set[str]) -> list[str]:
    if text in {"+", "−", "-", "—", "FAQ", "Got Questions?", "Helpful Next Steps"}:
        return []
    stripped = text.rstrip("−+-").strip()
    key = stripped.casefold()
    if key in faq and (text.rstrip().endswith(("+", "−", "-", "—")) or text.rstrip() == stripped):
        emitted_faq.add(key)
        return [f"**{stripped}**", "", faq[key], ""]
    if text.startswith("★★★★★") and ("“" in text or '"' in text):
        return [as_quote(re.sub(r"^★+\s*", "", text)), ""]
    if text.startswith("“") or (text.startswith('"') and len(text) > 60):
        return [as_quote(text), ""]
    return [text, ""]


def list_item_lines(text: str, faq: dict[str, str]) -> list[str]:
    prefix, _, rest = text.partition(" ")
    body = rest.strip()
    q_match = re.match(r"(.+\?)\s*(.*)$", body)
    if q_match:
        question = q_match.group(1).strip()
        trailing = q_match.group(2).strip()
        answer = faq.get(question.casefold())
        if answer and not trailing:
            return [f"{prefix} {question}", "", f"  {answer}"]
        if answer and trailing == answer[:40]:
            return [f"{prefix} {question}", "", f"  {answer}"]
        if trailing and answer and trailing.casefold() != answer.casefold():
            return [f"{prefix} {question}", "", f"  {trailing}"]
        if trailing:
            return [f"{prefix} {question}", "", f"  {trailing}"]
    return [text]


def as_quote(text: str, attr: str | None = None) -> str:
    text = text.strip().strip("“”\"")
    if " — " in text[-90:]:
        body, maybe = text.rsplit(" — ", 1)
        if len(maybe.split()) <= 6 and attr is None:
            text, attr = body, maybe
    lines = [f"> {part}" if part else ">" for part in text.split("\n")]
    if attr:
        lines.append(">")
        lines.append(f"> — {attr}")
    return "\n".join(lines)


def extract_chrome(raw: str) -> str:
    headers = re.findall(r"<header\b[^>]*>(.*?)</header>", raw, re.S | re.I)
    footers = re.findall(r"<footer\b[^>]*>(.*?)</footer>", raw, re.S | re.I)
    parts: list[str] = []
    if headers:
        parts.append("## Header")
        parts.append("")
        parts.append(extract_simple_links(headers[0]))
        parts.append("")
    if footers:
        # Review cards also use <footer>; the site chrome footer is the last one.
        parts.append("## Footer")
        parts.append("")
        parts.append(extract_simple_links(footers[-1]))
        parts.append("")
    return "\n".join(parts).strip() + "\n"


def extract_simple_links(fragment: str) -> str:
    parser = PageExtractor({})
    parser.capture_root = True
    parser.seen_main_or_root = True
    parser.feed(f"<main>{fragment}</main>")
    parser.flush_block()
    return blocks_to_markdown(parser.blocks, {}).strip()


def separate_adjacent_links(md: str) -> str:
    """Keep consecutive CTAs on their own lines instead of gluing labels together."""
    return re.sub(r"(\]\([^)]+\))(?=[A-Za-z\[])", r"\1\n\n", md)


def extract_page(raw: str) -> tuple[str, str]:
    faq = faq_map(raw)
    parser = PageExtractor(faq)
    parser.feed(raw)
    parser.flush_block()
    page_md = separate_adjacent_links(blocks_to_markdown(parser.blocks, faq))
    chrome_md = separate_adjacent_links(extract_chrome(raw))
    return page_md, chrome_md


PAGES = [
    {
        "business": "window-dudes",
        "id": "homepage",
        "html": "/tmp/ff-extract/window-dudes/homepage.html",
        "out": "examples/approved-copy/window-dudes/homepage.md",
    },
    {
        "business": "window-dudes",
        "id": "glass-repair",
        "html": "/tmp/ff-extract/window-dudes/glass-repair.html",
        "out": "examples/approved-copy/window-dudes/springfield-glass-repair.md",
    },
    {
        "business": "window-dudes",
        "id": "replacement",
        "html": "/tmp/ff-extract/window-dudes/replacement-window-installation.html",
        "out": "examples/approved-copy/window-dudes/springfield-replacement-window-installation.md",
    },
    {
        "business": "window-dudes",
        "id": "contact",
        "html": "/tmp/ff-extract/window-dudes/contact.html",
        "out": "examples/approved-copy/window-dudes/contact.md",
    },
    {
        "business": "sra",
        "id": "homepage",
        "html": "/tmp/ff-extract/sra-preview/springfield-homepage.html",
        "out": "examples/approved-copy/sra/springfield-homepage.md",
    },
    {
        "business": "sra",
        "id": "replacement",
        "html": "/tmp/ff-extract/sra-preview/springfield-roof-replacement.html",
        "out": "examples/approved-copy/sra/springfield-roof-replacement.md",
    },
    {
        "business": "sra",
        "id": "maintenance",
        "html": "/tmp/ff-extract/sra-preview/springfield-roof-maintenance.html",
        "out": "examples/approved-copy/sra/springfield-roof-maintenance.md",
    },
    {
        "business": "sra",
        "id": "contact",
        "html": "/tmp/ff-extract/sra-preview/springfield-contact.html",
        "out": "examples/approved-copy/sra/springfield-contact.md",
    },
    {
        "business": "greene-planet",
        "id": "homepage",
        "html": "/tmp/ff-extract/greene-planet/homepage.html",
        "out": "examples/approved-copy/greene-planet/homepage.md",
    },
    {
        "business": "greene-planet",
        "id": "inspection",
        "html": "/tmp/ff-extract/greene-planet/mold-inspection-testing.html",
        "out": "examples/approved-copy/greene-planet/springfield-mold-inspection-testing.md",
    },
    {
        "business": "greene-planet",
        "id": "black-mold",
        "html": "/tmp/ff-extract/greene-planet/black-mold-remediation.html",
        "out": "examples/approved-copy/greene-planet/springfield-black-mold-remediation.md",
    },
    {
        "business": "greene-planet",
        "id": "contact",
        "html": "/tmp/ff-extract/greene-planet/contact.html",
        "out": "examples/approved-copy/greene-planet/springfield-contact.md",
    },
]


def main() -> None:
    root = Path("/workspace")
    chrome_by_business: dict[str, str] = {}
    for page in PAGES:
        raw = Path(page["html"]).read_text(encoding="utf-8", errors="replace")
        body, chrome = extract_page(raw)
        out = root / page["out"]
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(body, encoding="utf-8")
        chrome_by_business.setdefault(page["business"], chrome)
        print(f"wrote {out} ({len(body.split())} words)")
    for business, chrome in chrome_by_business.items():
        path = root / f"examples/approved-copy/{business}/_chrome.md"
        path.write_text(chrome, encoding="utf-8")
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
