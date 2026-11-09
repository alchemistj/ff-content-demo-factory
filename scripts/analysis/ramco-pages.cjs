// Compact per-page table from the Ramco crawl JSON, one row per page per viewport.
// Usage: node ramco-pages.cjs <crawlJson> [viewport]
const fs = require('fs');

const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const only = process.argv[3];
const TERMS = ['lorem', 'john doe', 'samantha', 'sample', 'placeholder', 'h2:', 'copy of', 'copy-of', 'featured vendors', 'partners info', 'write a description', 'yext', 'untitled', 'coming soon', 'example', 'johnson', 'test'];
const rows = [];
for (const vp of Object.keys(data.viewports)) {
  if (only && vp !== only) continue;
  const v = data.viewports[vp];
  rows.push('=== ' + vp + ' (pages ' + Object.keys(v.pages).length + ', errors ' + v.errors.length + ')');
  for (const e of v.errors) rows.push('ERR ' + e.url + ' ' + e.error.slice(0, 120));
  for (const key of Object.keys(v.pages)) {
    const p = v.pages[key];
    const low = p.bodyText.toLowerCase();
    const hits = TERMS.filter((t) => low.includes(t));
    const hiddenH = p.headings.filter((h) => !h.visible).map((h) => h.text).join(' / ');
    rows.push([
      key,
      'st' + p.status,
      'w' + p.scrollWidth,
      'title=' + p.title,
      'h1=' + p.h1.map((h) => h.text + (h.visible ? '' : '[hid]')).join(' | '),
      'forms=' + p.forms.length,
      'tels=' + p.tels.map((t) => t.href).join(','),
      'mailto=' + p.mailtos.map((t) => t.href).join(','),
      'copy=' + p.copyright.map((c) => c.slice(0, 20)).join(' | '),
      'hits=' + hits.join(','),
      hiddenH ? 'hiddenH=' + hiddenH.slice(0, 200) : '',
      'len=' + p.bodyText.length,
    ].join('  ;  '));
  }
}
console.log(rows.join('\n'));
