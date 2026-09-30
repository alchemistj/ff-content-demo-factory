# Internal handoff — Quality Heating & Air

This file is the writer handoff for this prospect. It is not customer copy and it is not the owner Strategy Overview.

## Scope

- Writable scope: `prospects/quality-heating-air/**` only.
- Parent branch: `cursor/lebanon-hvac-stage2-copy` at `38895cf79d4fc3ac60554c54cf29b2eb7d33da8c`.
- Canonical combined draft remains draft PR 42. This revision is a new branch so the parent can review and combine only these prospect changes later.
- No newer accepted Quality Heating & Air copy was on the parent. PR 42 has that one commit and no review comments.
- Moore Heating & Cooling files, shared guides, runtime, and `prospects/lebanon-hvac-2026-09-30-WRITER.md` were not changed.
- The earlier combined revision on Architect284 was paused with verified cancellation before this separate task.

## Writer

- Host: fluid-frame-dev-1
- Model: Grok 4.7 High, Fast off
- One writer for the homepage, both service pages, contact, header/footer, and owner Strategy Overview
- No nested writer, auditor, or editor

## Approval and process detail kept off the Strategy Overview

Josh approved the page jobs in chat on 2026-09-30: homepage intent HVAC contractor Lebanon MO, AC repair Lebanon MO, and heating repair Lebanon MO. Quoted approval: "Sounds good. Move it to stage two. Get cursor going on the words and QA cursor’s words and get it rocking." That approval allows top-ten Maps ranks and listing counts under 21. It does not accept this copy, a build, outreach, or Scout pipeline repairs on alchemistj/ff-2-demos#270.

No prior Cursor prescription existed in this repository. None was backfilled. Approved routes stayed `/`, `/home`, `/ac-repair-lebanon-mo`, `/heating-repair-lebanon-mo`, and `/contact`.

## Evidence access and spend

- Official evidence: https://www.qualityheatnow.com/ plus the existing research record.
- Prior Apify discovery spend remains USD 0.2832. No new spend was authorized or made.
- Apify dataset `o3rGh1edmkftb6dNG`, run `3s6cuct3drvx0BJNx`, was not re-read. `APIFY_API_TOKEN` was not used.
- Listing review count remains 192. Exact review text is still missing, so the package quotes nobody.
- Read-only checks on 2026-09-30 confirmed the shop NAP, hours, email `josh@qualityheatnow.com`, emergency sentence, financing URL, WhatsApp `https://wa.me/14172882968`, and the Jobber href.
- Lennox locator `https://www.lennox.com/residential/locate/dealer/mo/lebanon/quality-htg-and-air` still matches the address and phone. Premier Dealer, factory-trained, and mini-split copy on that page was not used as a badge.
- Shop nav links to general Lennox and Amana product pages, and to Lennox’s repair-vs-replace buyers guide, were left out of customer copy. They are not shop resources, and the buyers guide was not used to imply a repair-first policy.
- A HEAD request to the Jobber URL returned Cloudflare HTTP 403. The form was not submitted. Customer copy calls it an external work request, not an on-site booking or a confirmed appointment.
- Live site phone href is `tel:4175326239`. Markdown drafts link the shop phone with `tel:+14175326239` and the shop email with `mailto:josh@qualityheatnow.com`.
- `writing-package/v1` span hrefs accept only `http(s)` and site paths, so those tel and mailto targets are in the Markdown drafts, not in `writing-package.json` href fields. The package text uses the same phone and email.

## Package

- `packageId`: `website-copy-quality-heating-air`
- `runId`: `writing-2026-09-30-lebanon-hvac`
- `packageHash`: `71f16cbe068c46670008430f5daa22fca2f65d4c858a18bf5f9ff24a0f0f8aa8`
- Evidence fingerprint unchanged: `f966c0ab959c9a7e90148e582cfafc74b0a9045533371b63f358dcbb1171e976`
- Previous package hash on the parent: `3e3b063fca75912c5a9dd2fd46e6992e3c301ab4737ea8dc9c3d2b3c85b847c5`

## Not done

- No merge.
- No website code, build, or deploy.
- No outreach, CRM, or email.
- No schedule or runtime change.
- Google Docs publication was not run.
- Human copy QA is still required.
