#!/usr/bin/env node
// Converts a hand-written Markdown page into a words.json page entry (Josh, 2026-11-09: write pages as pages, convert later).
// Usage: node scripts/page-to-words.mjs <prospect folder> <page.md> <route> [--write]
// Without --write it prints the page JSON. With --write it replaces the page with that route in <folder>/words.json,
// keeping its role, navLabel, keyword and hero image.
//
// Markdown shape (as in examples/approved-copy/evolve-exteriors/homepage.md):
//   **Eyebrow:** text            -> hero.eyebrow
//   # H1                         -> hero.h1
//   first paragraph after H1     -> hero.sub
//   `[Label]` buttons            -> ignored (CTAs keep their labels from words.json)
//   > "quote"  /  > — First L.   -> review section
//   ## Heading + paragraphs, a bullet list, more paragraphs, a [label →](/route/) line -> prose section (body, list, tail, link)
//   ## Heading + "1. **Title.** text" items  -> steps
//   ## Heading + "**Question?**" then answer -> faq
//   the last ## section          -> callBand
//   anything above a "---" line is an internal note and is skipped; "*(...)*" lines are skipped.
import fs from "node:fs";
import path from "node:path";

const [dir, file, route, flag] = process.argv.slice(2);
if (!dir || !file || !route) { console.error("usage: page-to-words.mjs <folder> <page.md> <route> [--write]"); process.exit(2); }
let md = fs.readFileSync(path.isAbsolute(file) ? file : path.join(dir, file), "utf8");
if (md.includes("\n---\n")) md = md.split("\n---\n").slice(1).join("\n---\n");
const clean = (s) => s.replace(/\s+/g, " ").trim();
const blocks = md.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).filter((b) => !/^\*\(.*\)\*$/.test(b));

const hero = {};
const sections = [];
let cur = null;
let i = 0;
for (; i < blocks.length; i++) {
  const b = blocks[i];
  const eb = b.match(/^\*\*Eyebrow:\*\*\s*(.+)$/);
  if (eb) { hero.eyebrow = clean(eb[1]); continue; }
  const h1 = b.match(/^# (.+)$/);
  if (h1) { hero.h1 = clean(h1[1]); continue; }
  const btn = b.match(/^\*\*Buttons:\*\*\s*(.+)$/);
  if (btn) { const [a, c] = btn[1].split("|").map((x) => clean(x)); hero.primaryCta = { label: a, action: "call" }; if (c) hero.secondaryCta = { label: c, action: "contact" }; continue; }
  if (/^`\[/.test(b)) continue;
  if (hero.h1 && !hero.sub && !b.startsWith(">") && !b.startsWith("#")) { hero.sub = clean(b); continue; }
  break;
}
const flush = () => { if (cur) sections.push(cur); cur = null; };
for (; i < blocks.length; i++) {
  const b = blocks[i];
  if (b.startsWith(">")) {
    const lines = b.split("\n").map((l) => l.replace(/^>\s?/, ""));
    const by = lines.find((l) => /^[—-]{1,2}\s/.test(l));
    const quote = clean(lines.filter((l) => l !== by).join(" ")).replace(/^"|"$/g, "");
    flush();
    sections.push({ type: "review", quote, name: by.replace(/^[—-]{1,2}\s*/, "").trim() });
    continue;
  }
  if (/^\*\*Buttons:\*\*/.test(b)) continue; // a closing Buttons line: the call band reuses the hero CTAs
  const h2 = b.match(/^## (.+)$/);
  if (h2) { flush(); cur = { type: "prose", heading: clean(h2[1]), body: [] }; continue; }
  if (!cur) cur = { type: "prose", body: [] };
  if (/^\d+\. /.test(b)) {
    cur.type = "steps";
    cur.items = b.split(/\n(?=\d+\. )/).map((it) => {
      const m = it.replace(/^\d+\.\s*/, "").match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
      return m ? { title: clean(m[1]), text: clean(m[2]) } : { text: clean(it.replace(/^\d+\.\s*/, "")) };
    });
    delete cur.body;
    continue;
  }
  const qa = b.match(/^\*\*(.+\?)\*\*\s*\n([\s\S]+)$/);
  if (qa) { cur.type = "faq"; cur.items = cur.items || []; cur.items.push({ q: clean(qa[1]), a: clean(qa[2]) }); delete cur.body; continue; }
  if (/^[-*] /.test(b)) { cur.list = b.split(/\n(?=[-*] )/).map((l) => clean(l.replace(/^[-*]\s*/, ""))); continue; }
  const link = b.match(/^\*{0,2}\[([^\]]+)\]\(([^)]+)\)\*{0,2}$/);
  if (link) { cur.link = { label: clean(link[1]), route: link[2] }; continue; }
  const txt = clean(b);
  if (cur.type === "faq" && cur.items?.length) { cur.items[cur.items.length - 1].a += " " + txt; continue; } // a two-paragraph FAQ answer
  if (cur.type === "steps") { (cur.tail = cur.tail || []).push(txt); continue; }
  if (cur.list) (cur.tail = cur.tail || []).push(txt); else (cur.body = cur.body || []).push(txt);
}
flush();
// last section becomes the call band
const last = sections[sections.length - 1];
if (last && last.type === "prose") sections[sections.length - 1] = { type: "callBand", heading: last.heading, text: last.body.join(" ") };
for (const s of sections) if (s.body && !s.body.length) delete s.body;

const words = JSON.parse(fs.readFileSync(path.join(dir, "words.json"), "utf8"));
const idx = words.pages.findIndex((p) => p.route === route);
const old = idx >= 0 ? words.pages[idx] : {};
// Keep the old page's section photos: put them on the new page's 1st and 3rd text sections, as photo-and-text splits.
// First keep each photo on the section with the same heading; only photos whose heading is gone fall back to text sections in order.
const leftover = [];
for (const x of (old.sections || []).filter((x) => x.image)) {
  const same = sections.find((y) => y.heading && y.heading === x.heading && (y.type === "prose" || y.type === "split") && !y.image);
  if (same) { same.type = "split"; same.image = x.image; if (x.imageSide) same.imageSide = x.imageSide; } else leftover.push(x.image);
}
const proseIdx = sections.map((x, n) => (x.type === "prose" && x.body?.length && !x.image ? n : -1)).filter((n) => n >= 0);
leftover.forEach((img, k) => { const n = proseIdx[k * 2]; if (n !== undefined) { sections[n].type = "split"; sections[n].image = img; } });
const page = {
  ...old,
  route,
  hero: { ...(old.hero || {}), ...hero },
  sections,
};
if (flag === "--write") {
  if (idx >= 0) words.pages[idx] = page; else words.pages.push(page);
  fs.writeFileSync(path.join(dir, "words.json"), JSON.stringify(words, null, 2) + "\n");
  console.log(`wrote ${route}: ${sections.length} sections (${sections.filter((s) => s.type === "review").length} reviews)`);
} else console.log(JSON.stringify(page, null, 2));
