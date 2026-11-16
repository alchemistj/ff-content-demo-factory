#!/usr/bin/env node
// Saves the FULL visible text of a business's own website pages into the prospect folder,
// so writers work from the real page text, not notes or word counts (Josh / FF Architect, 2026-11-15).
//
// Usage: node scripts/fetch-site-text.mjs <prospect-folder> <site-url> [max-pages]
// Writes <folder>/site/<page>.md (one file per page: URL, title, H1, then the page text) and <folder>/site/INDEX.md.
// Crawls same-site links from the homepage (and one level below), skipping files, anchors and obvious junk.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const [folder, start, maxArg] = process.argv.slice(2);
if (!folder || !start) { console.error("usage: fetch-site-text.mjs <prospect-folder> <site-url> [max-pages]"); process.exit(2); }
const max = Number(maxArg) || 30;
const origin = new URL(start).origin;
// Same site = the start host or any subdomain of its base domain (some builders put pages on services.example.com, contact.example.com).
const baseDomain = new URL(start).hostname.replace(/^www\./, "").split(".").slice(-2).join(".");
const sameSite = (u) => { try { const h = new URL(u).hostname; return h === baseDomain || h.endsWith("." + baseDomain); } catch { return false; } };
const outDir = path.join(folder, "site");
mkdirSync(outDir, { recursive: true });

const norm = (u) => { try { const x = new URL(u, origin); x.hash = ""; x.search = ""; return x.href.replace(/\/$/, ""); } catch { return null; } };
const skip = /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|mp4|mp3)$|\/(wp-admin|wp-login|cart|checkout|my-account|feed|tag|author)\b|mailto:|tel:/i;
const slugOf = (u) => { const x = new URL(u); const sub = x.hostname.replace(/^www\./, "").split(".").slice(0, -2).join("-"); const p = x.pathname.replace(/^\/|\/$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase(); return ([sub, p].filter(Boolean).join("-") || "home").slice(0, 80); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const queue = [norm(start)];
const seen = new Set();
const index = [];
while (queue.length && seen.size < max) {
  const url = queue.shift();
  if (!url || seen.has(url) || !sameSite(url) || skip.test(url)) continue;
  seen.add(url);
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500); // let scripts (e.g. call-tracking number swaps) run, so the text matches what a visitor sees
    const data = await page.evaluate(() => {
      const t = (s) => (s || "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      const main = document.querySelector("main") || document.body;
      return {
        title: document.title,
        h1: [...document.querySelectorAll("h1")].map((h) => h.innerText.trim()).filter(Boolean),
        text: t(main.innerText),
        links: [...document.querySelectorAll("a[href]")].map((a) => a.href),
        tels: [...new Set([...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute("href")))],
      };
    });
    const status = res ? res.status() : 0;
    const slug = slugOf(url);
    const words = data.text.split(/\s+/).filter(Boolean).length;
    writeFileSync(path.join(outDir, `${slug}.md`),
      `# ${url}\n\n- Fetched: ${new Date().toISOString()} (rendered in a real browser)\n- HTTP: ${status}\n- Title: ${data.title}\n- H1: ${data.h1.join(" | ") || "(none)"}\n- tel: links: ${data.tels.join(", ") || "(none)"}\n- Words: ${words}\n\n---\n\n${data.text}\n`);
    index.push(`| ${slug}.md | ${url} | ${status} | ${words} | ${data.title.replace(/\|/g, "/")} |`);
    for (const l of data.links) { const n = norm(l); if (n && sameSite(n) && !seen.has(n) && !skip.test(n)) queue.push(n); }
    console.log(`${status} ${words}w ${url}`);
  } catch (e) {
    index.push(`| (failed) | ${url} | error | 0 | ${String(e.message).slice(0, 60)} |`);
    console.log(`FAIL ${url}: ${e.message}`);
  }
}
await browser.close();
writeFileSync(path.join(outDir, "INDEX.md"),
  `# Full text of the business's own site\n\nFetched ${new Date().toISOString()} from ${origin} by scripts/fetch-site-text.mjs. Writers quote from these files, never from notes.\n\n| File | URL | HTTP | Words | Title |\n|---|---|---|---|---|\n${index.join("\n")}\n`);
console.log(`wrote ${index.length} pages to ${outDir}`);
