// Step the homepage testimonial carousel until the slide whose quote is "nothing like coming home" is visible,
// then screenshot it at both viewports. Usage: node midas-carousel.cjs <shotDir>
const { chromium } = require('playwright');
const path = require('path');

const ORIGIN = 'https://www.midasmaidservice.com/';
const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };

(async () => {
  const dir = process.argv[2];
  const browser = await chromium.launch();
  const log = [];
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    const quote = page.getByText('nothing like coming home', { exact: false }).first();
    const next = page.locator('button[aria-label*="ext" i], [class*="next"] button, [class*="arrow-right"], button[class*="right"]').first();
    let found = false;
    for (let i = 0; i < 8 && !found; i++) {
      if (await quote.count()) {
        const bb = await quote.boundingBox();
        if (bb && bb.width > 0) {
          found = true;
          break;
        }
      }
      if (await next.count()) {
        await next.click({ timeout: 3000 }).catch((e) => log.push(vpName + ' next click failed ' + e.message.slice(0, 80)));
        await page.waitForTimeout(1200);
      } else {
        log.push(vpName + ' no next control found');
        break;
      }
    }
    if (found) {
      await quote.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      const slide = page.locator('section, div').filter({ hasText: 'nothing like coming home' }).last();
      await page.screenshot({ path: path.join(dir, 'broken-testimonial-carla-text-under-danielle-' + vpName + '.png'), fullPage: false });
      log.push(vpName + ' screenshot saved (quote visible)');
    } else {
      log.push(vpName + ' quote not found in carousel');
    }
    await ctx.close();
  }
  await browser.close();
  console.log(log.join('\n'));
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
