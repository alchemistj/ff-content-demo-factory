# Monarch Roofing & Construction: current-site audit

Site: https://monarchroofingks.com/ (listed on the Google profile and in directories). Checked 2026-11-09 from the sandbox with Playwright (Chromium, headless). Scripts: `/tmp/claude-0/-home-user/9d8118b7-f5b3-5447-8eb5-932524a50e8e/scratchpad/monarch/check-domain.js`. No page of the site could be loaded, so no screenshots or page audit exist.

## Domain check (Playwright, 2026-11-09 17:52 UTC)

| URL tried | Result |
| --- | --- |
| https://monarchroofingks.com/ | `net::ERR_TUNNEL_CONNECTION_FAILED` |
| https://www.monarchroofingks.com/ | `net::ERR_TUNNEL_CONNECTION_FAILED` |
| http://monarchroofingks.com/ | `net::ERR_NAME_NOT_RESOLVED` |
| http://www.monarchroofingks.com/ | `net::ERR_NAME_NOT_RESOLVED` |

- The name does not resolve over plain HTTP. HTTPS fails at the tunnel step, which points to the outbound proxy refusing the host rather than a site error page. We cannot tell from here whether the domain has DNS or a server.
- No page loaded, so there is no title, H1, phone, or form to check.

## Wayback Machine (not checked)

- The archive could not be reached from the sandbox. The CDX index query (`web.archive.org/cdx/search/cdx?url=monarchroofingks.com`) reset the connection. A 2025 snapshot fetch also reset. WebFetch refuses web.archive.org.
- Result: what the site used to say, and when it was last captured, are **unknown**. Retry from another path before the demo goes out.

## What a customer who clicks "Website" gets

- The listed website is https://monarchroofingks.com/ (rooferdirectory.co and dispatchcore.io, see facts.md section 16). From this sandbox, that URL fails to load on both HTTP and HTTPS, so a customer on the same path would see a browser error, not the business.
- We did not open the Google profile itself, so we cannot confirm the exact link shown there.

## Other live site

- Searches for "monarchroofingks.com" and the business name surfaced no other website for this business. Directory pages list only monarchroofingks.com.
- Not confirmed: a search summary mentioned a "Monarch Roofing Construction LLC" at 505 W Meadow Creek Ct, Wichita, (316) 240-7613 (claimspages.com). The Claims Pages listing we fetched (https://www.claimspages.com/providers/kansas/sedgwick/roofing-inspections/3/) has no entry for it. Treat as unverified; it may be a different company or an old record.
- Several unrelated "Monarch Roofing" businesses (Myrtle Beach SC, Houston TX, Golden CO, Connecticut, Nebraska) appear in results. None is this business.

## What this means for the demo

- The owner has no working site today. A demo is a clean replacement for a dead link, and the audit cannot list broken pages because no page loaded.
- Before outreach: confirm the domain status from another path (a second network, or the owner's own check), and try the Wayback Machine again so the "what it used to say" line can be filled.
- Contact form: no form was seen or checked, because no page loaded. Outreach through the business's own form is not possible until the site is reachable. Do not use another contact path without Josh's OK.
