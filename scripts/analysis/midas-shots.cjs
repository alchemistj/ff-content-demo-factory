// Screenshots for the Midas audit: every main page at both viewports, plus evidence for each broken thing.
// Usage: node midas-shots.cjs <shotDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://www.midasmaidservice.com';
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};
const PAGES = [['home', '/'], ['about', '/about'], ['services', '/services'], ['portfolio', '/portfolio'], ['contactus', '/contactus']];

(async () => {
  const dir = process.argv[2];
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const log = [];
  const shot = async (page, file, opts = {}) => {
    await page.screenshot({ path: path.join(dir, file), fullPage: !!opts.full });
    log.push(file);
  };

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    for (const [name, p] of PAGES) {
      await page.goto(ORIGIN + p, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3000);
      await shot(page, name + '-' + vpName + '.png', { full: true });
    }
    // Broken: footer icon and Services "Book Today" both point to /contact (404).
    await page.goto(ORIGIN + '/services', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    const bookToday = page.getByRole('link', { name: /book today/i }).first();
    if (await bookToday.count()) {
      await bookToday.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await bookToday.click({ timeout: 5000 }).catch((e) => log.push('book today click failed ' + e.message.slice(0, 80)));
      await page.waitForTimeout(3000);
      log.push('book today landed ' + page.url());
      await shot(page, 'broken-services-book-today-' + vpName + '.png', { full: true });
    }
    // Direct /contact 404 (what the footer icon link and Book Today both reach).
    await page.goto(ORIGIN + '/contact', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    await shot(page, 'broken-contact-404-' + vpName + '.png', { full: true });

    // Footer icon link to /contact (no visible text).
    await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    const footIcon = page.locator('footer a[href="/contact"]').first();
    if (await footIcon.count()) {
      await footIcon.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      const box = await footIcon.boundingBox();
      log.push(vpName + ' footer /contact icon box ' + JSON.stringify(box));
      await shot(page, 'broken-footer-contact-icon-' + vpName + '.png');
    } else {
      log.push(vpName + ' footer /contact icon not found');
    }

    // Testimonial attributed to "Danielle R." (text is Carla B.'s review).
    await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    const danielle = page.getByText('Danielle R.', { exact: true }).first();
    if (await danielle.count()) {
      await danielle.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      const visible = await danielle.isVisible();
      log.push(vpName + ' Danielle R. attribution visible=' + visible);
      await shot(page, 'broken-testimonial-danielle-' + vpName + '.png');
    }
    await ctx.close();
  }

  // Contact form (not submitted): show fields and the invisible reCAPTCHA badge.
  const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop });
  const page = await ctx.newPage();
  await page.goto(ORIGIN + '/contactus', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);
  const form = page.locator('form').first();
  if (await form.count()) {
    await form.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await shot(page, 'contact-form-desktop.png');
  }
  await ctx.close();
  await browser.close();
  console.log(log.join('\n'));
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
