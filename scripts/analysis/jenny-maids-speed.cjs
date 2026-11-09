// Rough load timings for the Jenny Maid's home and a town page at phone width (390x844), 3 cold loads each.
// No Lighthouse score is available locally; this records the browser's own navigation timing. Read-only.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = '/home/user/ff-content-demo-factory/prospects/wichita-cleaning/jenny-maids/audit/data';

(async () => {
  const browser = await chromium.launch();
  const rows = {};
  for (const p of ['/', '/wichita-ks/', '/packages/']) {
    rows[p] = [];
    for (let i = 0; i < 3; i++) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto('https://jennymaidsict.com' + p, { waitUntil: 'load', timeout: 60000 });
      const t = await page.evaluate(() => {
        const n = performance.getEntriesByType('navigation')[0];
        const imgs = performance.getEntriesByType('resource').filter((r) => r.initiatorType === 'img' || r.initiatorType === 'css' || r.initiatorType === 'script');
        return {
          ttfbMs: Math.round(n.responseStart),
          domContentLoadedMs: Math.round(n.domContentLoadedEventEnd),
          loadMs: Math.round(n.loadEventEnd),
          requests: performance.getEntriesByType('resource').length,
          transferKB: Math.round(performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
          imgs: imgs.filter((r) => r.initiatorType === 'img').length,
        };
      });
      rows[p].push(t);
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'speed.json'), JSON.stringify(rows, null, 2));
  for (const [p, arr] of Object.entries(rows)) console.log(p, JSON.stringify(arr));
})().catch((e) => { console.error('SPEED FAILED', e); process.exit(1); });
