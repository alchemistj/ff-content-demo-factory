// Probe placeholder text visibility, empty headings, copyright line and truncated paragraphs.
// Usage: node ramco-probe.cjs <outJson>
const { chromium } = require('playwright');
const fs = require('fs');

const ORIGIN = 'https://ramcowichita.com';
const PAGES = ['/', '/testimonials/', '/leadership-team/', '/about/', '/contact/'];
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};
const NEEDLE = /Lorem|John Doe|Featured Vendors|Title, Company|Curabitur|Partners Info/i;

const PROBE = (needleSource) => {
  const needle = new RegExp(needleSource, 'i');
  const isShown = (el) => {
    let n = el;
    while (n && n.nodeType === 1) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
      n = n.parentElement;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const hidAncestor = (el) => {
    let n = el;
    while (n && n.nodeType === 1) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return n.tagName + '.' + String(n.className).slice(0, 60);
      n = n.parentElement;
    }
    return '';
  };
  const found = [];
  const all = [...document.querySelectorAll('body *')];
  for (const el of all) {
    // Only leaf-ish text holders, to avoid reporting every ancestor.
    const own = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' ');
    if (!needle.test(own)) continue;
    found.push({
      tag: el.tagName,
      cls: String(el.className).slice(0, 80),
      text: own.replace(/\s+/g, ' ').trim().slice(0, 160),
      visible: isShown(el),
      hiddenBy: hidAncestor(el),
    });
  }
  const emptyHeadings = [...document.querySelectorAll('h1,h2,h3,h4')]
    .filter((h) => !(h.innerText || h.textContent || '').trim())
    .map((h) => h.tagName + ' ' + String(h.className).slice(0, 60));
  const hiddenHeadings = [...document.querySelectorAll('h2,h3')]
    .filter((h) => (h.innerText || '').trim() && !isShown(h))
    .map((h) => h.tagName + ': ' + h.innerText.trim().slice(0, 100));
  const paras = [...document.querySelectorAll('p, li, h2, h3, h4')]
    .filter((p) => isShown(p))
    .map((p) => (p.innerText || '').replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 40 && !/[.!?:)"”’]$/.test(t))
    .map((t) => t.slice(-110));
  const copy = [...document.querySelectorAll('body *')]
    .filter((el) => el.childNodes.length && [...el.childNodes].some((c) => c.nodeType === 3 && /©|copyright/i.test(c.textContent)))
    .map((el) => (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160))
    .filter((t) => t.length);
  return { found, emptyHeadings, hiddenHeadings, truncatedCandidates: paras.slice(0, 40), copy: [...new Set(copy)].slice(0, 10) };
};

(async () => {
  const outPath = process.argv[2];
  const browser = await chromium.launch();
  const out = {};
  for (const vpName of Object.keys(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: VIEWPORTS[vpName] });
    const page = await ctx.newPage();
    out[vpName] = {};
    for (const p of PAGES) {
      try {
        await page.goto(ORIGIN + p, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(2500);
        out[vpName][p] = await page.evaluate(PROBE, NEEDLE.source);
        if (vpName === 'desktop' && p === '/') {
          await page.screenshot({ path: outPath + '.home-desktop-probe.png', fullPage: false });
        }
      } catch (e) {
        out[vpName][p] = { error: String(e.message).slice(0, 200) };
      }
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('done');
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
