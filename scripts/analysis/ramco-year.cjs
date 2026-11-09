// Read the footer copyright year as rendered in a browser, on several pages. Read-only.
// Usage: node ramco-year.cjs
const { chromium } = require('playwright');

const PAGES = ['/', '/about/', '/testimonials/', '/commercial-cleaning-services/windows/', '/commercial-cleaning-services/disinfection/', '/blog/window-washing-frequency/'];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  for (const p of PAGES) {
    await page.goto('https://ramcowichita.com' + p, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      const y = document.getElementById('full-year');
      const c = document.querySelector('.copyright');
      return { fullYear: y ? y.textContent : '(no span)', copyright: c ? c.textContent.replace(/\s+/g, ' ').trim() : '(no .copyright)' };
    });
    console.log(p, JSON.stringify(r));
  }
  await browser.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
