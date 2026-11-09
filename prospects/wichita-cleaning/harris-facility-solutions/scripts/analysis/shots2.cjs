// Second pass of audit screenshots: the open mobile menu (via the hamburger toggle), the
// response-time claims, the rating claims, and the desktop Services/Maintenance menu.
// Read only. Writes audit/screens/*.png and audit/data/shots2.json.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'audit', 'screens');
const DATA = path.join(ROOT, 'audit', 'data');

async function shotOf(page, text, file) {
  const el = page.getByText(text, { exact: false }).filter({ visible: true }).first();
  if (!(await el.count())) return false;
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await el.boundingBox();
  if (!box) return false;
  // Capture a 900px-wide strip around the claim, so the surrounding section is visible.
  await page.screenshot({
    path: path.join(SHOTS, file),
    clip: { x: 0, y: Math.max(0, box.y - 160), width: 1440, height: 420 },
    fullPage: false,
  });
  return true;
}

(async () => {
  const browser = await chromium.launch();
  const out = {};

  // Mobile: open the hamburger and capture the menu.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto('https://harrisfac.com/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);
    const toggle = page.locator('.elementor-menu-toggle, .hamburger, [aria-label*=menu i], a[href="#"]').filter({ visible: true }).first();
    out.toggleCount = await toggle.count();
    if (out.toggleCount) {
      await toggle.click({ timeout: 5000 }).catch((e) => { out.clickErr = String(e.message).slice(0, 160); });
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(SHOTS, 'mobile-menu-open-hamburger.png') });
    const menuItems = await page.evaluate(() => Array.from(document.querySelectorAll('nav.elementor-nav-menu--dropdown a')).filter((a) => a.getBoundingClientRect().height > 0).map((a) => (a.innerText || '').trim()).slice(0, 40));
    out.mobileVisibleMenuItems = menuItems;
    await ctx.close();
  }

  // Desktop: home claims and the menu.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('https://harrisfac.com/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);
    out.responseWithinHour = await shotOf(page, 'Rather than responding within 24 hours', 'home-desktop-response-within-the-hour.png');
    out.rating45 = await shotOf(page, 'Rating on Google', 'home-desktop-rating-4-5.png');
    out.awardKansas = await shotOf(page, 'U.S. Small Business Person of the Year, Kansas', 'home-desktop-award-kansas.png');
    out.startedFewYears = await shotOf(page, 'started just a few years ago', 'home-desktop-started-few-years.png');

    // Menu: hover the top-level Services item so the dropdown shows, then capture the header.
    const services = page.locator('nav.elementor-nav-menu--main > ul > li').filter({ hasText: 'Services' }).first();
    out.servicesMenuFound = await services.count();
    if (out.servicesMenuFound) {
      await services.hover().catch(() => {});
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: path.join(SHOTS, 'desktop-menu-services-dropdown.png'), clip: { x: 0, y: 0, width: 1440, height: 420 } });
    const dd = await page.evaluate(() => {
      const hashes = Array.from(document.querySelectorAll('a[href="#"]'));
      return hashes.map((a) => ({ text: (a.innerText || '').trim(), visible: a.getBoundingClientRect().height > 0, parent: (a.closest('li') || {}).className || '' }));
    });
    out.hashAnchorsDesktop = dd;
    await ctx.close();
  }

  fs.writeFileSync(path.join(DATA, 'shots2.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2).slice(0, 5000));
  await browser.close();
})().catch((e) => {
  console.error('SHOTS2 FAILED', e);
  process.exit(1);
});
