// Decode Cloudflare email-protection hrefs and data-cfemail attributes in saved HTML files.
// Usage: node ramco-cfemail.cjs <file.html> [more.html ...]
const fs = require('fs');

const decode = (hex) => {
  const key = parseInt(hex.slice(0, 2), 16);
  let out = '';
  for (let i = 2; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return out;
};

const seen = new Map();
for (const file of process.argv.slice(2)) {
  const html = fs.readFileSync(file, 'utf8');
  const hrefHits = [...html.matchAll(/email-protection#([0-9a-f]+)/gi)].map((m) => m[1]);
  const attrHits = [...html.matchAll(/data-cfemail="([0-9a-f]+)"/gi)].map((m) => m[1]);
  const plain = [...html.matchAll(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)].map((m) => m[0]);
  for (const h of [...hrefHits, ...attrHits]) {
    const addr = decode(h);
    seen.set(addr, (seen.get(addr) || []).concat(file.split('/').pop()));
  }
  for (const p of plain) {
    seen.set('PLAIN ' + p, (seen.get('PLAIN ' + p) || []).concat(file.split('/').pop()));
  }
}
for (const [addr, files] of seen) {
  console.log(addr, '<-', [...new Set(files)].join(', '));
}
