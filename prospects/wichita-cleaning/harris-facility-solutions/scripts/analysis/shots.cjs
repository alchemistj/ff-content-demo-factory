// Targeted checks and screenshots for the audit: contact form (read only, never submitted),
// the "Menu"/"Maintenance" links to #, the response-time claims, the rating claims, and the
// mobile menu. Writes audit/screens/*.png and audit/data/shots.json.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'audit', 'screens');
const DATA = path.join(ROOT, 'audit', 'data');
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

async function findText(page, needle) {
  const loc = page.getByText(needle, { exact: false }).first();
  const count = await page.getByText(needle, { exact: false }).count();
  return { count, visible: count ? await loc.isVisible().catch(() => false) : false, loc };
}

(async () => {
  const browser = await chromium.launch();
  const report = {};

  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const r = (report[name] = {});

    // 1. Contact page: load with 'load' (network-idle timed out earlier).
    try {
      await page.goto('https://harrisfac.com/contact/', { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(6000);
      r.contact = await page.evaluate(() => {
        const fields = Array.from(document.querySelectorAll('input, textarea, select')).map((i) => ({
          tag: i.tagName.toLowerCase(), type: i.getAttribute('type'), name: i.getAttribute('name'),
          placeholder: i.getAttribute('placeholder'), required: i.hasAttribute('required'),
          label: (i.labels && i.labels[0] ? i.labels[0].innerText : '').trim(),
          visible: !!(i.offsetWidth || i.offsetHeight),
        }));
        const frames = Array.from(document.querySelectorAll('iframe')).map((f) => f.src).filter(Boolean);
        const captchaEls = Array.from(document.querySelectorAll('[class*=captcha], [id*=captcha], [class*=recaptcha], [class*=turnstile], [class*=hcaptcha], [class*=friendly]')).map((e) => ({ tag: e.tagName, cls: e.className && e.className.toString().slice(0, 120), visible: !!(e.offsetWidth || e.offsetHeight) }));
        const forms = Array.from(document.querySelectorAll('form')).map((f) => ({ action: f.getAttribute('action'), id: f.id, cls: (f.className || '').toString().slice(0, 120), fieldCount: f.querySelectorAll('input,textarea,select').length, submit: (f.querySelector('button,input[type=submit]') || {}).textContent || null }));
        const text = document.body.innerText;
        return { url: location.href, title: document.title, forms, fields, frames, captchaEls, mentionsCaptcha: /captcha|recaptcha|not a robot|verify you are human/i.test(text), bodyHas24: /24 hours|within the hour|few hours/i.test(text) };
      });
      const form = page.locator('form').first();
      if (await form.count()) {
        await form.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await form.screenshot({ path: path.join(SHOTS, `contact-form-${name}.png`) }).catch(() => {});
      }
      await page.screenshot({ path: path.join(SHOTS, `contact-top-${name}.png`) });
    } catch (e) {
      r.contactError = String(e.message || e).slice(0, 300);
    }

    // 2. Home page: menu, "Maintenance" and response-time claims.
    try {
      await page.goto('https://harrisfac.com/', { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(4000);
      const claims = {};
      for (const t of ['within the hour', 'less than 24 hours', '24/7', 'Rating on Google', 'Out of 5-Star', 'Voted #1', 'started just a few years ago', 'launched in 2015', 'We started our business in 2015', 'U.S. Small Business Person of the Year', 'Recognized In']) {
        const f = await findText(page, t);
        claims[t] = { count: f.count, visible: f.visible };
      }
      r.homeClaims = claims;

      if (name === 'desktop') {
        const hero = page.getByText('Rather than responding within 24 hours', { exact: false }).first();
        if (await hero.count()) {
          await hero.scrollIntoViewIfNeeded();
          await page.waitForTimeout(400);
          await hero.evaluate((el) => el.closest('section') || el).then(async (h) => {
            await page.locator('section').filter({ hasText: 'Rather than responding within 24 hours' }).first().screenshot({ path: path.join(SHOTS, 'home-response-time-within-the-hour.png') }).catch(() => {});
          }).catch(() => {});
        }
        const pricey = page.getByText('Recognized In', { exact: false }).first();
        if (await pricey.count()) {
          await pricey.scrollIntoViewIfNeeded();
          await page.waitForTimeout(400);
          await page.screenshot({ path: path.join(SHOTS, 'home-desktop-awards-and-rating.png') });
        }
      }

      // Header nav: find the visible "Menu" and "Maintenance" links.
      const menuLinks = await page.evaluate(() => {
        const out = [];
        for (const a of document.querySelectorAll('a[href="#"]')) {
          const b = a.getBoundingClientRect();
          out.push({ text: (a.innerText || '').trim(), visible: !!(b.width && b.height), region: (a.closest('header,nav,section,footer') || {}).tagName || 'none' });
        }
        return out;
      });
      r.hashLinks = menuLinks;

      if (name === 'mobile') {
        const menuBtn = page.locator('a[href="#"]').filter({ hasText: 'Menu' }).first();
        if (await menuBtn.count()) {
          await menuBtn.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(1200);
          await page.screenshot({ path: path.join(SHOTS, 'mobile-menu-open.png') });
          r.mobileMenuOpened = true;
        }
      } else {
        const nav = page.locator('a[href="#"]').filter({ hasText: 'Maintenance' }).first();
        if (await nav.count()) {
          await nav.scrollIntoViewIfNeeded().catch(() => {});
          await page.waitForTimeout(300);
          await page.screenshot({ path: path.join(SHOTS, 'desktop-menu-maintenance-hash.png') });
        }
      }
    } catch (e) {
      r.homeError = String(e.message || e).slice(0, 300);
    }

    await ctx.close();
  }

  fs.writeFileSync(path.join(DATA, 'shots.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2).slice(0, 6000));
  await browser.close();
})().catch((e) => {
  console.error('SHOTS FAILED', e);
  process.exit(1);
});
