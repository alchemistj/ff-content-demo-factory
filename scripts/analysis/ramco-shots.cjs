// Capture evidence screenshots for the Ramco audit. Read-only: navigation only.
// Usage: node ramco-shots.cjs <outDir>
const { chromium } = require('playwright');
const path = require('path');

const ORIGIN = 'https://ramcowichita.com';
const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };

(async () => {
  const outDir = process.argv[2];
  const browser = await chromium.launch();
  for (const vp of Object.keys(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: VIEWPORTS[vp] });
    const page = await ctx.newPage();
    await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // 1. Upholstery card, cut off mid-sentence.
    const cut = page.locator('p >> visible=true', { hasText: 'With the right products and methods, we help' }).first();
    if (await cut.count()) {
      const card = cut.locator('xpath=ancestor::*[contains(@class,"av-special-heading") or contains(@class,"flex_column") or contains(@class,"av_textblock_section") or self::section][1]');
      const target = (await card.count()) ? card : cut;
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await target.screenshot({ path: path.join(outDir, vp + '-home-upholstery-cutoff.png') });
    }

    // 2. Footer CTA band with the LEARN MORE link that goes to a 404.
    const band = page.locator('text=Cleaning Wichita, One Building at a Time >> visible=true').first();
    if (await band.count()) {
      await band.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      const box = await band.boundingBox();
      if (box) {
        await page.screenshot({
          path: path.join(outDir, vp + '-home-footer-cta-learnmore-404.png'),
          clip: { x: 0, y: Math.max(0, box.y - 40), width: VIEWPORTS[vp].width, height: 240 },
          fullPage: true,
        });
      }
    }

    // 3. Footer, to show the copyright line with no year in this load.
    const footer = page.locator('footer >> visible=true').first();
    if (await footer.count()) {
      await footer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await footer.screenshot({ path: path.join(outDir, vp + '-home-footer.png') });
    }

    // 4. Top of the homepage: the H1, title area and first screen.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, vp + '-home-first-screen.png'), fullPage: false });

    await ctx.close();
  }
  await browser.close();
  console.log('done');
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
