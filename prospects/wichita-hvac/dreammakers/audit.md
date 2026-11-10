# Current-site audit: Dream Makers LLC Heating and Cooling

**Status: BLOCKED. The site could not be crawled.** Site: https://heatingandcooling.online/

## What was tried (2026-11-09, UTC session)

- **Playwright (headless Chromium), desktop 1440x900:** homepage, `/services/`, `/contact/`, `/wp-sitemap.xml`, `/sitemap_index.xml`, `http://` and `www.` variants. Every URL returned **HTTP 502, body "upstream request failed"** (Content-Type text/plain, nosniff). Repeated six or more times over about 15 minutes.
- **Playwright, phone 390x844:** not run. Nothing loaded, so there was nothing to crawl.
- **curl:** connection reset by peer on every attempt.
- **WebFetch on the homepage:** HTTP 503 Service Unavailable on the last attempt.
- **Egress proxy status** (`/__agentproxy/status`): recent relay failure for `heatingandcooling.online:443`, kind `ws_closed_mid_exchange` ("tunnel closed (code 1006) after 11s; 39 B received"). This points at the proxy relay or the origin dropping the connection. The 502 body is plain text, not a WordPress page, so it is most likely from the relay or the origin's edge. I have not confirmed which.
- **Background retry:** a loop checks the homepage about every 2 minutes. Log: `/tmp/claude-0/-home-user/aa201769-b39f-5f58-8ed1-98089532fb67/scratchpad/dm/retry.log`. Entries at 17:58, 18:00 and 18:03 UTC all returned curl 000 (no connection). The loop was still running at 18:03 UTC (12:03 PM Central) and had not reached 200. If the site comes up, the crawl runs then.

Nothing in this audit is a finding about the site's content. No screenshots exist yet.

## What is checked (off-site only)

These compare the Google and BBB records with each other. They say nothing about the site.

| Item | Google (from brief) | BBB profile | Match |
| --- | --- | --- | --- |
| Phone | (316) 871-5085 | (316) 871-5085 | Yes |
| Address | 5720 1/2 S Broadway, Wichita, KS 67216 | 5720 1/2 S Broadway Ave, Wichita, KS 67216 | Yes |
| Hours | not checked | Mon-Fri 8:00 AM to 5:00 PM; Sat and Sun closed | Google hours unverified |
| Name | Dream Makers LLC Heating and Cooling (site title); Google name per brief | "Dream Makers Heating & Cooling", alt "Dream Makers, LLC" | Close; legal name unverified |
| Services | not checked | AC repair, heater install, furnace repair, parts, water heaters | Site unchecked |

Source for BBB: https://www.bbb.org/us/ks/wichita/profile/heating-and-air-conditioning/dream-makers-heating-cooling-0714-300287228 (read through an automated summary; re-check by hand).

**Office check:** the Google and BBB records for "Dream Makers Heating & Cooling" agree on one address and one phone. A second BBB profile, "Dream Makers Home Improvement Heating and Cooling" (https://www.bbb.org/us/ks/wichita/profile/heating-and-air-conditioning/dream-makers-home-improvement-heating-and-cooling-0714-300185096), is at 5720 S Broadway Ave (no 1/2) with a different phone, (316) 550-3046, and a different owner (John Salmans). It is not confirmed as the same business. Once the site is up, check which phone and address the site shows. If the site shows (316) 550-3046 or the 5720 S Broadway address, the site and the Google profile disagree.

## Crawl checklist (to run when the site returns)

Per `docs/runtime/SITE-AUDIT.md`:
1. Every menu and button or card link at 390x844 and 1440x900: destination, right page or not, dead links, `#` links.
2. Every phone number: tel: link, does it dial the shown number, placeholder tel: values, every office tappable.
3. Every mailto: link: matches the shown address, placeholder addresses.
4. Forms: present, fields, spam protection, send (do not submit).
5. Placeholder or copied content: "copy-of" pages, template text, sample testimonials, lorem ipsum, wrong city, old copyright year.
6. Offices: each city and number the site names, versus Google and BBB.
7. Headline and title: homepage H1 and each page H1; `<title>`.
8. Services: each named service and whether it has its own page.
9. Speed: phone page-speed score if available.
10. Site versus Google and BBB: name, phone, services, hours.

Screenshots will go in `audit/`. None exist yet.

## Not checked

- The whole site (502 on every URL).
- Page-speed score (no run).
- Sitebulb export (none supplied).
- Google Business Profile hours and categories (not opened).
- Form behaviour (not submitted, by rule).
- Phone numbers and forms on the site; mobile layout.
