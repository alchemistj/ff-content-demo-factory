// Summarize midas-crawl.cjs output. Usage: node midas-summary.cjs <crawl.json> [viewport]
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const vpName = process.argv[3] || 'desktop';
const vp = data.viewports[vpName];
const PATTERNS = /lorem|copy-of|samantha|example\.com|mysite|1234567890|placeholder|sample|your (text|name|company)|click to edit|coming soon|squarespace|wix|website builder|template|write a description|add your|insert/i;

for (const [key, p] of Object.entries(vp.pages)) {
  console.log('=== ' + key + ' status=' + p.status + ' final=' + p.finalUrl);
  console.log('  title: ' + p.title);
  console.log('  meta: ' + p.meta.join(' | ').slice(0, 400));
  console.log('  H1: ' + p.h1.map((h) => (h.visible ? '' : '[hidden]') + h.text).join(' || '));
  console.log('  H2/H3: ' + p.headings.slice(0, 40).join(' / '));
  const copy = p.bodyText.match(/(©|copyright)[^\n]{0,40}/gi) || [];
  console.log('  copyright: ' + JSON.stringify(copy));
  const phones = [...new Set(p.bodyText.match(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g) || [])];
  console.log('  phones in text: ' + JSON.stringify(phones));
  console.log('  tel links: ' + JSON.stringify(p.tels));
  console.log('  mailto links: ' + JSON.stringify(p.mailtos));
  console.log('  forms: ' + JSON.stringify(p.forms.map((f) => ({ action: f.action, visible: f.visible, fields: f.fields.map((x) => (x.type || x.tag) + ':' + (x.name || x.label || x.placeholder)), buttons: f.buttons }))));
  console.log('  captcha hints: ' + JSON.stringify(p.captchaHints) + ' iframes: ' + JSON.stringify(p.iframes));
  const captchaScripts = p.scripts.filter((s) => /captcha|recaptcha|hcaptcha|turnstile/i.test(s));
  console.log('  captcha scripts: ' + JSON.stringify(captchaScripts));
  const pat = [...new Set((p.bodyText.match(new RegExp(PATTERNS.source, 'gi')) || []).map((s) => s.toLowerCase()))];
  console.log('  template-pattern hits in body text: ' + JSON.stringify(pat));
  const hrefHits = p.anchors.filter((a) => a.href === '#' || a.href === '' || /javascript:/i.test(a.href)).map((a) => a.text + ' -> ' + a.href);
  console.log('  dead/hash anchors: ' + JSON.stringify(hrefHits));
  console.log('  nav anchors: ' + JSON.stringify(p.anchors.filter((a) => a.inNav).map((a) => a.text + ' -> ' + a.href + (a.visible ? '' : ' [hidden]'))));
  console.log('  footer anchors: ' + JSON.stringify(p.anchors.filter((a) => a.inFooter).map((a) => a.text + ' -> ' + a.href)));
  console.log('  other anchors: ' + JSON.stringify(p.anchors.filter((a) => !a.inNav && !a.inFooter && /^(https?|tel|mailto)/.test(a.href) || (!a.inNav && !a.inFooter && a.href.startsWith('/'))).map((a) => (a.text || a.aria || '(img/no text)') + ' -> ' + a.href)));
  console.log('  json-ld: ' + JSON.stringify(p.jsonLd).slice(0, 300));
  console.log('');
}
console.log('ERRORS: ' + JSON.stringify(vp.errors));
console.log('SITEMAP status: ' + data.sitemap.status + ' ' + (data.sitemap.body || '').slice(0, 1500));
console.log('ROBOTS: ' + (data.robots.body || '').slice(0, 400));
console.log('LINK STATUS (non-200 marked):');
for (const [u, s] of Object.entries(data.linkStatus)) console.log('  ' + s + '  ' + u);
