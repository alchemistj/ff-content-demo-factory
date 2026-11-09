// Fetch one or more harrisfac.com URLs with plain HTTP and print their visible text, to quote exact wording.
// Usage: node scripts/analysis/page-text.cjs <outfile> <url> [url...]
// Writes the text to <outfile>. Read-only; no forms are submitted.
const fs = require('fs');
const https = require('https');
const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (audit; Fluid Frame prospect research)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(new URL(res.headers.location, url).href));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

function visibleText(html) {
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/footer|\/header|\/tr)[^>]*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'").replace(/&#8220;|&#8221;|&quot;/g, '"').replace(/&#8211;|&ndash;/g, '-').replace(/&#x27;|&#39;/g, "'");
  return s.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

(async () => {
  const outFile = process.argv[2];
  const urls = process.argv.slice(3);
  const parts = [];
  for (const u of urls) {
    try {
      const r = await get(u);
      parts.push(`=== ${u} (HTTP ${r.status})\n` + visibleText(r.body));
    } catch (e) {
      parts.push(`=== ${u} ERROR ${e.message}`);
    }
  }
  fs.writeFileSync(outFile, parts.join('\n\n'));
  console.log('wrote ' + outFile + ' (' + parts.length + ' pages)');
})();
