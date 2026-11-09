// Summarize the Ramco crawl JSON into a compact text report.
// Usage: node ramco-summarize.cjs <crawlJson>
const fs = require('fs');

const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = [];
const log = (s = '') => out.push(s);

log('sitemap status ' + (data.sitemap && data.sitemap.status) + ' len ' + (data.sitemap && data.sitemap.length));
log('robots status ' + (data.robots && data.robots.status));
log('www redirect: ' + JSON.stringify(data.wwwRedirect));
log('');

for (const vp of Object.keys(data.viewports)) {
  const v = data.viewports[vp];
  log('=== VIEWPORT ' + vp + ' pages=' + Object.keys(v.pages).length + ' errors=' + v.errors.length);
  for (const e of v.errors) log('  ERROR ' + e.url + ' ' + e.error);
  for (const key of Object.keys(v.pages)) {
    const p = v.pages[key];
    log('--- ' + key + ' status=' + p.status + ' final=' + p.finalUrl + ' scrollW=' + p.scrollWidth + '/' + p.viewportWidth);
    log('  title: ' + p.title);
    log('  meta: ' + p.meta.join(' | '));
    log('  h1: ' + p.h1.map((h) => (h.visible ? '' : '[hidden]') + h.text).join(' || '));
    log('  h2/h3/h4: ' + p.headings.map((h) => h.tag + (h.visible ? '' : '[hid]') + ':' + h.text).join(' || '));
    log('  copyright: ' + p.copyright.join(' | '));
    log('  phone text on page: ' + p.phoneTextMatches.join(', '));
    log('  forms: ' + p.forms.length + ' captchaHints: ' + p.captchaHints.join(', '));
    for (const f of p.forms) {
      log('    form action=' + f.action + ' visible=' + f.visible + ' fields=' + f.fields.map((x) => x.tag + ':' + x.type + ':' + (x.label || x.placeholder || x.name)).join('; ') + ' buttons=' + f.buttons.join('|'));
    }
    log('  tels: ' + p.tels.map((t) => t.href + ' [' + t.text + ']' + (t.visible ? '' : ' (hidden)')).join('; '));
    log('  mailtos: ' + p.mailtos.map((t) => t.href + ' [' + t.text + ']').join('; '));
    const navLinks = p.anchors.filter((a) => a.inNav && a.visible);
    log('  nav links: ' + navLinks.map((a) => (a.text || a.aria || '(no text)') + ' -> ' + a.href).join(' | '));
    const bodyLinks = p.anchors.filter((a) => !a.inNav && !a.inFooter && a.visible);
    log('  body links: ' + bodyLinks.map((a) => (a.text || a.aria || '(no text)') + ' -> ' + a.href).join(' | '));
    const footLinks = p.anchors.filter((a) => a.inFooter);
    log('  footer links: ' + footLinks.map((a) => (a.text || a.aria || '(no text)') + ' -> ' + a.href).join(' | '));
    const hashy = p.anchors.filter((a) => a.href === '#' || a.href === '' || a.href === 'javascript:void(0)');
    log('  hash/empty links: ' + hashy.length + ' ' + hashy.map((a) => a.text).join(', '));
    log('  buttons: ' + p.buttons.filter((b) => b.visible).map((b) => (b.text || b.aria || '(no text)') + (b.inForm ? '[form]' : '')).join(' | '));
    const flags = [];
    const lower = p.bodyText.toLowerCase();
    for (const term of ['lorem', 'john doe', 'sample', 'placeholder', 'h2:', 'h1:', 'h3:', 'copy of', 'featured vendors', 'partners info', 'insert', 'coming soon', 'write a description', 'your text here', 'example', 'yext', 'untitled']) {
      if (lower.includes(term)) flags.push(term);
    }
    log('  placeholder-term hits: ' + flags.join(', '));
    log('  body text length: ' + p.bodyText.length);
  }
  log('');
}

log('=== LINK STATUS (all distinct http(s) links seen)');
for (const [href, st] of Object.entries(data.linkStatus)) {
  log(String(st) + ' ' + href);
}

fs.writeFileSync(process.argv[2] + '.summary.txt', out.join('\n'));
console.log('wrote ' + process.argv[2] + '.summary.txt lines=' + out.length);
