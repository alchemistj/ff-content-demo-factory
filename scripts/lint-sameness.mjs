#!/usr/bin/env node
// Flags template feel inside ONE demo's words.json: repeated sentences, repeated headings,
// stock label headings, and an eyebrow that repeats the trust bar.
// Usage: node scripts/lint-sameness.mjs <folder>
import { readFileSync } from "node:fs";
import path from "node:path";
const folder = process.argv[2];
const w = JSON.parse(readFileSync(path.join(folder, "words.json"), "utf8"));
const issues = [];
const STOCK = /^(questions before you call|before you call|call us|contact us|what to have ready|hours and area|where we work|where we drive|serving wichita|everything we do|our services|(plumbing|electrical) services in wichita|who answers the phone|discounts and payment|paying and saving|send a request|tell us what'?s (wrong|happening)|why choose us|about us|faq|call (us|now|today)|call \(\d{3}\).*)$/i;
const sentences = new Map();
const headings = new Map();
for (const page of w.pages) {
  const walk = (v, key) => {
    if (typeof v === "string") {
      if (key === "heading") {
        const h = v.trim();
        headings.set(h.toLowerCase(), [...(headings.get(h.toLowerCase()) ?? []), page.route]);
        if (STOCK.test(h)) issues.push(`stock heading on ${page.route}: "${h}"`);
      }
      if (key === "quote" || key === "text" && false) return;
      for (const s of v.split(/(?<=[.!?])\s+/)) {
        const t = s.trim();
        if (t.split(/\s+/).length >= 7) sentences.set(t, [...(sentences.get(t) ?? []), page.route]);
      }
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (k === "image" || k === "seo") continue; walk(x, k); }
  };
  walk(page.hero, ""); walk(page.sections, "");
}
for (const [h, routes] of headings) if (routes.length > 1) issues.push(`heading used ${routes.length}x (${routes.join(", ")}): "${h}"`);
for (const [s, routes] of sentences) if (routes.length > 1) issues.push(`sentence used ${routes.length}x (${[...new Set(routes)].join(", ")}): "${s.slice(0, 90)}"`);
// A customer story told more than twice (quote caption + one retelling) reads as padding.
const nameHits = new Map();
const allText = JSON.stringify(w.pages);
for (const m of allText.matchAll(/\b([A-Z][a-z]+ [A-Z]\.)/g)) nameHits.set(m[1], (nameHits.get(m[1]) ?? 0) + 1);
for (const [n, c] of nameHits) if (c > 2) issues.push(`reviewer "${n}" appears ${c}x across pages (tell each story once)`);
const trust = JSON.stringify(w.trustBar ?? "").toLowerCase();
for (const page of w.pages) {
  const eb = (page.hero?.eyebrow ?? "").toLowerCase();
  const parts = eb.split(/[·|,]/).map((x) => x.trim()).filter((x) => x.length > 3 && x !== "wichita, ks");
  const dup = parts.filter((x) => trust.includes(x));
  if (dup.length >= 2) issues.push(`eyebrow on ${page.route} repeats the trust bar: ${dup.join("; ")}`);
}
console.log(issues.length ? issues.join("\n") : "");
console.log(`${issues.length ? "FAIL" : "PASS"}: ${issues.length} sameness issue(s)`);
process.exit(issues.length ? 1 : 0);
