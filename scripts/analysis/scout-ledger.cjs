// Build scout/<slug>/ledger.json + ledger.md from a qualifier report table.
// Usage: node scout-ledger.cjs <qualify.md> <out dir> <slug> <next_start_rank> <picked names comma-separated>
const fs = require('fs');
const path = require('path');
const [src, out, slug, next, picked] = process.argv.slice(2);
const pickedSet = new Set(picked.split(',').map((s) => s.trim().toLowerCase()));
const md = fs.readFileSync(src, 'utf8');
const rows = [];
for (const line of md.split('\n')) {
  if (!/^\|\s*\d+/.test(line)) continue;
  const c = line.split('|').slice(1, -1).map((s) => s.trim().replace(/\*\*/g, ''));
  let status = c[2].toLowerCase();
  if (pickedSet.has(c[1].toLowerCase())) status = 'picked';
  else if (status.startsWith('qualified')) status = 'qualified-backlog';
  else if (status.startsWith('too-big')) status = 'disqualified (too big)';
  else if (!status.startsWith('disqualified')) status = 'disqualified (' + status + ')';
  rows.push({ rank: Number(c[0]), name: c[1], status, reason: c[3], website: c[4], reviews: c[5] });
}
const ledger = { slug, updated: '2026-11-09', run: 'wichita-cleaning Architect', next_start_rank: Number(next), checked: rows };
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
const lines = [`# Ledger: ${slug}`, '', `Updated 2026-11-09 (wichita-cleaning Architect). next_start_rank: ${next}.`, '', '| Rank | Business | Status | Reason |', '|---|---|---|---|'];
for (const r of rows) lines.push(`| ${r.rank} | ${r.name} | ${r.status} | ${r.reason} |`);
fs.writeFileSync(path.join(out, 'ledger.md'), lines.join('\n') + '\n');
console.log(`${rows.length} rows -> ${out}`);
