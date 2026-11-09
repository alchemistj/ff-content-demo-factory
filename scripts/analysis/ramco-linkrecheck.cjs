// Re-check the Ramco site's internal and PDF links slowly, to separate real errors from rate limiting.
// Usage: node ramco-linkrecheck.cjs <crawlJson> <outJson>
const fs = require('fs');
const { chromium } = require('playwright');

const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outPath = process.argv[3];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Unique targets: strip fragments so /x/#top and /x/ are one check.
const targets = new Set();
for (const href of Object.keys(data.linkStatus)) {
  const u = new URL(href);
  if (!/ramcowichita\.com$/i.test(u.hostname)) continue;
  u.hash = '';
  targets.add(u.toString());
}
const list = [...targets].filter((u) => !/email-protection/.test(u));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const results = {};
  for (const u of list) {
    let status = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await ctx.request.get(u, { timeout: 30000, maxRedirects: 5 });
        status = r.status();
        if (status !== 429) break;
      } catch (e) {
        status = 'ERR ' + String(e.message).slice(0, 100);
        break;
      }
      await sleep(8000);
    }
    results[u] = status;
    await sleep(1500);
  }
  // Browser check of the footer CTA target and the careers apply anchor.
  const page = await ctx.newPage();
  const browserChecks = {};
  for (const u of ['https://ramcowichita.com/?page_id=31672', 'https://ramcowichita.com/about/careers/#apply']) {
    try {
      const r = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(2000);
      browserChecks[u] = { status: r ? r.status() : null, finalUrl: page.url(), title: await page.title(), h1: await page.evaluate(() => (document.querySelector('h1') || {}).innerText || '') };
      if (u.includes('page_id')) await page.screenshot({ path: outPath + '.page_id.png', fullPage: false });
    } catch (e) {
      browserChecks[u] = 'ERR ' + String(e.message).slice(0, 150);
    }
  }
  await browser.close();
  fs.writeFileSync(outPath, JSON.stringify({ results, browserChecks }, null, 2));
  const summary = {};
  for (const v of Object.values(results)) summary[v] = (summary[v] || 0) + 1;
  console.log('checked', list.length, 'summary', JSON.stringify(summary));
  console.log(JSON.stringify(browserChecks, null, 1));
  for (const [u, v] of Object.entries(results)) if (String(v) !== '200') console.log(v, u);
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
