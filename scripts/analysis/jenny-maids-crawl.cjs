// Crawl every menu page of jennymaidsict.com at desktop (1440x900) and phone (390x844) widths.
// Read-only: loads pages, reads the DOM, clicks menu toggles and FAQ questions, takes screenshots.
// Submits no forms. Does not click tel: or mailto: links (their href is read instead).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const HOME = 'https://jennymaidsict.com/';
const OUT = '/home/user/ff-content-demo-factory/prospects/wichita-cleaning/jenny-maids/audit';
const DATA = path.join(OUT, 'data');
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

const pageExtract = () => {
  const txt = (el) => (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim();
  const main = document.querySelector('main') || document.body;
  const links = [...document.querySelectorAll('a[href]')].map((a) => ({
    text: txt(a).slice(0, 80),
    href: a.getAttribute('href'),
    where: a.closest('header, nav, [role=navigation]') ? 'nav' : (a.closest('footer') ? 'footer' : 'body'),
    visible: !!(a.offsetWidth || a.offsetHeight),
  }));
  const tel = [...document.querySelectorAll('a[href^="tel:"]')].map((a) => ({ text: txt(a), href: a.getAttribute('href') }));
  const mail = [...document.querySelectorAll('a[href^="mailto:"]')].map((a) => ({ text: txt(a), href: a.getAttribute('href') }));
  const forms = [...document.querySelectorAll('form')].map((f) => ({
    action: f.getAttribute('action'),
    fields: [...f.querySelectorAll('input,textarea,select')].filter((i) => i.type !== 'hidden').map((i) => ({
      tag: i.tagName, type: i.type, name: i.name, placeholder: i.placeholder, required: i.required,
    })),
    buttons: [...f.querySelectorAll('button,input[type=submit]')].map((b) => txt(b) || b.value),
  }));
  const html = document.documentElement.innerHTML;
  const captcha = {
    iframes: [...document.querySelectorAll('iframe')].map((f) => f.src).filter((s) => /captcha|recaptcha|hcaptcha|turnstile/i.test(s)),
    sitekeyEls: document.querySelectorAll('[data-sitekey], .g-recaptcha, .h-captcha, .cf-turnstile').length,
    grecaptchaInHtml: /g-recaptcha|grecaptcha|recaptcha\/api/i.test(html),
    turnstileInHtml: /challenges\.cloudflare|turnstile/i.test(html),
  };
  const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ');
  const copy = (bodyText.match(/(?:©|Copyright)[^|]{0,60}/gi) || []);
  const hits = bodyText.match(/lorem ipsum|placeholder|sample|click to call|copy of|example\.com|mysite|samantha|johnson|first time cleaning|coming soon|under construction/gi) || [];
  const headings = [...document.querySelectorAll('h1,h2,h3')].map((h) => ({ tag: h.tagName, text: txt(h).slice(0, 120) }));
  const emptySections = [...document.querySelectorAll('section')].map((s) => {
    const t = txt(s);
    return { heading: txt(s.querySelector('h1,h2,h3')).slice(0, 80), chars: t.length };
  }).filter((s) => s.chars < 60);
  const imgs = [...document.querySelectorAll('img')];
  const brokenImgs = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'));
  return {
    title: document.title,
    metaDesc: (document.querySelector('meta[name=description]') || {}).content || null,
    canonical: (document.querySelector('link[rel=canonical]') || {}).href || null,
    h1: [...document.querySelectorAll('h1')].map((h) => txt(h).slice(0, 120)),
    headings,
    words: bodyText.trim().split(' ').length,
    mainText: txt(main).slice(0, 1500),
    links, tel, mail, forms, captcha, copy, hits: [...new Set(hits.map((h) => h.toLowerCase()))],
    emptySections, imgCount: imgs.length, brokenImgs,
    hasHamburger: !!document.querySelector('[class*=hamburger], [class*=menu-toggle], [aria-label*=menu i], [aria-label*=navigation i], button[aria-expanded]'),
  };
};

async function visit(page, url) {
  const resp = await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch((e) => ({ error: String(e.message || e) }));
  if (resp && resp.error) return { url, error: resp.error };
  await page.waitForTimeout(1500);
  return { url, status: resp ? resp.status() : null, finalUrl: page.url() };
}

(async () => {
  const browser = await chromium.launch();
  const out = { crawledAt: new Date().toISOString(), pages: {}, menu: {}, faq: [], clicks: [], telCheck: [], contact: {}, clickToCall: null, firstTime: null };

  // 1. Desktop crawl of every menu page
  const ctxD = await browser.newContext({ viewport: DESKTOP });
  const pd = await ctxD.newPage();
  const homeInfo = await visit(pd, HOME);
  const homeLinks = await pd.evaluate(pageExtract);
  const menuUrls = [...new Set(homeLinks.links
    .filter((l) => l.where === 'nav' && l.href && l.href.startsWith('https://jennymaidsict.com/') )
    .map((l) => l.href.split('#')[0]))];
  const footerUrls = [...new Set(homeLinks.links.filter((l) => l.where === 'footer' && l.href && l.href.startsWith('https://jennymaidsict.com/')).map((l) => l.href))];
  const urls = [...new Set([HOME, ...menuUrls, ...footerUrls])];
  out.menuUrls = menuUrls;
  out.footerUrls = footerUrls;
  out.pages[HOME] = { nav: homeInfo, desktop: homeLinks };
  await pd.screenshot({ path: path.join(OUT, 'screens', 'home-desktop-fold.png') });
  await pd.screenshot({ path: path.join(OUT, 'screens', 'home-desktop-full.png'), fullPage: true });

  for (const url of urls) {
    if (url === HOME) continue;
    const info = await visit(pd, url);
    const ex = await pd.evaluate(pageExtract).catch((e) => ({ error: String(e) }));
    out.pages[url] = { nav: info, desktop: ex };
  }

  // 2. Menu items with href "#": click on desktop and record the result
  await pd.goto(HOME, { waitUntil: 'load', timeout: 60000 });
  await pd.waitForTimeout(1500);
  const hashItems = await pd.evaluate(() => [...document.querySelectorAll('header a[href="#"], nav a[href="#"]')]
    .filter((a) => a.offsetWidth || a.offsetHeight).map((a, i) => ({ i, text: (a.innerText || '').trim() })));
  for (const item of hashItems) {
    await pd.goto(HOME, { waitUntil: 'load', timeout: 60000 });
    await pd.waitForTimeout(800);
    const before = pd.url();
    const clicked = await pd.evaluate((text) => {
      const a = [...document.querySelectorAll('header a[href="#"], nav a[href="#"]')].find((x) => (x.innerText || '').trim() === text && (x.offsetWidth || x.offsetHeight));
      if (!a) return false; a.click(); return true;
    }, item.text).catch(() => false);
    await pd.waitForTimeout(1200);
    const after = pd.url();
    const dropdown = await pd.evaluate(() => {
      const vis = [...document.querySelectorAll('header ul ul, nav ul ul, .dropdown-menu, [class*=submenu], [class*=dropdown]')]
        .filter((el) => el.offsetWidth && el.offsetHeight);
      return vis.map((el) => [...el.querySelectorAll('a')].map((a) => (a.innerText || '').trim()).filter(Boolean)).flat().slice(0, 40);
    }).catch(() => []);
    out.clicks.push({ control: item.text, clicked, urlBefore: before, urlAfter: after, visibleSubmenuLinks: dropdown });
    if (item.text === 'Services' || item.text === 'Locations') {
      await pd.screenshot({ path: path.join(OUT, 'screens', `menu-${item.text.toLowerCase()}-desktop-click.png`) });
    }
  }

  // 3. Home "Get a Free Quote", "Learn More" and the header phone link: where they go (no tel dial)
  await pd.goto(HOME, { waitUntil: 'load', timeout: 60000 });
  await pd.waitForTimeout(1200);
  const ctaHrefs = await pd.evaluate(() => [...document.querySelectorAll('a')].filter((a) => /Free Quote|Learn More|Get Started|Book|Call|Quote/i.test(a.innerText || '')).map((a) => ({ text: (a.innerText || '').trim().slice(0, 60), href: a.getAttribute('href') })));
  out.ctaHrefs = ctaHrefs;

  // 4. Click-To-Call element and First Time Cleaning section (home)
  out.clickToCall = await pd.evaluate(() => {
    const el = [...document.querySelectorAll('a,button,div,span,p,h1,h2,h3,h4')].find((x) => /click to call/i.test(x.innerText || '') && x.children.length < 4);
    if (!el) return null;
    const a = el.closest('a');
    return { tag: el.tagName, text: (el.innerText || '').trim(), wrappedInLink: a ? a.getAttribute('href') : null, parentHtml: (el.parentElement ? el.parentElement.outerHTML : '').slice(0, 400) };
  });
  out.firstTime = await pd.evaluate(() => {
    const h = [...document.querySelectorAll('h1,h2,h3,h4,h5,p,div,span')].find((x) => /^first time cleaning$/i.test((x.innerText || '').trim()));
    if (!h) return null;
    const sec = h.closest('section') || h.parentElement.parentElement;
    return { headingTag: h.tagName, sectionText: (sec.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400), sectionChars: (sec.innerText || '').trim().length };
  });
  const ftEl = await pd.$('text=/^FIRST TIME CLEANING$/i');
  if (ftEl) { await ftEl.scrollIntoViewIfNeeded(); await pd.waitForTimeout(500); }
  await pd.screenshot({ path: path.join(OUT, 'screens', 'first-time-cleaning-desktop.png'), fullPage: false });
  const ctcEl = await pd.$('text=/click to call/i');
  if (ctcEl) { await ctcEl.scrollIntoViewIfNeeded(); await pd.waitForTimeout(500); await ctcEl.screenshot({ path: path.join(OUT, 'screens', 'click-to-call-desktop.png') }).catch(() => {}); }

  // 5. FAQ questions on home: open each and record the answer
  const faqQs = await pd.$$eval('button', (bs) => bs.map((b) => (b.innerText || '').trim()).filter((t) => t.endsWith('?')));
  for (const q of [...new Set(faqQs)]) {
    const r = await pd.evaluate((question) => {
      const b = [...document.querySelectorAll('button')].find((x) => (x.innerText || '').trim() === question);
      if (!b) return null;
      b.click();
      const panel = b.nextElementSibling || (b.parentElement && b.parentElement.querySelector('[class*=answer],[class*=content],[class*=panel]'));
      return { expanded: b.getAttribute('aria-expanded'), answer: panel ? (panel.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500) : null };
    }, q).catch(() => null);
    await pd.waitForTimeout(300);
    out.faq.push({ q, ...(r || {}) });
  }
  await pd.evaluate(() => window.scrollTo(0, 0));
  await ctxD.close();

  // 6. Phone (390x844): does the menu open, and what does a tap on each top-level item show
  const ctxP = await browser.newContext({ viewport: PHONE });
  const pp = await ctxP.newPage();
  await pp.goto(HOME, { waitUntil: 'load', timeout: 60000 });
  await pp.waitForTimeout(1500);
  await pp.screenshot({ path: path.join(OUT, 'screens', 'home-phone-fold.png') });
  await pp.screenshot({ path: path.join(OUT, 'screens', 'home-phone-full.png'), fullPage: true });
  out.phone = {};
  out.phone.visibleHeaderButtons = await pp.evaluate(() => [...document.querySelectorAll('header button, header [role=button], header a')]
    .filter((b) => b.offsetWidth && b.offsetHeight).map((b) => ({ tag: b.tagName, text: (b.innerText || '').trim().slice(0, 40), aria: b.getAttribute('aria-label'), cls: (b.className || '').toString().slice(0, 80) })));
  out.phone.menuOpened = null;
  const toggle = await pp.$('header button[aria-expanded], header [class*=hamburger], header [class*=menu-toggle], header [aria-label*=menu i], header button');
  if (toggle) {
    await toggle.click().catch(() => {});
    await pp.waitForTimeout(1000);
    out.phone.menuOpened = await pp.evaluate(() => [...document.querySelectorAll('header a, nav a')].filter((a) => a.offsetWidth && a.offsetHeight).map((a) => [(a.innerText || '').trim().slice(0, 40), a.getAttribute('href')]));
    await pp.screenshot({ path: path.join(OUT, 'screens', 'menu-phone-open.png') });
  }
  await ctxP.close();

  // 7. Contact page: form, captcha, submit button (not clicked)
  const ctxC = await browser.newContext({ viewport: PHONE });
  const pc = await ctxC.newPage();
  await pc.goto('https://jennymaidsict.com/contact-us/', { waitUntil: 'load', timeout: 60000 });
  await pc.waitForTimeout(2000);
  out.contact = await pc.evaluate(pageExtract);
  await pc.screenshot({ path: path.join(OUT, 'screens', 'contact-phone-full.png'), fullPage: true });
  await ctxC.close();

  await browser.close();
  fs.writeFileSync(path.join(DATA, 'crawl.json'), JSON.stringify(out, null, 2));
  console.log('pages crawled:', Object.keys(out.pages).length);
  console.log('menuUrls:', out.menuUrls.length, 'footerUrls:', out.footerUrls.length);
  console.log('clicks:', JSON.stringify(out.clicks, null, 1));
})().catch((e) => { console.error('CRAWL FAILED', e); process.exit(1); });
