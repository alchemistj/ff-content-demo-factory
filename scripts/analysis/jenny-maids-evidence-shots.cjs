// Evidence screenshots for the audit: each broken item, shown in place at desktop width.
// Read-only: loads pages and takes screenshots; submits nothing.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = '/home/user/ff-content-demo-factory/prospects/wichita-cleaning/jenny-maids/audit/screens';
fs.mkdirSync(OUT, { recursive: true });

async function shotText(page, text, file, tag = '*') {
  const loc = page.locator(tag, { hasText: text }).last();
  const n = await loc.count();
  if (!n) return 'not found: ' + text;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  const box = await loc.boundingBox().catch(() => null);
  if (box) {
    await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: Math.max(0, box.y - 60), width: 1440, height: Math.min(260, box.height + 120) } }).catch(() => {});
    return 'ok ' + file;
  }
  return 'no box ' + file;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const res = [];

  // Udall: named in FAQ, no page
  const u = await page.goto('https://jennymaidsict.com/udall-ks/', { waitUntil: 'load', timeout: 60000 });
  res.push('udall status ' + (u && u.status()));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'udall-404.png') });

  // Packages H1 typo
  await page.goto('https://jennymaidsict.com/packages/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);
  res.push(await shotText(page, "Jenny Miad's", 'packages-h1-typo.png', 'h2,h1,p,div'));

  // Wichita page typo
  await page.goto('https://jennymaidsict.com/wichita-ks/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);
  res.push(await shotText(page, 'Ocassions', 'wichita-typo-ocassions.png', 'p,div,li'));

  // Home: First Time Cleaning / Click To Call with no link
  await page.goto('https://jennymaidsict.com/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);
  res.push(await shotText(page, 'Click To Call - Get Your Discount', 'home-click-to-call-unlinked.png', 'div,p,span'));
  res.push(await shotText(page, 'FIRST TIME CLEANING', 'home-first-time-cleaning.png', 'div,h2,h3,p,span'));

  // Home: services "#" menu items opening dropdowns (desktop, hover state not needed)
  // Contact page form (captcha question visible; not submitted)
  await page.goto('https://jennymaidsict.com/contact-us/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);
  res.push(await shotText(page, '= ', 'contact-form-math-captcha.png', 'p,div'));

  // Contact page: "Get Your Free Quote Today" buttons dial a number (tel: href)
  res.push(await shotText(page, 'Get Your Free Quote Today', 'contact-cta-tel-buttons.png', 'div'));

  // Blog: the 5,184-word weekly vs bi-weekly post repeats headings (check repeated heading text)
  await page.goto('https://jennymaidsict.com/2026/08/25/weekly-vs-bi-weekly-house-cleaning/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);
  const repeats = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('h2,h3')].filter((h) => h.offsetWidth && h.offsetHeight).map((h) => (h.innerText || '').trim());
    const counts = {};
    heads.forEach((h) => { counts[h] = (counts[h] || 0) + 1; });
    return Object.entries(counts).filter(([, n]) => n > 1);
  });
  res.push('blog repeated visible headings: ' + JSON.stringify(repeats));
  await page.screenshot({ path: path.join(OUT, 'blog-weekly-vs-biweekly-top.png') });

  // Category link (not in the menu) status
  const cat = await page.goto('https://jennymaidsict.com/category/uncategorized/', { waitUntil: 'load', timeout: 60000 }).catch(() => null);
  res.push('category/uncategorized status ' + (cat ? cat.status() : 'nav-error'));

  await browser.close();
  for (const r of res) console.log(r);
})().catch((e) => { console.error('EVIDENCE FAILED', e); process.exit(1); });
