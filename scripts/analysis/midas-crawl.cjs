// Crawl a prospect site at two viewports and dump structure as JSON.
// Usage: node midas-crawl.cjs <outJson> <htmlDir>
// Read-only: no form is submitted, no login, no clicks here (see midas-clicks.cjs).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://www.midasmaidservice.com';
const HOST_RE = /(^|\.)midasmaidservice\.com$/i;
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};
const MAX_PAGES = 40;

const EXTRACT = () => {
  const txt = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const anchors = [...document.querySelectorAll('a')].map((a, i) => ({
    i,
    text: txt(a).slice(0, 100),
    aria: a.getAttribute('aria-label') || '',
    href: a.getAttribute('href') || '',
    resolved: a.href,
    visible: vis(a),
    inNav: !!a.closest('nav,header,[role=navigation]'),
    inFooter: !!a.closest('footer'),
    target: a.getAttribute('target') || '',
    cls: (a.className && a.className.toString()) .slice(0, 80),
  }));
  const buttons = [...document.querySelectorAll('button, input[type=submit], input[type=button], [role=button]')].map((b, i) => ({
    i,
    text: (txt(b) || b.value || '').slice(0, 100),
    aria: b.getAttribute('aria-label') || '',
    type: b.getAttribute('type') || '',
    visible: vis(b),
    inForm: !!b.closest('form'),
    inNav: !!b.closest('nav,header'),
    cls: (b.className && b.className.toString()).slice(0, 80),
  }));
  const forms = [...document.querySelectorAll('form')].map((f) => ({
    action: f.getAttribute('action') || '',
    method: f.getAttribute('method') || '',
    visible: vis(f),
    fields: [...f.querySelectorAll('input,select,textarea')].map((x) => ({
      tag: x.tagName,
      type: x.type || '',
      name: x.name || '',
      placeholder: x.placeholder || '',
      required: !!x.required,
      label: x.labels && x.labels[0] ? txt(x.labels[0]).slice(0, 80) : '',
      ariaLabel: x.getAttribute('aria-label') || '',
    })),
    buttons: [...f.querySelectorAll('button,input[type=submit]')].map((b) => txt(b) || b.value || ''),
  }));
  const scripts = [...document.querySelectorAll('script[src]')].map((s) => s.src);
  const iframes = [...document.querySelectorAll('iframe')].map((f) => f.src || f.title || '(no src)');
  const captchaHints = [...document.querySelectorAll('[class*=captcha],[id*=captcha],[class*=recaptcha],[class*=hcaptcha],[class*=turnstile],.g-recaptcha,.h-captcha,.cf-turnstile')]
    .map((e) => (e.className && e.className.toString()).slice(0, 80) || e.tagName);
  const h1 = [...document.querySelectorAll('h1')].map((h) => ({ text: txt(h).slice(0, 200), visible: vis(h) }));
  const headings = [...document.querySelectorAll('h2,h3')].map((h) => txt(h).slice(0, 140)).filter(Boolean);
  const tels = [...document.querySelectorAll('a[href^="tel:"]')].map((a) => ({ href: a.getAttribute('href'), text: txt(a), visible: vis(a) }));
  const mailtos = [...document.querySelectorAll('a[href^="mailto:"]')].map((a) => ({ href: a.getAttribute('href'), text: txt(a), visible: vis(a) }));
  const meta = [...document.querySelectorAll('meta')]
    .filter((m) => /description|og:title|og:description/i.test(m.name || m.getAttribute('property') || ''))
    .map((m) => (m.name || m.getAttribute('property')) + ': ' + m.content);
  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent.slice(0, 2000));
  const imgs = [...document.querySelectorAll('img')].map((i) => ({ alt: i.alt || '', src: (i.currentSrc || i.src || '').slice(0, 160), visible: vis(i) }));
  return {
    title: document.title,
    lang: document.documentElement.lang,
    canonical: (document.querySelector('link[rel=canonical]') || {}).href || '',
    meta,
    h1,
    headings,
    anchors,
    buttons,
    forms,
    scripts,
    iframes,
    captchaHints,
    tels,
    mailtos,
    imgCount: imgs.length,
    imgs: imgs.slice(0, 60),
    jsonLd,
    bodyText: document.body ? document.body.innerText : '',
  };
};

const keyOf = (u) => {
  const x = new URL(u);
  let p = x.pathname.replace(/\/+$/, '');
  return p === '' ? '/' : p;
};
const slugOf = (k) => (k === '/' ? 'home' : k.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, ''));

(async () => {
  const outPath = process.argv[2];
  const htmlDir = process.argv[3];
  fs.mkdirSync(htmlDir, { recursive: true });
  const browser = await chromium.launch();
  const result = { startedAt: new Date().toISOString(), viewports: {}, sitemap: null, robots: null, linkStatus: {} };

  const ctx0 = await browser.newContext({ viewport: VIEWPORTS.desktop });
  for (const [name, p] of [['sitemap', '/sitemap.xml'], ['robots', '/robots.txt']]) {
    try {
      const r = await ctx0.request.get(ORIGIN + p, { timeout: 20000 });
      const body = await r.text();
      result[name] = { status: r.status(), length: body.length, body: body.slice(0, 6000) };
    } catch (e) {
      result[name] = { error: String(e.message).slice(0, 200) };
    }
  }
  await ctx0.close();

  const allHrefs = new Map();
  for (const vpName of Object.keys(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: VIEWPORTS[vpName] });
    const page = await ctx.newPage();
    const vp = { pages: {}, errors: [] };
    result.viewports[vpName] = vp;
    const queue = [ORIGIN + '/'];
    const seen = new Set();
    while (queue.length && seen.size < MAX_PAGES) {
      const url = queue.shift();
      let key;
      try { key = keyOf(url); } catch (e) { continue; }
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        const resp = await page.goto(ORIGIN + key, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(2500);
        const info = await page.evaluate(EXTRACT);
        const html = await page.content();
        fs.writeFileSync(path.join(htmlDir, vpName + '-' + slugOf(key) + '.html'), html);
        vp.pages[key] = { requested: ORIGIN + key, status: resp ? resp.status() : null, finalUrl: page.url(), htmlBytes: html.length, ...info };
        for (const a of info.anchors) {
          if (!a.resolved || !/^https?:/.test(a.resolved)) continue;
          const u = new URL(a.resolved);
          if (HOST_RE.test(u.hostname)) {
            if (!seen.has(keyOf(a.resolved))) queue.push(a.resolved);
          } else {
            allHrefs.set(a.resolved, true);
          }
        }
        for (const a of info.anchors) {
          if (/^https?:/.test(a.resolved) && HOST_RE.test(new URL(a.resolved).hostname)) allHrefs.set(a.resolved, true);
        }
      } catch (e) {
        vp.errors.push({ url: ORIGIN + key, error: String(e.message).slice(0, 300) });
      }
    }
    await ctx.close();
  }

  // HTTP status of every distinct http(s) link found (internal and external).
  const ctxL = await browser.newContext();
  for (const href of allHrefs.keys()) {
    try {
      const r = await ctxL.request.get(href, { timeout: 20000, maxRedirects: 5 });
      result.linkStatus[href] = r.status();
    } catch (e) {
      result.linkStatus[href] = 'ERR ' + String(e.message).slice(0, 120);
    }
  }
  await ctxL.close();
  await browser.close();
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log('pages mobile', Object.keys(result.viewports.mobile.pages).length,
    'desktop', Object.keys(result.viewports.desktop.pages).length,
    'links', Object.keys(result.linkStatus).length);
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
