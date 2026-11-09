// Report which form fields are visible to a visitor, and the spam-protection markers. Submits nothing.
// Usage: node ramco-forms.cjs <outJson>
const { chromium } = require('playwright');
const fs = require('fs');

const ORIGIN = 'https://ramcowichita.com';
const PAGES = ['/', '/contact/', '/commercial-cleaning-services/windows/', '/about/careers/'];
const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };

const PROBE = () => {
  const shown = (el) => {
    let n = el;
    while (n && n.nodeType === 1) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      n = n.parentElement;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  return [...document.querySelectorAll('form')].map((f) => ({
    id: f.id || '',
    cls: String(f.className).slice(0, 80),
    visible: shown(f),
    inputs: [...f.querySelectorAll('input:not([type=hidden]),textarea,select')].map((x) => {
      const label = x.labels && x.labels[0] ? x.labels[0].innerText.trim().slice(0, 60) : '';
      const wrap = x.closest('.gfield,.form-group,div');
      return {
        tag: x.tagName,
        type: x.type,
        name: x.name,
        label: label || (wrap ? wrap.innerText.trim().slice(0, 60) : ''),
        required: x.required || x.getAttribute('aria-required') === 'true',
        visible: shown(x),
      };
    }),
    hiddenNames: [...f.querySelectorAll('input[type=hidden]')].map((x) => x.name).filter((n) => /ak_|honeypot|gform_unique|recaptcha/i.test(n)),
    recaptchaScripts: [...document.querySelectorAll('script[src]')].map((s) => s.src).filter((s) => /recaptcha|hcaptcha|turnstile/i.test(s)).slice(0, 3),
    recaptchaBadge: !!document.querySelector('.grecaptcha-badge'),
  }));
};

(async () => {
  const outPath = process.argv[2];
  const browser = await chromium.launch();
  const out = {};
  for (const vp of Object.keys(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: VIEWPORTS[vp] });
    const page = await ctx.newPage();
    out[vp] = {};
    for (const p of PAGES) {
      await page.goto(ORIGIN + p, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2500);
      out[vp][p] = await page.evaluate(PROBE);
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  for (const vp of Object.keys(out)) {
    for (const p of PAGES) {
      console.log('## ' + vp + ' ' + p);
      for (const f of out[vp][p]) {
        console.log('  form visible=' + f.visible + ' badge=' + f.recaptchaBadge + ' hidden=' + f.hiddenNames.join(',') + ' scripts=' + f.recaptchaScripts.join(','));
        for (const i of f.inputs) console.log('    ' + i.tag + ' ' + i.type + ' name=' + i.name + ' req=' + i.required + ' vis=' + i.visible + ' label=' + JSON.stringify(i.label));
      }
    }
  }
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
