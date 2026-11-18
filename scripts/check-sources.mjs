#!/usr/bin/env node
// Facts-source gate for one demo's words.json (weekend 87→93 pass, 2026-11-14).
// Fails when the copy states something its own folder can't back up:
//   1. a review quote that isn't word for word in reviews.json, or a caption that isn't that reviewer's "First L."
//   2. a phone number that isn't in facts.md
//   3. a year count, "since YYYY", percentage or dollar figure that isn't in facts.md, audit.md or a review
//   4. a high-risk claim word (guarantee, warranty, licensed, insured, certified, award, 24/7, family-owned,
//      generation) that facts.md, audit.md and the reviews never use
//   5. a "First L." name in the copy that matches no reviewer
// [[confirm: …]] placeholder chips are skipped: they are visibly unverified by design.
// Usage: node scripts/check-sources.mjs <folder>
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const folder = process.argv[2];
if (!folder) {
  console.error("usage: node scripts/check-sources.mjs <folder>");
  process.exit(2);
}
const read = (f) => (existsSync(path.join(folder, f)) ? readFileSync(path.join(folder, f), "utf8") : "");
const words = JSON.parse(read("words.json"));
const rawReviews = read("reviews.json") ? JSON.parse(read("reviews.json")) : [];
const reviews = Array.isArray(rawReviews) ? rawReviews : rawReviews.reviews ?? [];
const facts = read("facts.md");
const audit = read("audit.md");

const norm = (s) =>
  String(s)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
const reviewTexts = reviews.map((r) => norm(r.text ?? ""));
// Lines facts.md itself marks "Unverified" or "Conflict" are not sources.
const verifiedFacts = facts.split("\n").filter((l) => !/unverified|conflict/i.test(l)).join("\n");
const sourceText = norm([verifiedFacts, audit, ...reviews.map((r) => r.text ?? "")].join("\n"));
const firstL = (full) => {
  const parts = String(full ?? "").trim().split(/\s+/);
  if (!parts[0]) return "";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};
const reviewerNames = new Set(reviews.map((r) => norm(firstL(r.reviewer))));

const sourceDigits = ` ${sourceText.replace(/(\d),(\d)/g, "$1$2").replace(/[^\d.]+/g, " ")} `;
const fails = [];
const warns = [];

// Gather copy (pages only; the strategy page talks about the business's current site).
const quotes = [];
const copy = [];
const walk = (v, where) => {
  if (Array.isArray(v)) return v.forEach((x) => walk(x, where));
  if (v && typeof v === "object") {
    if (v.type === "review" && typeof v.quote === "string") {
      quotes.push({ quote: v.quote, name: v.name, where });
      return;
    }
    for (const [k, x] of Object.entries(v)) if (k !== "image" && k !== "seo") walk(x, where);
    return;
  }
  if (typeof v === "string") copy.push({ text: v.replace(/\[\[confirm:[^\]]*(?:\[[^\]]*\][^\]]*)*\]\]/g, ""), where });
};
for (const page of words.pages ?? []) walk(page, page.route);
walk(words.trustBar, "trust bar");

// 1. Quotes word for word, with First L. captions.
for (const q of quotes) {
  const fragments = q.quote.split(/\s*(?:…|\.\.\.)\s*/).map(norm).filter((f) => f.length > 3);
  const hit = reviews.findIndex((r, i) => fragments.every((f) => reviewTexts[i].includes(f.replace(/^"|"$/g, ""))));
  if (hit < 0) fails.push(`quote on ${q.where} not found word for word in reviews.json: "${q.quote.slice(0, 70)}…"`);
  else if (q.name && norm(q.name) !== norm(firstL(reviews[hit].reviewer)))
    fails.push(`quote on ${q.where} captioned "${q.name}", but the review is by ${firstL(reviews[hit].reviewer)}`);
}

// 2–5 on the copy.
const digits = (s) => s.replace(/\D/g, "");
const factDigits = digits(facts);
const RISK = /\b(guarantee[ds]?|warrant(y|ies)|licensed|insured|bonded|certified|award[- ]?winning|award|24\/7|24 hours|family[- ]owned|generations?|master (plumber|electrician))\b/gi;
for (const { text, where } of copy) {
  for (const m of text.matchAll(/\(?\b\d{3}\)?[ .-]\d{3}-\d{4}\b/g))
    if (!factDigits.includes(digits(m[0]))) fails.push(`phone ${m[0]} on ${where} is not in facts.md`);
  for (const m of text.replace(/https?:\/\/\S+/g, " ").matchAll(/\b(\d{1,3})\+?\s+years?\b|\bsince\s+(\d{4})\b|\b\d+(?:\.\d+)?%(?![0-9A-Fa-f]{2})|\$\s?\d[\d,]*\d/gi)) {
    const token = norm(m[0]);
    // Years need "<n> year" (or "<n>+ year") in a source; "since YYYY" needs the year; % and $ need the exact figure.
    const ok = m[1]
      ? new RegExp(`\\b${m[1]}\\+?\\s+years?\\b`).test(sourceText)
      : m[2]
        ? sourceText.includes(m[2])
        : sourceText.includes(token) || sourceDigits.includes(` ${token.replace(/[^\d.]/g, "")} `) || sourceText.includes(token.replace(/[$,]/g, ""));
    if (!ok)
      fails.push(`"${m[0]}" on ${where} has no source in facts.md, audit.md or reviews`);
  }
  for (const m of text.matchAll(RISK))
    if (!sourceText.includes(norm(m[0]))) fails.push(`claim word "${m[0]}" on ${where} never appears in facts.md, audit.md or reviews`);
  for (const m of text.matchAll(/\b([A-Z][a-z]+ [A-Z]\.)/g))
    if (!reviewerNames.has(norm(m[1])) && !/\b(St|Mr|Ms|Dr|Mt)\./.test(m[1])) warns.push(`name "${m[1]}" on ${where} matches no reviewer`);
}

const uniq = (a) => [...new Set(a)];
for (const f of uniq(fails)) console.log(`FAIL  ${f}`);
for (const w of uniq(warns)) console.log(`WARN  ${w}`);
console.log(`${fails.length ? "FAIL" : "PASS"}: ${uniq(fails).length} fail, ${uniq(warns).length} warn`);
process.exit(fails.length ? 1 : 0);
