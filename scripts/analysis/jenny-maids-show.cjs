// Print saved visible text for chosen Jenny Maid's pages (argument list), or grep-style matches across all pages.
// Usage: node jenny-maids-show.cjs page:/about-us/ page:/packages/   |   node jenny-maids-show.cjs grep:<regex>
const fs = require('fs');
const DATA = '/home/user/ff-content-demo-factory/prospects/wichita-cleaning/jenny-maids/audit/data/page-text.json';
const d = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const args = process.argv.slice(2);
for (const a of args) {
  if (a.startsWith('page:')) {
    const p = a.slice(5);
    const t = d[p];
    console.log('===== ' + p + ' status=' + (t && t.status) + ' title=' + (t && t.title));
    console.log(t ? t.text.replace(/\n{2,}/g, '\n') : '(missing)');
  } else if (a.startsWith('grep:')) {
    const re = new RegExp(a.slice(5), 'gi');
    for (const [p, t] of Object.entries(d)) {
      const lines = t.text.split('\n');
      const hits = [];
      for (const line of lines) {
        if (re.test(line)) hits.push(line.trim().slice(0, 220));
        re.lastIndex = 0;
      }
      if (hits.length) console.log('--- ' + p + '\n  ' + [...new Set(hits)].join('\n  '));
    }
  }
}
