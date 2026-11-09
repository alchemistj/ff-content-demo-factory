// Final Jenny Maid's checks: (1) every internal href seen on any crawled page, and whether it was visited;
// (2) horizontal page overflow at phone width; (3) hours, address and service-area wording across pages;
// (4) whether a page-speed tool is installed locally. Read-only.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const OUT = '/home/user/ff-content-demo-factory/prospects/wichita-cleaning/jenny-maids/audit/data';
const crawl = JSON.parse(fs.readFileSync(path.join(OUT, 'crawl.json'), 'utf8'));
const pt = JSON.parse(fs.readFileSync(path.join(OUT, 'page-text.json'), 'utf8'));

(async () => {
  // (1) internal hrefs
  const visited = new Set(Object.keys(crawl.pages).map((u) => u.replace('https://jennymaidsict.com', '')));
  const seen = new Map();
  for (const [u, p] of Object.entries(crawl.pages)) {
    for (const l of (p.desktop.links || [])) {
      const h = l.href || '';
      let path1 = null;
      if (h.startsWith('https://jennymaidsict.com/')) path1 = h.replace('https://jennymaidsict.com', '').split('#')[0] || '/';
      else if (h.startsWith('/')) path1 = h.split('#')[0] || '/';
      else if (h === '#' || h === '') path1 = h;
      if (path1 === null) continue;
      if (!seen.has(path1)) seen.set(path1, new Set());
      seen.get(path1).add(l.text.slice(0, 30));
    }
  }
  const notVisited = [...seen.keys()].filter((k) => k && !visited.has(k) && k !== '#');
  console.log('== internal hrefs seen on crawled pages that were not visited:', JSON.stringify(notVisited));
  console.log('== "#" link texts:', JSON.stringify([...(seen.get('#') || [])]));
  console.log('== external hosts:', JSON.stringify([...new Set([...seen.keys()].filter((k) => /^https?:/.test(k)))]));

  // (2) horizontal overflow at 390 px
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const overflow = {};
  for (const p of ['/', '/deep-cleaning/', '/wichita-ks/', '/contact-us/', '/packages/']) {
    await page.goto('https://jennymaidsict.com' + p, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1000);
    overflow[p] = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
  }
  await browser.close();
  console.log('== phone overflow (scrollWidth vs clientWidth):', JSON.stringify(overflow));

  // (3) hours / address / service-area wording
  const re = /(hours?|open|closed|mon(day)?|sat(urday)?|sun(day)?|address|meridian|suite|street|\bSt\b|\bAve\b|Mulvane|Haysville|Udall|Benton|Rose Hill|Sedgwick)/i;
  console.log('== hours/address/area wording by page (lines):');
  for (const [p, t] of Object.entries(pt)) {
    if (t.status !== 200) continue;
    const hits = [...new Set(t.text.split('\n').map((l) => l.trim()).filter((l) => re.test(l) && l.length < 200))];
    if (hits.length) console.log(p, JSON.stringify(hits.slice(0, 6)));
  }

  // (4) page-speed tooling
  const tools = ['lighthouse', 'pagespeed', '@axe-core/playwright'];
  const found = {};
  for (const t of tools) {
    try { found[t] = require.resolve(t); } catch (e) { found[t] = 'not installed'; }
  }
  console.log('== speed tooling:', JSON.stringify(found));
})().catch((e) => { console.error('FINAL CHECKS FAILED', e); process.exit(1); });
