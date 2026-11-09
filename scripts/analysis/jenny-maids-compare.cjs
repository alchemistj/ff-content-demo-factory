// Compare the saved page text: (1) how many lines of each town page are shared with the Wichita page,
// (2) which pages mention prices, insurance, bonding, background checks, guarantees, pets, Airbnb, move-in/out,
// (3) the distinct copy each town page adds. Read-only over audit/data/page-text.json.
const fs = require('fs');
const DATA = '/home/user/ff-content-demo-factory/prospects/wichita-cleaning/jenny-maids/audit/data/page-text.json';
const d = JSON.parse(fs.readFileSync(DATA, 'utf8'));

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const lines = (p) => d[p].text.split('\n').map(norm).filter((l) => l.length > 25);
const towns = ['/wichita-ks/', '/andover-ks/', '/augusta-ks/', '/goddard-ks/', '/derby-ks/', '/maize-ks/', '/park-city-ks/', '/valley-center-ks/', '/peck-ks/', '/wellington-ks/', '/kechi-ks/'];
const wichita = new Set(lines('/wichita-ks/'));
console.log('== TOWN PAGES: lines (>25 chars) shared with the Wichita page');
for (const t of towns) {
  const ls = lines(t);
  const shared = ls.filter((l) => wichita.has(l)).length;
  const townName = t.replace(/\//g, '').replace('-ks', '');
  const mentions = (d[t].text.match(new RegExp(townName.replace('-', '[ -]'), 'gi')) || []).length;
  console.log(t, 'lines=' + ls.length, 'shared=' + shared, 'mentions of town name=' + mentions, 'words=' + d[t].text.split(/\s+/).length);
}

const terms = /\$|price|pricing|cost|starting at|insur|bond|background|guarantee|satisf|pet|airbnb|move-in|move-out|move in|move out|license|licensed|employee|vetted|screen|key|supplies|eco|green|natural|allergy|contract|cancel|reschedul|refund|tip/i;
console.log('\n== TERMS (sentences) across pages');
for (const [p, t] of Object.entries(d)) {
  if (t.status !== 200) continue;
  const hits = norm(t.text).split(/(?<=[.!?])\s+|\n/).filter((s) => terms.test(s) && s.length < 260);
  const uniq = [...new Set(hits)].filter((h) => !/Cookies help|Reject All|Accept All/.test(h));
  if (uniq.length) console.log('--- ' + p + '\n  ' + uniq.slice(0, 12).join('\n  '));
}
