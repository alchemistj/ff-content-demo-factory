# Coverage check: jgroofingco.com (checked 2026-11-16)

## Verdict: COMPLETE

Every page the live site lists (menu, footer, sitemap) is now saved in `site/`. One page, `/peoria`, was missing from the first crawl. Its rendered text is now in `site/peoria.md` (864 words; the audit counted 904, a render-timing difference).

## Menu (desktop, 1440 px, rendered home page)

| Menu item | Link | In site/ |
|---|---|---|
| HOME | https://www.jgroofingco.com/ | home.md |
| SERVICES | https://www.jgroofingco.com/services | services.md |
| PROJECTS | https://www.jgroofingco.com/projects | projects.md |
| ABOUT | https://www.jgroofingco.com/about | about.md |
| REVIEWS | https://www.jgroofingco.com/reviews | reviews.md |
| CONTACT | https://www.jgroofingco.com/ (home page form) | home.md (same page) |
| CALL OR TEXT | tel:309-316-3652 (not a page) | n/a |

Dropdowns: none. The menu has no sub-items.

## Footer

| Footer item | Link | In site/ |
|---|---|---|
| Home, Services, Projects, Contact | same URLs as the menu | yes |
| CALL OR TEXT | tel:309-316-3652 | n/a |
| Email | mailto:amanda@jgroofingco.com | n/a |
| Facebook | https://www.facebook.com/jgroofingandcompany | off-site, not read |
| Instagram | https://www.instagram.com/jgroofingco/ | off-site, not read |

## Sitemap

- `/sitemap.xml` is a sitemap index. It points to `https://www.jgroofingco.com/pages-sitemap.xml` (last modified 2026-09-29).
- `/sitemap_index.xml` returns 400 (not used).
- `pages-sitemap.xml` lists 6 URLs:

| Sitemap URL | In site/ |
|---|---|
| https://www.jgroofingco.com | home.md |
| https://www.jgroofingco.com/services | services.md |
| https://www.jgroofingco.com/projects | projects.md |
| https://www.jgroofingco.com/about | about.md |
| https://www.jgroofingco.com/reviews | reviews.md |
| https://www.jgroofingco.com/peoria | peoria.md (added this check) |

## Other links on the pages

- The "See More" and "See Pictures" links point to `/projects`.
- The "View More" link points to `/reviews`.
- Reviewer names link to Google Maps profiles (off-site, not read).
- The audit's internal link check (14 links, all HTTP 200) found no other internal pages.

## What was done

1. Rendered `https://www.jgroofingco.com/peoria` in headless Chromium (desktop width, network idle plus 1.5 s), the same method as `scripts/fetch-site-text.mjs`. Saved it as `site/peoria.md`. HTTP 200, title "Roofing Contractor in Peoria, IL | JG Roofing and Company", H1 "Roofing Contractor in Peoria, IL".
2. Added the `peoria.md` row to `site/INDEX.md`.
3. Did not re-run `fetch-site-text.mjs`. It crawls only from the homepage and does not reach `/peoria`, because no homepage link points there.

## Not read, and why

- The Facebook, Instagram, BBB and Google review pages. They are off the business's own site.
- GAF's contractor directory page returned HTTP 403 to both WebFetch and headless Chromium. It is a third-party credential check and is covered in `inventory.md`.
