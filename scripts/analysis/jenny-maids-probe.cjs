// Probe the current Jenny Maid's site: home page structure at phone and desktop widths.
// Read-only: loads pages, reads the DOM, takes screenshots. Submits nothing.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://jennymaidsict.com/';
const OUT = '/home/user/ff-content-demo-factory/prospects/wichita-cleaning/jenny-maids/audit';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const result = {};
  for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const resp = await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => {
      const txt = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      const links = [...document.querySelectorAll('a[href]')].map((a) => ({
        text: txt(a).slice(0, 80),
        href: a.getAttribute('href'),
        inNav: !!a.closest('nav, header, [role=navigation]'),
        inFooter: !!a.closest('footer'),
        visible: !!(a.offsetWidth || a.offsetHeight),
      }));
      const buttons = [...document.querySelectorAll('button, [role=button], input[type=submit]')].map((b) => ({
        text: txt(b).slice(0, 80), type: b.tagName, visible: !!(b.offsetWidth || b.offsetHeight),
      }));
      const h1 = [...document.querySelectorAll('h1')].map((h) => txt(h));
      const h2 = [...document.querySelectorAll('h2')].map((h) => txt(h)).slice(0, 40);
      const forms = [...document.querySelectorAll('form')].map((f) => ({
        action: f.getAttribute('action'),
        fields: [...f.querySelectorAll('input,textarea,select')].map((i) => ({
          tag: i.tagName, type: i.type, name: i.name, placeholder: i.placeholder, required: i.required,
        })),
      }));
      const captcha = {
        iframes: [...document.querySelectorAll('iframe')].map((f) => f.src).filter((s) => /captcha|recaptcha|hcaptcha|turnstile/i.test(s)),
        sitekeyEls: [...document.querySelectorAll('[data-sitekey], .g-recaptcha, .h-captcha, .cf-turnstile')].length,
        scriptSrcs: [...document.querySelectorAll('script[src]')].map((s) => s.src).filter((s) => /captcha|recaptcha|turnstile/i.test(s)),
      };
      const bodyText = document.body.innerText || '';
      const copy = bodyText.match(/(?:©|&copy;|Copyright)[^\n]{0,60}/gi) || [];
      const placeholders = (bodyText.match(/lorem|placeholder|sample|click to call|copy of|example\.com|mysite|samantha|first time cleaning/gi) || []);
      return {
        title: document.title,
        metaDesc: (document.querySelector('meta[name=description]') || {}).content || null,
        h1, h2, links, buttons, forms, captcha, copy, placeholders: [...new Set(placeholders.map((p) => p.toLowerCase()))],
        telLinks: [...document.querySelectorAll('a[href^="tel:"]')].map((a) => ({ text: txt(a), href: a.getAttribute('href') })),
        mailLinks: [...document.querySelectorAll('a[href^="mailto:"]')].map((a) => ({ text: txt(a), href: a.getAttribute('href') })),
        bodyLen: bodyText.length,
        bodyStart: bodyText.replace(/\s+/g, ' ').slice(0, 1200),
      };
    });
    await page.screenshot({ path: path.join(OUT, `home-${label}.png`), fullPage: true });
    result[label] = { status: resp && resp.status(), finalUrl: page.url(), ...info };
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'probe-home.json'), JSON.stringify(result, null, 2));
  // Compact console summary
  for (const label of Object.keys(result)) {
    const r = result[label];
    console.log('== ' + label, r.status, r.finalUrl, '| title:', r.title);
    console.log('h1:', JSON.stringify(r.h1));
    console.log('links(nav/header):', JSON.stringify(r.links.filter((l) => l.inNav).map((l) => [l.text, l.href, l.visible])));
    console.log('links(footer):', JSON.stringify(r.links.filter((l) => l.inFooter).map((l) => [l.text, l.href])));
    console.log('buttons:', JSON.stringify(r.buttons.map((b) => [b.text, b.visible])));
    console.log('tel:', JSON.stringify(r.telLinks), 'mailto:', JSON.stringify(r.mailLinks));
    console.log('forms:', JSON.stringify(r.forms));
    console.log('captcha:', JSON.stringify(r.captcha));
    console.log('copy:', JSON.stringify(r.copy), 'placeholders:', JSON.stringify(r.placeholders));
    console.log('bodyLen', r.bodyLen, '| h2:', JSON.stringify(r.h2));
  }
})().catch((e) => { console.error('PROBE FAILED', e); process.exit(1); });
