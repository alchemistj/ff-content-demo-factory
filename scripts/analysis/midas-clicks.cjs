// Click every visible link and button (deduped by text+href) on key pages, at both viewports.
// Records where each click lands. Never submits a form (submit-type controls are skipped).
// Usage: node midas-clicks.cjs <outJson> <shotDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://www.midasmaidservice.com';
const PAGES = ['/', '/about', '/services', '/portfolio', '/contactus'];
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};
const SEL = 'a,button,input[type=button],[role=button]';

const COLLECT = () => {
  const txt = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  return [...document.querySelectorAll('a,button,input[type=button],[role=button]')].map((el, i) => ({
    i,
    tag: el.tagName,
    text: (txt(el) || el.getAttribute('aria-label') || el.value || '').slice(0, 80),
    href: el.tagName === 'A' ? el.getAttribute('href') || '' : '',
    visible: vis(el),
    inNav: !!el.closest('nav,header'),
    inFooter: !!el.closest('footer'),
    inForm: !!el.closest('form'),
    type: el.getAttribute('type') || '',
  }));
};

async function openMenuIfNeeded(page, vpName) {
  if (vpName !== 'mobile') return;
  const toggle = page.locator('button[aria-label*="enu" i], .header-menu-icon, .mobile-nav-button, [class*=burger], [class*=hamburger]').first();
  try {
    if (await toggle.isVisible({ timeout: 1000 })) {
      await toggle.click({ timeout: 3000 });
      await page.waitForTimeout(800);
    }
  } catch (e) { /* no toggle */ }
}

async function looksLike404(page) {
  return page.evaluate(() => {
    const t = (document.body ? document.body.innerText : '').slice(0, 3000);
    return /page not found|404|doesn.t exist|sorry, the page/i.test(t);
  });
}

(async () => {
  const outPath = process.argv[2];
  const shotDir = process.argv[3];
  fs.mkdirSync(shotDir, { recursive: true });
  const browser = await chromium.launch();
  const out = { startedAt: new Date().toISOString(), results: [] };

  for (const vpName of Object.keys(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: VIEWPORTS[vpName] });
    const page = await ctx.newPage();
    for (const key of PAGES) {
      const pageUrl = ORIGIN + key;
      try {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        out.results.push({ vp: vpName, page: key, error: 'load failed: ' + String(e.message).slice(0, 150) });
        continue;
      }
      await openMenuIfNeeded(page, vpName);
      const items = await page.evaluate(COLLECT);
      const seenKeys = new Set();
      const candidates = [];
      for (const it of items) {
        if (!it.visible || it.inForm || it.type === 'submit') continue;
        if (it.tag === 'A' && /^(tel:|mailto:)/.test(it.href)) continue; // handled by crawl
        if (/^https?:\/\//.test(it.href) && !/midasmaidservice\.com/.test(it.href)) continue; // external: status-checked by crawl
        const k = it.text + '|' + it.href + '|' + it.tag;
        if (seenKeys.has(k)) continue;
        seenKeys.add(k);
        candidates.push(it);
      }
      for (const c of candidates) {
        const rec = { vp: vpName, page: key, index: c.i, tag: c.tag, text: c.text, href: c.href, inNav: c.inNav, inFooter: c.inFooter };
        try {
          await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.waitForTimeout(1500);
          await openMenuIfNeeded(page, vpName);
          const loc = page.locator(SEL).nth(c.i);
          const before = page.url();
          const popupP = ctx.waitForEvent('page', { timeout: 3000 }).catch(() => null);
          await loc.click({ timeout: 5000 });
          const popup = await popupP;
          await page.waitForTimeout(2500);
          rec.landedUrl = page.url();
          rec.title = await page.title();
          rec.h1 = await page.evaluate(() => { const h = document.querySelector('h1'); return h ? h.innerText.trim().slice(0, 120) : ''; });
          rec.looks404 = await looksLike404(page);
          rec.navigated = page.url() !== before;
          if (popup) {
            await popup.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
            rec.newTab = popup.url();
            await popup.close().catch(() => {});
          }
        } catch (e) {
          rec.error = String(e.message).split('\n')[0].slice(0, 200);
        }
        out.results.push(rec);
        console.error('[clicks] ' + vpName + ' ' + key + ' ' + (c.text || c.href).slice(0, 40) + ' -> ' + (rec.landedUrl || rec.error || '?'));
      }
      out.results.push({ vp: vpName, page: key, candidateCount: candidates.length, done: true });
    }
    await ctx.close();
  }
  await browser.close();
  out.finishedAt = new Date().toISOString();
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('done; records', out.results.length);
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
