// Print body text of one crawled page. Usage: node midas-text.cjs <crawl.json> <viewport> <pagekey>
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const p = data.viewports[process.argv[3]].pages[process.argv[4]];
if (!p) { console.log('no such page; keys: ' + Object.keys(data.viewports[process.argv[3]].pages).join(', ')); process.exit(0); }
console.log(p.bodyText.split('\n').map((l) => l.trim()).filter(Boolean).join('\n'));
