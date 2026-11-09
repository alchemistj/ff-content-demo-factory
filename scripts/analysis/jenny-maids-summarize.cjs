// Summarize the Jenny Maid's crawl JSON into compact tables for audit.md.
const fs = require('fs');
const path = require('path');
const DATA = '/home/user/ff-content-demo-factory/prospects/wichita-cleaning/jenny-maids/audit/data/crawl.json';
const d = JSON.parse(fs.readFileSync(DATA, 'utf8'));

console.log('== PAGES');
for (const [url, p] of Object.entries(d.pages)) {
  const x = p.desktop || {};
  const tel = (x.tel || []).map((t) => t.href + ' "' + t.text + '"').join(' | ');
  const mail = (x.mail || []).map((t) => t.href).join(' | ');
  const h1 = (x.h1 || []).join(' / ');
  const hits = (x.hits || []).join(',');
  console.log([p.nav.status, url.replace('https://jennymaidsict.com', ''), 'words=' + x.words, 'title=' + JSON.stringify(x.title), 'h1=' + JSON.stringify(h1).slice(0, 160), 'tel=' + tel, 'mail=' + mail, 'hits=' + hits, 'forms=' + (x.forms || []).length, 'copy=' + JSON.stringify(x.copy || []), 'broken=' + (x.brokenImgs || []).length].join(' ; '));
}

console.log('\n== CLICKS');
for (const c of d.clicks) console.log(JSON.stringify({ control: c.control, before: c.urlBefore, after: c.urlAfter, submenuFirst: c.visibleSubmenuLinks.slice(0, 3) }));

console.log('\n== CTA HREFS (home)');
console.log(JSON.stringify(d.ctaHrefs));

console.log('\n== CLICK TO CALL');
console.log(JSON.stringify(d.clickToCall));

console.log('\n== FIRST TIME CLEANING');
console.log(JSON.stringify(d.firstTime));

console.log('\n== FAQ');
for (const f of d.faq) console.log(JSON.stringify(f));

console.log('\n== PHONE HEADER BUTTONS');
console.log(JSON.stringify(d.phone && d.phone.visibleHeaderButtons));
console.log('== PHONE MENU OPENED');
console.log(JSON.stringify(d.phone && d.phone.menuOpened));

console.log('\n== CONTACT PAGE');
const c = d.contact || {};
console.log(JSON.stringify({ title: c.title, h1: c.h1, forms: c.forms, captcha: c.captcha, tel: c.tel, mail: c.mail, hits: c.hits, copy: c.copy }));
console.log('contact headings:', JSON.stringify((c.headings || []).slice(0, 25)));
