#!/usr/bin/env node
// Writes <folder>/pages/<name>.md from <folder>/words.json, so the readable pages match the words after edits made in JSON.
// The reverse of page-to-words.mjs, in the same Markdown shape.
// Usage: node scripts/words-to-pages.mjs <prospect folder>
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: words-to-pages.mjs <prospect folder>"); process.exit(2); }
const words = JSON.parse(fs.readFileSync(path.join(dir, "words.json"), "utf8"));
const nameFor = (p) => p.role === "home" ? "home" : p.route.replace(/^\/|\/$/g, "").replace(/-wichita-ks$/, "") || "home";
const out = [];
const para = (t) => out.push(t, "");
for (const p of words.pages) {
  out.length = 0;
  const h = p.hero || {};
  if (h.eyebrow) para(`**Eyebrow:** ${h.eyebrow}`);
  para(`# ${h.h1}`);
  if (h.sub) para(h.sub);
  const btns = [h.primaryCta?.label, h.secondaryCta?.label].filter(Boolean);
  if (btns.length) para(`**Buttons:** ${btns.join(" | ")}`);
  for (const s of p.sections || []) {
    if (s.type === "review") { out.push(`> "${s.quote}"`, `> — ${s.name}`, ""); continue; }
    if (s.heading) para(`## ${s.heading}`);
    if (s.type === "services") {
      for (const sv of words.services || []) out.push(`- **${sv.name || sv.title}.** ${sv.blurb || ""}`);
      out.push("");
      continue;
    }
    for (const b of s.body || []) para(b);
    if (s.list) { for (const li of s.list) out.push(`- ${li}`); out.push(""); }
    if (s.type === "steps") { (s.items || []).forEach((it, i) => out.push(`${i + 1}. **${it.title}** ${it.text}`)); out.push(""); continue; }
    if (s.type === "faq") { for (const it of s.items || []) { para(`**${it.q}**`); para(it.a); } continue; }
    for (const it of s.items || []) { if (it.title) para(`**${it.title}** ${it.text}`); }
    for (const b of s.tail || []) para(b);
    if (s.text) para(s.text);
    if (s.link) para(`[${s.link.label} →](${s.link.href || s.link.route})`);
  }
  fs.writeFileSync(path.join(dir, "pages", `${nameFor(p)}.md`), out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n");
  console.log(`wrote pages/${nameFor(p)}.md`);
}
