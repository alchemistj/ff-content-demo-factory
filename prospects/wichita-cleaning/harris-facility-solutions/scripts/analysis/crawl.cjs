// Crawl harrisfac.com at phone and desktop widths and record links, buttons,
// tel/mailto links, forms, headings, titles and visible text. Read-only: forms are never submitted.
// Output: audit/data/crawl-<vp>.json (relative to the prospect folder).
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'audit', 'data');
fs.mkdirSync(OUT, { recursive: true });

const START = 'https://harrisfac.com/';
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];
const MAX_PAGES = 40;

function normalize(u) {
  try {
    const x = new URL(u, START);
    x.hash = '';
    return x.href.replace(/\/$/, '');
  } catch (e) {
    return null;
  }
}

async function collectPage(page) {
  return page.evaluate(() => {
    const txt = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    const regionOf = (el) => {
      const r = el.closest('header,nav,footer,main,aside,section,[role=navigation]');
      if (!r) return 'none';
      return r.tagName.toLowerCase() + (r.id ? '#' + r.id : '') + (r.className && typeof r.className === 'string' ? '.' + r.className.split(' ').filter(Boolean).slice(0, 2).join('.') : '');
    };
    const visible = (el) => {
      const s = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0;
    };
    const links = Array.from(document.querySelectorAll('a')).map((a) => ({
      text: (txt(a) || a.getAttribute('aria-label') || a.getAttribute('title') || '').slice(0, 120),
      rawHref: a.getAttribute('href'),
      resolved: a.href,
      target: a.getAttribute('target'),
      region: regionOf(a),
      visible: visible(a),
      hasImgAlt: Array.from(a.querySelectorAll('img')).map((i) => i.getAttribute('alt')),
    }));
    const buttons = Array.from(document.querySelectorAll('button, input[type=button], input[type=submit], [role=button]')).map((b) => ({
      text: (txt(b) || b.value || b.getAttribute('aria-label') || '').slice(0, 120),
      type: b.getAttribute('type'),
      onclick: b.getAttribute('onclick'),
      region: regionOf(b),
      visible: visible(b),
    }));
    const forms = Array.from(document.querySelectorAll('form')).map((f) => ({
      action: f.getAttribute('action'),
      method: f.getAttribute('method'),
      region: regionOf(f),
      fields: Array.from(f.querySelectorAll('input,select,textarea')).map((i) => ({
        tag: i.tagName.toLowerCase(),
        type: i.getAttribute('type'),
        name: i.getAttribute('name'),
        placeholder: i.getAttribute('placeholder'),
        required: i.hasAttribute('required'),
        label: (i.labels && i.labels[0] ? txt(i.labels[0]) : '') || i.getAttribute('aria-label') || '',
        options: i.tagName === 'SELECT' ? Array.from(i.options).map((o) => o.text) : undefined,
      })),
      buttons: Array.from(f.querySelectorAll('button,input[type=submit]')).map((b) => txt(b) || b.value),
    }));
    const html = document.documentElement.outerHTML;
    const captcha = {
      recaptcha: /g-recaptcha|google\.com\/recaptcha|grecaptcha/i.test(html),
      hcaptcha: /h-captcha|hcaptcha\.com/i.test(html),
      turnstile: /cf-turnstile|challenges\.cloudflare\.com\/turnstile/i.test(html),
      friendlyCaptcha: /friendlycaptcha|friendly-captcha/i.test(html),
      honeypotLike: /honeypot|hp_field|website_url|hidden.*name=.?(company|website)/i.test(html),
    };
    const imgs = Array.from(document.querySelectorAll('img')).map((i) => ({
      src: (i.getAttribute('src') || '').slice(0, 200),
      alt: i.getAttribute('alt'),
      hasAltAttr: i.hasAttribute('alt'),
    }));
    const telMailto = Array.from(document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]')).map((a) => ({
      shows: txt(a),
      href: a.getAttribute('href'),
      region: regionOf(a),
    }));
    const headings = Array.from(document.querySelectorAll('h1,h2,h3')).map((h) => ({ tag: h.tagName, text: txt(h).slice(0, 160), visible: visible(h) }));
    return {
      url: location.href,
      title: document.title,
      metaDescription: (document.querySelector('meta[name=description]') || {}).content || null,
      canonical: (document.querySelector('link[rel=canonical]') || {}).href || null,
      lang: document.documentElement.lang,
      navCount: document.querySelectorAll('nav').length,
      headings,
      links,
      buttons,
      forms,
      captcha,
      imgs,
      telMailto,
      bodyText: txt(document.body).slice(0, 20000),
      scriptSrcs: Array.from(document.querySelectorAll('script[src]')).map((s) => s.src).slice(0, 60),
      generator: (document.querySelector('meta[name=generator]') || {}).content || null,
    };
  });
}

(async () => {
  const browser = await chromium.launch();
  const summary = {};
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    const queue = [START];
    const seen = new Set();
    const pages = [];
    const statuses = {};
    while (queue.length && pages.length < MAX_PAGES) {
      const next = queue.shift();
      const key = normalize(next);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      let resp = null;
      try {
        resp = await page.goto(next, { waitUntil: 'networkidle', timeout: 45000 });
      } catch (e) {
        pages.push({ url: next, error: String(e.message || e).slice(0, 300) });
        continue;
      }
      await page.waitForTimeout(800);
      const data = await collectPage(page);
      data.httpStatus = resp ? resp.status() : null;
      data.finalUrl = page.url();
      pages.push(data);
      if (vp.name === 'desktop' && pages.length === 1) {
        await page.screenshot({ path: path.join(ROOT, 'audit', 'home-desktop-full.png'), fullPage: true });
      }
      if (vp.name === 'mobile' && pages.length === 1) {
        await page.screenshot({ path: path.join(ROOT, 'audit', 'home-mobile-full.png'), fullPage: true });
      }
      for (const l of data.links) {
        const r = l.resolved || '';
        if (r.startsWith(START.slice(0, -1)) || r.startsWith('https://harrisfac.com') || r.startsWith('http://harrisfac.com')) {
          const k = normalize(r);
          if (k && !seen.has(k)) queue.push(r);
        }
      }
    }
    // Probe status of every distinct internal link target, from the home page's link list.
    const home = pages[0];
    const targets = new Set();
    for (const p of pages) for (const l of (p.links || [])) if (l.resolved && l.resolved.includes('harrisfac.com')) targets.add(l.resolved);
    for (const t of targets) {
      try {
        const r = await page.request.get(t, { maxRedirects: 5, timeout: 30000 });
        statuses[t] = r.status();
      } catch (e) {
        statuses[t] = 'ERR ' + String(e.message || e).slice(0, 120);
      }
    }
    // Also probe the top-level anchors that resolve to # or javascript
    fs.writeFileSync(path.join(OUT, `crawl-${vp.name}.json`), JSON.stringify({ viewport: vp, pages, targetStatuses: statuses }, null, 2));
    summary[vp.name] = pages.map((p) => ({ url: p.url, status: p.httpStatus, error: p.error || null, title: p.title, h1: (p.headings || []).filter((h) => h.tag === 'H1').map((h) => h.text), links: (p.links || []).length, forms: (p.forms || []).length }));
    await ctx.close();
  }
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('CRAWL FAILED', e);
  process.exit(1);
});
