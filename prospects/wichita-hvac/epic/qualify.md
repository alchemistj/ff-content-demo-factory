# Qualify: Epic Heating & Cooling (Wichita, KS)

**Verdict: qualifies as a small HVAC specialist with a weak site (kind 1, 5-page demo).**

Checked 2026-11-09. Site: https://epichvac.net/ (https://epichvac.net/services/, https://epichvac.net/preventive-maintenance-plans/, https://epichvac.net/contact/). Google: 4.6 stars, 87 reviews (place_id ChIJ__9TvKLjuocRR8IhYzmJ-2w; see `reviews.json`).

## HVAC share of services
- All seven services on https://epichvac.net/services/ are HVAC work: Air Conditioning, Ventilation (bathroom ventilation), Heat (furnace), Water Source/Geothermal, WiFi Thermostats, High Efficiency Systems, Custom Sheetmetal Fab Shop (ducts).
- No plumbing, electrical, roofing or other trades appear on any page crawled.
- The H1 and tagline say "Residential and Commercial", but no page describes a commercial job. Reviews are all residential or small-business equipment swaps (Chris A.: four rooftop units for a brewery, the only commercial job seen).

## Site size and structure
- Nav: Home, Services, Preventive Maintenance Plans, Financing (external, to Synchrony), Contact.
- Three content pages plus the homepage. Each service is a section of one page, not its own page.
- Sitemap (Yoast): one page sitemap, last modified 2024-11-05 (https://epichvac.net/sitemap_index.xml).

## Headline and title (weak)
- Homepage H1: "Comfort Solutions Simplified". No trade, no town.
- Homepage title: "HVAC Services for Home & Business | Epic Heating and Cooling". No town.
- /services/ H1 "Residential and Commercial HVAC Services"; /preventive-maintenance-plans/ H1 "Preventive Maintenance Plans"; /contact/ H1 "Get in Touch With Us Today!". None names Wichita except the small "Serving Wichita, KS" block in the footer.

## Age signals
- "Epic Heating and Cooling has been delivering expert HVAC solutions since 2012" (homepage, https://epichvac.net/).
- "Preston has been in the HVAC industry since 1999, and Justin since 2000" (same page). That is the owners' experience, not the company age.
- Google review history starts 2017-08-01 (Kyle B.); the reviews file shows steady reviews 2017 to 2026.
- Footer shows "© 2026", so it is current.

## Builder
- WordPress, not Wix. Evidence: Yoast sitemap, Gravity Forms with reCAPTCHA on every page, and a Cloudflare block page that names wpenginepowered.com (curl from this environment returned 403 on every page; Playwright in headless Chromium loaded them).

## Other site problems that make it a weak fit today
- "Financing" (nav and "Get Financed" button) goes to a Synchrony merchant page that returns "404 ERROR PAGE NOT FOUND".
- No street address on the site, only "Serving Wichita, KS and Surrounding Areas". Google lists 339 N West St, Wichita, KS 67203.
- Homepage says "24/7 Availability" and "24/7 Emergency Services Office", but posted hours are "Monday–Friday: 8:00 AM-5:00 PM".

Full crawl results are in `audit.md`. Owner, certification and source facts are in `facts.md`.
