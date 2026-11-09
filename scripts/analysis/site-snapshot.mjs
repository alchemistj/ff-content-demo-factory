// Quick homepage snapshot for qualifying prospects: title, H1, internal page count, tel links, builder hints.
// Usage: node scripts/analysis/site-snapshot.mjs <url> [<url> ...]
import { createRequire } from "node:module";
const { chromium } = createRequire("/opt/node-tools/")("playwright");

const urls = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
for (const url of urls) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => {
      const host = location.hostname.replace(/^www\./, "");
      const links = [...document.querySelectorAll("a[href]")].map((a) => a.href);
      const internal = new Set(
        links
          .filter((h) => { try { const u = new URL(h); return u.hostname.replace(/^www\./, "") === host; } catch { return false; } })
          .map((h) => { const u = new URL(h); return u.pathname.replace(/\/$/, "") || "/"; })
      );
      const tels = [...new Set([...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute("href")))];
      const html = document.documentElement.outerHTML;
      const builder = ["wix", "squarespace", "godaddy", "wordpress", "weebly", "duda", "webflow", "shopify", "hibu", "scorpion", "servicetitan", "blue corona", "localsplash"]
        .filter((b) => html.toLowerCase().includes(b));
      const h1 = [...document.querySelectorAll("h1")].map((h) => h.innerText.trim().replace(/\s+/g, " ")).slice(0, 2);
      const text = document.body ? document.body.innerText : "";
      return {
        final: location.href,
        title: document.title,
        h1,
        pages: internal.size,
        paths: [...internal].slice(0, 25),
        tels,
        builder,
        words: text.split(/\s+/).length,
        copyright: (text.match(/(©|copyright)\s*\D{0,10}(20\d\d)/i) || [])[2] || "",
        plumbing: /plumb/i.test(text),
        electric: /electric/i.test(text),
      };
    });
    console.log(JSON.stringify({ url, ...info }));
  } catch (e) {
    console.log(JSON.stringify({ url, error: String(e.message).slice(0, 120) }));
  }
  await page.close();
}
await browser.close();
