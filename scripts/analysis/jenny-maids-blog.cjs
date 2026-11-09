// Follow every blog "READ MORE" link on the Jenny Maid's blog: status, title, H1, word count,
// prices or discount figures, and any owner/years/insurance wording. Also measure town-page
// similarity with the town name swapped out. Read-only.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = '/home/user/ff-content-demo-factory/prospects/wichita-cleaning/jenny-maids/audit/data';
const pt = JSON.parse(fs.readFileSync(path.join(OUT, 'page-text.json'), 'utf8'));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://jennymaidsict.com/blog/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);
  const posts = await page.evaluate(() => [...document.querySelectorAll('a')]
    .filter((a) => /read more/i.test(a.innerText || '') || /\/blog\/[a-z0-9-]+\/?$/i.test(a.getAttribute('href') || ''))
    .map((a) => ({ text: (a.innerText || '').trim().slice(0, 60), href: a.href })));
  const unique = [...new Map(posts.map((p) => [p.href, p])).values()].filter((p) => p.href.startsWith('https://jennymaidsict.com/'));
  const results = [];
  for (const p of unique) {
    const resp = await page.goto(p.href, { waitUntil: 'load', timeout: 60000 }).catch(() => null);
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const txt = (document.body.innerText || '').replace(/\s+/g, ' ');
      const h1 = [...document.querySelectorAll('h1')].map((h) => (h.innerText || '').trim()).filter((t) => t && !/^\(316/.test(t));
      const money = (txt.match(/[^.]{0,80}(\$\s?\d[\d,.]*|\d+\s?%|percent|per hour|starting at)[^.]{0,80}/gi) || []).slice(0, 6);
      const claims = (txt.match(/[^.]{0,80}(insur|bonded|background check|licensed|owner|founded|since 20|years of|Jenny (?:is|has|started)|I am|my name)[^.]{0,80}/gi) || []).slice(0, 6);
      return { h1, words: txt.trim().split(' ').length, money, claims, bodyStart: txt.slice(0, 200) };
    });
    results.push({ text: p.text, href: p.href, status: resp ? resp.status() : null, ...info });
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'blog-posts.json'), JSON.stringify(results, null, 2));
  for (const r of results) {
    console.log(r.status, r.href.replace('https://jennymaidsict.com', ''), 'words=' + r.words, 'h1=' + JSON.stringify(r.h1));
    if (r.money.length) console.log('   money:', JSON.stringify(r.money));
    if (r.claims.length) console.log('   claims:', JSON.stringify(r.claims));
  }

  // Town pages with the town name swapped out: how much of each page is the same text
  const towns = ['wichita-ks', 'andover-ks', 'augusta-ks', 'goddard-ks', 'derby-ks', 'maize-ks', 'park-city-ks', 'valley-center-ks', 'peck-ks', 'wellington-ks', 'kechi-ks'];
  const names = { 'wichita-ks': 'Wichita', 'andover-ks': 'Andover', 'augusta-ks': 'Augusta', 'goddard-ks': 'Goddard', 'derby-ks': 'Derby', 'maize-ks': 'Maize', 'park-city-ks': 'Park City', 'valley-center-ks': 'Valley Center', 'peck-ks': 'Peck', 'wellington-ks': 'Wellington', 'kechi-ks': 'Kechi' };
  const norm = (t, name) => t.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 25)
    .map((l) => l.split(name).join('TOWN'));
  const base = new Set(norm(pt['/wichita-ks/'].text, 'Wichita'));
  console.log('\n== TOWN PAGES, town name swapped out');
  for (const t of towns.slice(1)) {
    const ls = norm(pt['/' + t + '/'].text, names[t]);
    const shared = ls.filter((l) => base.has(l)).length;
    console.log(t, 'lines=' + ls.length, 'identical to Wichita template after name swap=' + shared, 'pct=' + Math.round(100 * shared / ls.length) + '%');
  }
})().catch((e) => { console.error('BLOG FAILED', e); process.exit(1); });
