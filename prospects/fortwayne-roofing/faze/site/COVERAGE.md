# Coverage: fazeconstruction.com (checked 2026-11-16)

Verdict: **COMPLETE**

Every menu, dropdown, footer and sitemap.xml URL (sitemap_index.xml returns 404) was fetched and rendered in a browser, and each returned HTTP 200. Non-www duplicates (https://fazeconstruction.com/...) were not separately fetched; they repeat the www pages. Nothing was blocked, no login or CAPTCHA was hit. Sitemap `lastmod` dates run to 2026-11-10.

## Main menu
- Home, About Us, Services, Contact, Blog
- Our Services dropdown: Roofing, Siding, Gutters, Window Replacement, Kitchen Remodeling, Bathroom Remodeling
- Free calculators (footer and header): roof, window, siding, bath

## Footer
Same six services and Home/About/Services/Contact/Blog, plus the phone (260) 226-8800 and Info@fazeconstruction.com.

## Sitemap.xml list and where each page is
In site/ (name = path with `/` replaced by `_` for nested city pages):
- Root: home, about, services, contact, blog, privacy-policy, service-area, portfolio, roofing, siding, gutters, window-replacement, kitchen-remodeling, bathroom-remodeling, fort-wayne, fort-wayne-roofing, auburn, woodburn, huntertown, new-haven, leo-cedarville, churubusco, columbia-city, ohio, roanoke, ossian
- Fort Wayne nested: fort-wayne_roofing, _siding, _gutters, _window-replacement, _kitchen-remodeling, _bathroom-remodeling
- City service pages (6 each, 9 cities): auburn, churubusco, columbia-city, huntertown, leo-cedarville, new-haven, ohio, roanoke, ossian, woodburn. Files are `<city>_<service>.md`. Ohio has 6, roanoke 6, ossian 6 (Ohio pages are generic copy, not Ohio towns).
- Calculators: roofcalculator, window-calculator, sidingcalculator, free-bath-calculator
- Blog and article pages (every article listed in sitemap.xml): fetched as `<slug>.md`. The fetch script truncates long slugs.
- Also present: fort-wayne-roofing-contractor-replacement-checks.md

Not fetched: none from the sitemap or menus.

## Notes
- Fetch method: `scripts/fetch-site-text.mjs` for the first 50 pages (stopped early because it was crawling non-www duplicates). The remaining pages were rendered with Playwright into the same format.
- Pages named in the sitemap but with no real content of their own (Ohio towns): ohio.md and ohio_*.md use the same template, with "Buckeyes" copy.
