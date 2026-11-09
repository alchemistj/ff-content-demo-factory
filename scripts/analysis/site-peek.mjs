// Quick qualification peek: title, H1, internal link count, service words, text sample.
// Usage: node scripts/analysis/site-peek.mjs <url> [<url> ...]
const { chromium } = require_playwright();
function require_playwright() {
  // eslint-disable-next-line no-undef
  return (await_import());
}
function await_import() {
  const { createRequire } = process.getBuiltinModule('module');
  return createRequire(import.meta.url)('playwright');
}

const urls = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
for (const url of urls) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => {
      const host = location.hostname;
      const links = [...document.querySelectorAll('a[href]')].map(a => a.href.split('#')[0]).filter(h => { try { return new URL(h).hostname === host; } catch { return false; } });
      const uniq = [...new Set(links)];
      const txt = document.body.innerText.replace(/\s+/g, ' ');
      const low = txt.toLowerCase();
      const words = ['roof replacement', 'roof repair', 'hail', 'storm', 'insurance', 'siding', 'gutter', 'window', 'commercial', 'remodel', 'deck', 'gaf', 'owens corning', 'certainteed', 'malarkey', 'family', 'owner', 'locations', 'since'];
      return {
        final: location.href,
        title: document.title,
        h1: [...document.querySelectorAll('h1')].map(h => h.innerText.trim()).slice(0, 3),
        pages: uniq.length,
        nav: uniq.slice(0, 25).map(u => u.replace(location.origin, '')),
        hits: words.filter(w => low.includes(w)),
        tels: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')).slice(0, 5),
        words: txt.split(' ').length,
        sample: txt.slice(0, 500),
      };
    });
    console.log(JSON.stringify({ url, ...info }));
  } catch (e) {
    console.log(JSON.stringify({ url, error: String(e).slice(0, 200) }));
  }
  await page.close();
}
await browser.close();
