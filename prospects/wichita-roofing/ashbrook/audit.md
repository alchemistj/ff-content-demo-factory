# Ashbrook Roofing & Contracting: current-site audit

Site: http://ashbrookroofs.com/ (listed on the Google profile). Checked 2026-11-09 with Playwright (Chromium), 1440x900. Script and raw results: `/tmp/claude-0/-home-user/9d8118b7-f5b3-5447-8eb5-932524a50e8e/scratchpad/ashbrook/check.js` and `results.json`. Screenshots are in `audit/`.

## What happens (all four variants)

| Variant | Result | Screenshot |
| --- | --- | --- |
| http://ashbrookroofs.com/ | Redirected to https://ashbrookroofs.com/. HTTP 502. Page text: "upstream request failed" | `audit/desktop-1.png` |
| https://ashbrookroofs.com/ | HTTP 502. Page text: "upstream request failed" | `audit/desktop-2.png` |
| http://www.ashbrookroofs.com/ | Redirected to https://ashbrookroofs.com/. HTTP 502. Same text | `audit/desktop-3.png` |
| https://www.ashbrookroofs.com/ | HTTP 502. Same text. No redirect | `audit/desktop-4.png` |

- No page title and no site content rendered in any variant. The only content is the plain-text error.
- The error is served by the host's proxy ("upstream request failed"), so the origin server did not answer. This is consistent with the site being down, not with a page that loads slowly.
- The same 502 was seen by the earlier checks today (per the brief).

## What a customer gets from the Google profile

- Google Maps profile (https://www.google.com/maps/place/?q=place_id:ChIJraTxgPS29wwRd01lLXDuxh4) shows the website as "ashbrookroofs.com" with the link to http://ashbrookroofs.com/. Opened in Playwright, the link was the same URL. Screenshot: `audit/google-profile-maps.png`.
- Clicking "Website" sends the customer to the 502 page above. The profile itself shows 4.9, "Roofing contractor", the Wichita address, the phone (+1 316-402-8470) and "Open · Closes 5 PM", so the phone path still works. The site path does not.

## Wayback Machine

- Not checked. The Wayback Machine could not be reached from this environment: `web.archive.org` CDX and snapshot requests were reset by the connection (three tries), and WebFetch refused the URL. Nothing about the old site content is claimed here.
- Retry the URL https://web.archive.org/web/2025*/ashbrookroofs.com from a normal browser before the call. The result will tell us what the site used to say and its last capture date.

## Other checks

- The Google profile address (101 S Martinson St, Wichita) and the BBB profile location (Clearwater, KS 67026-9055) differ. The phone matches on both. See facts.md section 7.
- The Kansas AG roofing registry page returned 403, so registration was not checked (facts.md section 14).

## Gaps

- The site cannot be audited for content, links, forms or speed while it returns 502. No audit of its pages, contact form or copy is possible yet.
- If the site comes back, re-run `check.js` and audit the pages then.
