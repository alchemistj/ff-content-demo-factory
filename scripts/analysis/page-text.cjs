// Render a URL in Chromium and print its visible text. Usage: node page-text.cjs <url>
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.argv[2], { waitUntil: 'networkidle', timeout: 60000 });
  console.log(await page.evaluate(() => document.body.innerText));
  await browser.close();
})();
