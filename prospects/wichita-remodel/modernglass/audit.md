# Modern Glass Structures: current-site audit

Site: https://modernglassstructures.com/ (one page). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900. Screenshots are in `audit/`.

## What works
- The page loads fast (HTTP 200) and nothing is visibly broken.
- The top says what they do: "Custom Residential & Commercial Glass", with the line "Shower Doors · Mirrors · Storefronts · Custom Projects" under the logo.
- Four real customer reviews appear on the page (Veysi Barut, Vickie, "G, Diego", "N, John").
- Every "Click for a Quote" button opens the same working Typeform. Facebook and Instagram links open their profiles.
- The phone number, email and address are in the footer, and the number matches the Google profile, (316) 712-8147.

## What is broken, most costly first

1. **The top of the page says no town and has no headline Google can read.** The page has no H1, H2 or H3 at all; "Custom Residential & Commercial Glass" is styled text. "Wichita" appears only in the footer address. The browser-tab title is "Modern Glass Structures" and the description is "glass shop". Nothing says "glass company in Wichita" or "shower doors Wichita". Screenshot: `audit/desktop-home-top.png`, `audit/mobile-home-top.png`.
2. **Nothing taps to call.** Zero `tel:` links on the page at 390 px and at 1440 px. The number is plain text in the footer ("Phone -(316) 712-8147") at the very bottom of the page, so a visitor on a phone has to copy it. The email in the footer is plain text too (no `mailto:` link). Screenshot: `audit/mobile-footer-plain-phone.png`.
3. **One page, no page for any service.** There is no menu (no nav element). The "What We Do" tiles (Residential Glass Installation, Commercial Glass, Shower Glass, Mirrors, Custom Cut Glass, Specialty Glass, Glass Technology) are not links. No page exists for shower doors, mirrors or windows, and the word "window" appears nowhere on the page although customers buy windows and window glass (Magnolia W. reports over 30 windows). Screenshot: `audit/desktop-home-full.png`.
4. **The quote path leaves the site.** All six quote buttons and image links open an outside Typeform (7a9hkhe9ecc.typeform.com) in the same tab. Its first screen says "A phone number or email is required to get back to you" with a Start button. The site has no form of its own. No reCAPTCHA, hCaptcha or Turnstile string appears in the page source, and the Typeform intro screen shows none. I did not start the form, so its fields and what it does with a submission are unverified. Screenshot: `audit/mobile-quote-typeform.png`.
5. **Proof is thin and awkwardly labeled.** Four reviews show, with names in odd forms ("-G, Diego", "-N, John", "-Vickie"), and none sit beside the service they back. The Google profile has 25 reviews at 4.8. Screenshot: `audit/mobile-home-top.png`.
6. **Photos have no description.** All 20 images on the page have empty alt text, so Google and screen readers cannot tell a shower door from a storefront. One image in "Our Work" showed a loading spinner at screenshot time (a video element); unverified whether it ever plays. Screenshot: `audit/mobile-home-top.png`.

## Offices and Google profile
One location: 1301 E Harry, Wichita, KS 67211 (site footer), matching the Google profile address (1301 E Harry St). One number, (316) 712-8147, on both. No hours on the site. Hours on the Google profile were not checked.

## Headline, titles, services
- Title: "Modern Glass Structures". Meta description: "glass shop". No H1.
- Services named on the page: Residential Glass Installation, Commercial Glass, Shower Glass, Mirrors, Custom Cut Glass, Specialty Glass, Glass Technology. None has its own page. Windows are not named.
- Site versus Google profile and BBB: name, address and phone agree. The BBB lists window categories (Windows, Window Installation, Window Repair, Window Glass, Replacement Windows) that the site never mentions.

## Not checked
- No Lighthouse or PageSpeed score was run.
- No form was submitted.
- Instagram opened a login wall; the profile content could not be seen.
- No Sitebulb export was provided.
