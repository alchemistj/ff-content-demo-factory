// Save full visible text of every menu page, plus checks the crawl did not cover:
// the contact form's captcha question, the phone-width menu toggle, the Udall page, and the
// tel: link context on the contact page. Read-only; submits nothing.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = '/home/user/ff-content-demo-factory/prospects/wichita-cleaning/jenny-maids/audit/data';
fs.mkdirSync(OUT, { recursive: true });
const PAGES = [
  '/', '/basic-cleaning/', '/blinds-hand-wipe-cleaning/', '/deep-cleaning/', '/spring-cleaning/', '/fall-cleaning/',
  '/all-occasions-cleaning/', '/office-cleaning/', '/packages/', '/wichita-ks/', '/andover-ks/', '/augusta-ks/',
  '/goddard-ks/', '/derby-ks/', '/maize-ks/', '/park-city-ks/', '/valley-center-ks/', '/peck-ks/', '/wellington-ks/',
  '/kechi-ks/', '/blog/', '/about-us/', '/contact-us/', '/udall-ks/', '/wellington-ks/',
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const texts = {};
  for (const p of [...new Set(PAGES)]) {
    const url = 'https://jennymaidsict.com' + p;
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch((e) => null);
    await page.waitForTimeout(800);
    texts[p] = {
      status: resp ? resp.status() : 'nav-error',
      title: await page.title().catch(() => ''),
      text: await page.evaluate(() => document.body.innerText.replace(/\n{3,}/g, '\n\n')).catch(() => ''),
    };
  }
  fs.writeFileSync(path.join(OUT, 'page-text.json'), JSON.stringify(texts, null, 2));

  // Contact form captcha question and form detail
  await page.goto('https://jennymaidsict.com/contact-us/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  const form = await page.evaluate(() => {
    const f = document.querySelector('form');
    if (!f) return null;
    const cap = f.querySelector('input[name*=captcha]');
    const label = cap ? (cap.closest('p, div') || cap.parentElement).innerText : null;
    return { captchaContext: label && label.replace(/\s+/g, ' ').slice(0, 200), submitText: [...f.querySelectorAll('button,input[type=submit]')].map((b) => b.innerText || b.value), formText: f.innerText.replace(/\s+/g, ' ').slice(0, 300) };
  });
  // Contact page tel links in context: which are visible, and what they wrap
  const telCtx = await page.evaluate(() => [...document.querySelectorAll('a[href^="tel:"]')].map((a) => ({
    text: (a.innerText || '').replace(/\s+/g, ' ').trim(), visible: !!(a.offsetWidth || a.offsetHeight),
    parentTag: a.parentElement && a.parentElement.tagName, cls: (a.className || '').toString().slice(0, 60),
    section: (a.closest('section') || {}).className ? a.closest('section').className.toString().slice(0, 60) : null,
  })));
  // Divi "Click To Call" text on contact page: is it a link
  const ctc = await page.evaluate(() => [...document.querySelectorAll('*')].filter((x) => x.children.length === 0 && /click to call/i.test(x.textContent || '')).map((x) => ({ tag: x.tagName, text: x.textContent.trim(), inLink: !!x.closest('a'), href: (x.closest('a') || {}).href || null })));
  await page.screenshot({ path: path.join(OUT, '..', 'screens', 'contact-desktop-form.png'), fullPage: false }).catch(() => {});

  // Phone-width menu: find the hamburger/menu control and open it
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pp = await pctx.newPage();
  await pp.goto('https://jennymaidsict.com/', { waitUntil: 'load', timeout: 60000 });
  await pp.waitForTimeout(1500);
  const headerDump = await pp.evaluate(() => [...document.querySelectorAll('header *, .et_mobile_menu, .mobile_nav, .mobile_menu_bar, .mobile_menu_bar_toggle, #et_mobile_nav_menu')]
    .filter((el) => el.offsetWidth && el.offsetHeight && (el.className || el.tagName === 'A' || el.tagName === 'BUTTON'))
    .slice(0, 25).map((el) => ({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 80), text: (el.innerText || '').trim().slice(0, 30), id: el.id || null })));
  const bar = await pp.$('.mobile_menu_bar, .mobile_menu_bar_toggle, .et_mobile_menu, [class*=hamburger], [aria-label*=enu i]');
  let mobileMenu = null;
  if (bar) {
    await bar.click({ timeout: 5000 }).catch((e) => { mobileMenu = { clickError: String(e.message).slice(0, 120) }; });
    await pp.waitForTimeout(1200);
    if (!mobileMenu) {
      mobileMenu = await pp.evaluate(() => [...document.querySelectorAll('.et_mobile_menu a, .mobile_nav a, #mobile_menu a, nav a')]
        .filter((a) => a.offsetWidth && a.offsetHeight).map((a) => [(a.innerText || '').trim().slice(0, 40), a.getAttribute('href')]));
    }
    await pp.screenshot({ path: path.join(OUT, '..', 'screens', 'menu-phone-open.png') }).catch(() => {});
  }
  // Phone-width home: screenshot the top of the page with the header
  await pp.goto('https://jennymaidsict.com/', { waitUntil: 'load', timeout: 60000 });
  await pp.waitForTimeout(1200);
  await pp.screenshot({ path: path.join(OUT, '..', 'screens', 'home-phone-top.png') });

  await browser.close();
  const extra = { form, telCtx, ctc, headerDump, mobileMenu };
  fs.writeFileSync(path.join(OUT, 'extra-checks.json'), JSON.stringify(extra, null, 2));
  console.log('saved pages:', Object.keys(texts).length);
  for (const [p, t] of Object.entries(texts)) console.log(p, t.status, t.text.length, JSON.stringify(t.title));
  console.log('FORM', JSON.stringify(form));
  console.log('TEL CONTEXT', JSON.stringify(telCtx));
  console.log('CLICK TO CALL (contact)', JSON.stringify(ctc));
  console.log('MOBILE MENU', JSON.stringify(mobileMenu));
  console.log('HEADER DUMP (phone)', JSON.stringify(headerDump));
})().catch((e) => { console.error('TEXT FAILED', e); process.exit(1); });
