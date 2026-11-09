#!/usr/bin/env node
// Checks hand-written Markdown pages for hard failures only (Josh, 2026-11-09: spirit of the law; taste is the editor's job).
// Usage: node scripts/check-page.mjs prospects/<market>/<slug> [pages/home.md ...]
// With no page arguments, checks every .md file in <folder>/pages/.
// FAIL: a quote not word for word in a five-star review, a bad attribution, a review used twice on a page,
//       a homepage H1 that breaks the formula, or a page thinner than its minimum.
// WARN (look, then use judgment): long paragraphs, "customers tell us/describe" sentences.
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: check-page.mjs <prospect folder> [page.md ...]"); process.exit(2); }
let files = process.argv.slice(3);
if (!files.length) {
  const pd = path.join(dir, "pages");
  files = fs.existsSync(pd) ? fs.readdirSync(pd).filter((f) => f.endsWith(".md")).map((f) => path.join("pages", f)) : [];
}
const reviews = JSON.parse(fs.readFileSync(path.join(dir, "reviews.json"), "utf8")).reviews || [];
const n = (s) => String(s || "").replace(/<br\s*\/?>/g, " ").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
const words = (s) => (n(s).match(/\S+/g) || []).length;
const MIN = { home: 900, service: 700, contact: 150 };
let fails = 0, warns = 0;
const fail = (m) => { fails++; console.log(`FAIL  ${m}`); };
const warn = (m) => { warns++; console.log(`WARN  ${m}`); };

for (const f of files) {
  const p = path.isAbsolute(f) ? f : path.join(dir, f);
  const md = fs.readFileSync(p, "utf8");
  const role = /home/i.test(path.basename(p)) ? "home" : /contact/i.test(path.basename(p)) ? "contact" : "service";
  console.log(`\n# ${f} (${role})`);
  // quotes: a block of "> " lines ending with "> — Name"
  const used = new Set();
  const blocks = md.split(/\n\s*\n/);
  for (const b of blocks) {
    const lines = b.split("\n");
    if (!lines.every((l) => l.startsWith(">"))) continue;
    const by = lines.map((l) => l.replace(/^>\s?/, "")).find((l) => /^[—-]{1,2}\s/.test(l));
    if (!by) continue;
    const name = by.replace(/^[—-]{1,2}\s*/, "").trim();
    const quote = n(lines.map((l) => l.replace(/^>\s?/, "")).filter((l) => !/^[—-]{1,2}\s/.test(l)).join(" ")).replace(/^"|"$/g, "");
    if (!/^[A-Z][a-zA-Z'-]+ [A-Z]\.$/.test(name)) fail(`review name "${name}" must be First L.`);
    const parts = quote.split(/\s*(?:…|\.\.\.)\s*/).filter(Boolean);
    const hit = reviews.find((r) => r.rating === 5 && n(r.reviewer) === n(name) && parts.every((pt) => n(r.text).includes(pt)));
    if (!hit) fail(`quote from ${name} is not word for word in a five-star review: "${quote.slice(0, 60)}…"`);
    else if (used.has(hit.id)) fail(`review from ${name} used twice on this page`);
    else used.add(hit.id);
  }
  console.log(`info  ${used.size} review quote(s), all word for word`);
  // homepage H1
  if (role === "home") {
    const main = md.includes("\n---\n") ? md.split("\n---\n").slice(1).join("\n") : md;
    const h1 = (main.match(/^# (.+)$/m) || [])[1] || "";
    if (!/^[A-Z][\w&' -]+ in [A-Z][\w .'-]+, [A-Z]{2} — .+/.test(h1)) fail(`homepage H1 must be "[Company Type] in [City, ST] — [Business]": "${h1}"`);
  }
  // the top of the page ends in a call to action (Josh, 2026-11-09)
  {
    const main = md.includes("\n---\n") ? md.split("\n---\n").slice(1).join("\n") : md;
    const top = main.split(/\n(?=> |## )/)[0];
    if (!/^\*\*Buttons:\*\*\s*\S.*\|\s*\S/m.test(top)) fail(`the top of the page needs its two buttons on one line: **Buttons:** Call (xxx) xxx-xxxx | Get a Free Estimate`);
    const paras = top.split(/\n\s*\n/).map((x) => x.trim()).filter((x) => x && !/^(#|\*\*Eyebrow|\*\*Buttons|`)/.test(x));
    if (paras.length > 1) warn(`the top of the page has ${paras.length} paragraphs; keep one, so the buttons stay on a phone's first screen`);
  }
  // copy length: everything except quotes, headings' markup, links and the internal note above "---"
  const body = (md.includes("\n---\n") ? md.split("\n---\n").slice(1).join("\n") : md)
    .split("\n").filter((l) => !l.startsWith(">") && !/^\*\(.*\)\*$/.test(l.trim())).join("\n")
    .replace(/`\[[^\]]*\]`/g, "").replace(/^\*\*Buttons:\*\*.*$/gm, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const count = words(body.replace(/^#+\s*/gm, ""));
  if (count < MIN[role]) fail(`about ${count} words of copy, too thin (minimum ${MIN[role]}; reviews, menus and footer don't count)`);
  else console.log(`info  about ${count} words of copy (minimum ${MIN[role]})`);
  // paragraphs
  for (const para of body.split(/\n\s*\n/)) {
    const t = para.trim();
    if (!t || /^(#|[-*] |\d+\. |\*\*[^*]+\*\*$)/.test(t)) continue;
    const sentences = n(t).split(/(?<=[.!?])\s+(?=[A-Z"])/).length;
    if (sentences > 3 || words(t) > 60) warn(`long paragraph (${sentences} sentences, ${words(t)} words); break it where the thought turns: "${n(t).slice(0, 60)}…"`);
  }
  for (const m of md.matchAll(/\b(customers|homeowners|clients) (tell|told|say|said|describe)\b|\bone customer\b|\byour reviews (say|mention)\b/gi)) warn(`"${m[0]}": state the benefit in our voice and let the review prove it`);
}
console.log(`\n${fails ? "FAIL" : "PASS"}: ${fails} fail, ${warns} warn`);
process.exit(fails ? 1 : 0);
