// Summarize the crawl JSON (audit/data/crawl-<vp>.json) into a compact digest for audit.md.
// Usage: node scripts/analysis/digest.cjs <mobile|desktop>
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const vp = process.argv[2] || 'desktop';
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit', 'data', `crawl-${vp}.json`), 'utf8'));
const out = [];
const log = (s = '') => out.push(s);

log(`# Digest ${vp} (${data.viewport.width}x${data.viewport.height})`);
log('');
log('## Pages');
for (const p of data.pages) {
  if (p.error) { log(`- ERROR ${p.url}: ${p.error}`); continue; }
  const h1 = (p.headings || []).filter((h) => h.tag === 'H1').map((h) => h.text);
  log(`- ${p.httpStatus} ${p.url}`);
  log(`    title: ${p.title}`);
  log(`    h1: ${JSON.stringify(h1)} | navCount=${p.navCount} | links=${p.links.length} buttons=${p.buttons.length} forms=${p.forms.length} imgs=${p.imgs.length} (no alt attr: ${p.imgs.filter((i) => !i.hasAltAttr).length})`);
  log(`    meta desc: ${p.metaDescription || '(none)'}`);
  const phones = Array.from(new Set((p.bodyText.match(/\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/g) || [])));
  log(`    phone strings in text: ${JSON.stringify(phones)}`);
  const copy = p.bodyText.match(/(©|copyright)[^.]{0,60}/gi) || [];
  log(`    copyright: ${JSON.stringify(Array.from(new Set(copy)))}`);
  const ph = p.bodyText.match(/lorem|placeholder|write a description|sample|copy-of|johnson|coming soon|template/gi) || [];
  log(`    placeholder-ish hits: ${JSON.stringify(Array.from(new Set(ph)))}`);
  log(`    captcha: ${JSON.stringify(p.captcha)}`);
}

const first = data.pages.find((p) => !p.error);
log('');
log('## Links on home page (text -> resolved, region, visible, target)');
const seenL = new Set();
for (const l of first.links) {
  const key = `${l.text}|${l.rawHref}|${l.region}|${l.visible}`;
  if (seenL.has(key)) continue;
  seenL.add(key);
  log(`- "${l.text}" -> raw ${JSON.stringify(l.rawHref)} resolved ${l.resolved} [${l.region}] visible=${l.visible}${l.target ? ' target=' + l.target : ''}`);
}

log('');
log('## Anchors whose href is # or javascript or empty (all pages)');
const bad = new Map();
for (const p of data.pages) for (const l of (p.links || [])) {
  if (l.rawHref === null || l.rawHref === '#' || /^javascript:|^\s*$/.test(l.rawHref || '')) {
    const k = `${l.text} | ${l.rawHref} | ${l.region}`;
    bad.set(k, (bad.get(k) || 0) + 1);
  }
}
for (const [k, n] of bad) log(`- ${k} x${n}`);

log('');
log('## tel: and mailto: links (all pages, deduped)');
const tm = new Map();
for (const p of data.pages) for (const t of (p.telMailto || [])) {
  const k = `${t.shows} | ${t.href} | ${t.region}`;
  tm.set(k, (tm.get(k) || 0) + 1);
}
for (const [k, n] of tm) log(`- ${k} x${n}`);

log('');
log('## Forms (all pages, deduped)');
const fm = new Map();
for (const p of data.pages) for (const f of (p.forms || [])) {
  const k = JSON.stringify({ action: f.action, method: f.method, region: f.region, fields: f.fields.map((x) => `${x.tag}:${x.type}:${x.name}:${x.placeholder || ''}:${x.label}:${x.required ? 'req' : ''}`), buttons: f.buttons });
  fm.set(k, (fm.get(k) || 0) + 1);
}
for (const [k, n] of fm) log(`- x${n} ${k}`);

log('');
log('## Headings per page (H1 and H2 only)');
for (const p of data.pages) {
  if (p.error) continue;
  log(`- ${p.url}`);
  for (const h of (p.headings || [])) if (h.tag !== 'H3' && h.text) log(`    ${h.tag}${h.visible ? '' : '(hidden)'}: ${h.text}`);
}

log('');
log('## Target status (internal link probes)');
for (const [t, s] of Object.entries(data.targetStatuses || {})) log(`- ${s} ${t}`);

fs.writeFileSync(path.join(ROOT, 'audit', 'data', `digest-${vp}.txt`), out.join('\n'));
console.log(`wrote digest-${vp}.txt (${out.length} lines)`);
