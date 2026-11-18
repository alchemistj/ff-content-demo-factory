# Coverage check: poormansheating.com

Checked 2026-11-16 (UTC) by the inventory brief.

## Verdict

**INCOMPLETE.** The live site blocks this session. Nothing beyond the homepage response was read, and the homepage itself returned an error page.

## What was tried

- `scripts/fetch-site-text.mjs` (headless Chromium, 60-page cap): `https://www.poormansheating.com/` returned HTTP 403, 2 words ("Error 403 Forbidden"). No links were found, so the crawl stopped after one page. See `site/home.md` and `site/INDEX.md`.
- `curl` on the homepage: HTTP 403. Response headers show `server: cloudflare` and a `__cf_bm` bot-management cookie, so the block comes from the site's Cloudflare protection, not from a local error.
- `curl` on `/sitemap.xml` and `/sitemap_index.xml`: both HTTP 403.
- The brief's step of listing the main menu, dropdowns and footer with Playwright could not be done. The rendered homepage contains only the 403 page, so no menu or footer links exist to list.
- Not attempted: any way around the block (other user agents, proxies, or retries against a challenge page). That is outside the brief.

## Menu, footer and sitemap list

Not available. The homepage and both sitemaps returned 403.

## Pages in site/

- `site/home.md`: the 403 page only (no real content).

Earlier work (qualify.md) recorded 16 crawled pages, with service H1s "Heating / AC", "Indoor Air Quality" and "Maintenance". Those pages are not in `site/` now. They were read in an earlier session, and this session cannot re-check them.

## What the site would need

- A reachable homepage (or a whitelisted fetch path) to rerun `scripts/fetch-site-text.mjs prospects/fortwayne-hvac/poormans https://www.poormansheating.com/ 60`.
- Then rebuild COVERAGE.md with the full menu, footer and sitemap, and recheck the earlier 16 pages.
