# Site coverage: actionlincoln.com (Action Plumbing, Heating, A/C, Electrical)

Checked 2026-11-16 against the live site. Method: rendered homepage in Playwright (main menu, dropdown links, footer, all `<a>` links), `/sitemap.xml` (123 URLs; the sitemap uses the non-www host, so each URL was fetched at www), `/sitemap_index.xml` (404, not present). Every URL below was rendered in a real browser and saved to `site/<slug>.md`. Accordion FAQ answers (collapsed in the DOM, so missing from rendered text) were pulled from the server HTML into `site/faq-answers.md` (62 Q&A pairs on 11 pages).

## Verdict: INCOMPLETE (one page unreadable)

- Every menu, footer and sitemap page (127 URLs) is in `site/`, all returned HTTP 200, and all are read.
- Gap 1: `/shop` (sitemap and main menu, "Shop" / "Get an Instant Quote") is a JavaScript quote widget. Rendered text is 0 words. Its two menu routes, `/shop#/journey/h_v_a_c_systems` and `/shop#/journey/water_heaters`, render the same app shell, so their content was not read. Reason: JS-only, no readable text. Not blocked, no login, no CAPTCHA. The quote flow was not run (it is a form).
- Gap 2 (minor): `/404` returns HTTP 200 with a "404" page (soft 404). Not a content page.
- Not in scope: `/residential/node/7` and `/node/7` return 404, and are not linked from any menu or the sitemap.

## Menu and header links (main nav, dropdowns, header CTA)

Residential: /residential-services, /residential-services/plumbing, /residential-services/water-heaters, /residential-services/heating-ac, /residential-services/electrical, /residential-services/indoor-air-quality, /residential-services/water-quality, /residential-services/home-protection-plan, /residential-services/sewer-water-line-repair, /residential/guides
Commercial: /commercial-services, /commercial-services/plumbing, /commercial-services/hvac, /commercial-services/electrical, /commercial-services/utilities, /commercial-services/completed-commercial-projects
Other: /24-hour-service, /shop (JS, see gap 1), /company, /company/careers, /pay-bill, /company/financing, /contact
CTAs: "Book Online" (modal, #book_online_modal, not a page), "Request Service" (/request-service), tel link 402-258-7795

## Footer links

Phone 402-258-7795 (tel), /request-service, /pay-bill, Facebook (facebook.com/ActionPlumbingandHeating), Instagram (instagram.com/actionplumbingandhvac), /residential-services, /company, /company/careers, /contact

## All 127 URLs checked (sitemap.xml plus menu and crawl links, de-duplicated), with file and status

| URL (www) | site/ file | HTTP | Words |
|---|---|---|---|
| / | home.md | 200 | 290 |
| /24-hour-service | 24-hour-service.md | 200 | 391 |
| /404 | 404.md | 200 | 9 |
| /ac-sem | ac-sem.md | 200 | 212 |
| /accessibility | accessibility.md | 200 | 122 |
| /appointment-thank-you | appointment-thank-you.md | 200 | 20 |
| /careers | careers.md | 200 | 159 |
| /commercial-services | commercial-services.md | 200 | 316 |
| /commercial-services/completed-commercial-projects | commercial-services-completed-commercial-projects.md | 200 | 54 |
| /commercial-services/electrical | commercial-services-electrical.md | 200 | 437 |
| /commercial-services/hvac | commercial-services-hvac.md | 200 | 435 |
| /commercial-services/plumbing | commercial-services-plumbing.md | 200 | 441 |
| /commercial-services/utilities | commercial-services-utilities.md | 200 | 439 |
| /company | company.md | 200 | 271 |
| /company/careers | company-careers.md | 200 | 159 |
| /company/financing | company-financing.md | 200 | 270 |
| /contact | contact.md | 200 | 259 |
| /david-city-columbus | david-city-columbus.md | 200 | 162 |
| /electrical-sem | electrical-sem.md | 200 | 196 |
| /guides | guides.md | 200 | 301 |
| /guides/action-advantage-club | guides-action-advantage-club.md | 200 | 229 |
| /guides/carbon-monoxide-safety | guides-carbon-monoxide-safety.md | 200 | 186 |
| /guides/clogged-toilets | guides-clogged-toilets.md | 200 | 152 |
| /guides/do-you-need-new-hvac-system | guides-do-you-need-new-hvac-system.md | 200 | 226 |
| /guides/garbage-disposals | guides-garbage-disposals.md | 200 | 172 |
| /guides/heat-pumps | guides-heat-pumps.md | 200 | 163 |
| /guides/heating-systems | guides-heating-systems.md | 200 | 155 |
| /guides/hvac-maintenance | guides-hvac-maintenance.md | 200 | 226 |
| /guides/introduction-plumbing | guides-introduction-plumbing.md | 200 | 147 |
| /guides/natural-gas-safety | guides-natural-gas-safety.md | 200 | 227 |
| /guides/sump-pumps | guides-sump-pumps.md | 200 | 231 |
| /guides/top-5-plumbing-issues | guides-top-5-plumbing-issues.md | 200 | 140 |
| /guides/water-heaters | guides-water-heaters.md | 200 | 201 |
| /guides/water-softeners | guides-water-softeners.md | 200 | 199 |
| /guides/what-hvac | guides-what-hvac.md | 200 | 179 |
| /guides/what-mini-split | guides-what-mini-split.md | 200 | 217 |
| /heating-sem | heating-sem.md | 200 | 196 |
| /home | home.md | 200 | 290 |
| /huskers | huskers.md | 200 | 383 |
| /membership-terms-and-conditions | membership-terms-and-conditions.md | 200 | 955 |
| /news | news.md | 200 | 330 |
| /news/action-launches-new-campaign-video-kent-pavelka | news-action-launches-new-campaign-video-kent-pavelka.md | 200 | 148 |
| /news/action-named-among-americas-fastest-growing-companies-inc-5000-list | news-action-named-among-americas-fastest-growing-companies-inc-5000-list.md | 200 | 232 |
| /news/carrier-cool-cash-rebates-are-back | news-carrier-cool-cash-rebates-are-back.md | 200 | 679 |
| /news/essential-guide-drain-cleaning-expert-insights-action | news-essential-guide-drain-cleaning-expert-insights-action.md | 200 | 534 |
| /news/fall-home-maintenance-checklist-get-your-home-ready-winter | news-fall-home-maintenance-checklist-get-your-home-ready-winter.md | 200 | 401 |
| /news/flush-away-hassle-check-out-actions-new-plumbing-commercial | news-flush-away-hassle-check-out-actions-new-plumbing-commercial.md | 200 | 95 |
| /news/honoring-our-founder-jim-kreifels | news-honoring-our-founder-jim-kreifels.md | 200 | 167 |
| /news/how-find-best-plumber-near-me-homeowners-guide | news-how-find-best-plumber-near-me-homeowners-guide.md | 200 | 418 |
| /news/improving-your-indoor-air-quality-essential-guide | news-improving-your-indoor-air-quality-essential-guide.md | 200 | 440 |
| /news/lincoln-choice-award-winner | news-lincoln-choice-award-winner.md | 200 | 258 |
| /news/signs-you-need-air-conditioner-repair-summer-hits | news-signs-you-need-air-conditioner-repair-summer-hits.md | 200 | 515 |
| /news/spring-home-maintenance-tips-prepare-your-home-warmer-weather | news-spring-home-maintenance-tips-prepare-your-home-warmer-weather.md | 200 | 374 |
| /node/7 | node-7.md | 200 | 259 |
| /pay-bill | pay-bill.md | 200 | 29 |
| /plumbing-sem | plumbing-sem.md | 200 | 214 |
| /privacy-policy | privacy-policy.md | 200 | 943 |
| /profile/adam-c | profile-adam-c.md | 200 | 56 |
| /profile/allison | profile-allison.md | 200 | 63 |
| /profile/ashley-f | profile-ashley-f.md | 200 | 68 |
| /profile/bret | profile-bret.md | 200 | 79 |
| /profile/chad-f | profile-chad-f.md | 200 | 54 |
| /profile/cory-c | profile-cory-c.md | 200 | 51 |
| /profile/don-s | profile-don-s.md | 200 | 78 |
| /profile/doug-kreifels | profile-doug-kreifels.md | 200 | 71 |
| /profile/dylan-g | profile-dylan-g.md | 200 | 58 |
| /profile/dylan-kreifels | profile-dylan-kreifels.md | 200 | 83 |
| /profile/jana-r | profile-jana-r.md | 200 | 57 |
| /profile/jillian-s | profile-jillian-s.md | 200 | 64 |
| /profile/joel-fenton | profile-joel-fenton.md | 200 | 69 |
| /profile/jordan-kreifels | profile-jordan-kreifels.md | 200 | 65 |
| /profile/josh-h | profile-josh-h.md | 200 | 81 |
| /profile/justin-d | profile-justin-d.md | 200 | 57 |
| /profile/justin-kreifels | profile-justin-kreifels.md | 200 | 67 |
| /profile/kady | profile-kady.md | 200 | 67 |
| /profile/kaylon-c | profile-kaylon-c.md | 200 | 53 |
| /profile/ken-d | profile-ken-d.md | 200 | 68 |
| /profile/laura-k | profile-laura-k.md | 200 | 57 |
| /profile/mike-k | profile-mike-k.md | 200 | 78 |
| /profile/missy-c | profile-missy-c.md | 200 | 51 |
| /profile/noel-h | profile-noel-h.md | 200 | 85 |
| /profile/reagan-m | profile-reagan-m.md | 200 | 54 |
| /profile/reese-h | profile-reese-h.md | 200 | 49 |
| /profile/richard-c | profile-richard-c.md | 200 | 79 |
| /profile/sue-u | profile-sue-u.md | 200 | 56 |
| /profile/terry-kreifels | profile-terry-kreifels.md | 200 | 70 |
| /profile/terry-s | profile-terry-s.md | 200 | 51 |
| /profile/troy-u | profile-troy-u.md | 200 | 54 |
| /projects/antelope-towers | projects-antelope-towers.md | 200 | 34 |
| /projects/brookside-apartments-fallbrook | projects-brookside-apartments-fallbrook.md | 200 | 25 |
| /projects/downtown-holiday-inn-express | projects-downtown-holiday-inn-express.md | 200 | 32 |
| /projects/duteau-subaru | projects-duteau-subaru.md | 200 | 26 |
| /projects/fairfield-inn-suites | projects-fairfield-inn-suites.md | 200 | 22 |
| /projects/hampton-inn-suites | projects-hampton-inn-suites.md | 200 | 25 |
| /projects/jetsplash | projects-jetsplash.md | 200 | 20 |
| /projects/jetsplash-car-wash | projects-jetsplash-car-wash.md | 200 | 20 |
| /projects/kindler-hotel | projects-kindler-hotel.md | 200 | 28 |
| /projects/kinetic-sports-complex | projects-kinetic-sports-complex.md | 200 | 23 |
| /projects/old-cheney-rehabilitation | projects-old-cheney-rehabilitation.md | 200 | 28 |
| /projects/preserve-shell-building | projects-preserve-shell-building.md | 200 | 35 |
| /projects/telegraph-flats-building-13 | projects-telegraph-flats-building-13.md | 200 | 40 |
| /projects/terminal-building | projects-terminal-building.md | 200 | 41 |
| /projects/timberline-apartments-northwoods | projects-timberline-apartments-northwoods.md | 200 | 25 |
| /projects/village-west-apartments | projects-village-west-apartments.md | 200 | 27 |
| /promo-thank-you | promo-thank-you.md | 200 | 21 |
| /request-service-old | request-service-old.md | 200 | 159 |
| /residential-services | residential-services.md | 200 | 515 |
| /residential-services/electrical | residential-services-electrical.md | 200 | 386 |
| /residential-services/heating-ac | residential-services-heating-ac.md | 200 | 437 |
| /residential-services/home-protection-plan | residential-services-home-protection-plan.md | 200 | 445 |
| /residential-services/indoor-air-quality | residential-services-indoor-air-quality.md | 200 | 382 |
| /residential-services/plumbing | residential-services-plumbing.md | 200 | 444 |
| /residential-services/sewer-water-line-repair | residential-services-sewer-water-line-repair.md | 200 | 464 |
| /residential-services/water-heaters | residential-services-water-heaters.md | 200 | 468 |
| /residential-services/water-quality | residential-services-water-quality.md | 200 | 155 |
| /residential/guides | residential-guides.md | 200 | 301 |
| /sack-your-old-water-heater-official-rules | sack-your-old-water-heater-official-rules.md | 200 | 1454 |
| /service-agreement | service-agreement.md | 200 | 116 |
| /services/heating-ac | services-heating-ac.md | 200 | 437 |
| /shop | shop.md | 200 | 0 |
| /sms-messaging-consent | sms-messaging-consent.md | 200 | 118 |
| /smscall-privacy-policy | smscall-privacy-policy.md | 200 | 184 |
| /smscall-terms-conditions | smscall-terms-conditions.md | 200 | 141 |
| /specials | specials.md | 200 | 162 |
| /terms-conditions | terms-conditions.md | 200 | 107 |
| /testimonials | testimonials.md | 200 | 664 |
| /thank-you | thank-you.md | 200 | 10 |

## Pages not in the sitemap or menus, read by the first crawl

See site/INDEX.md (first crawl, 60 pages, plus the sitemap pass). The 404 at /residential/node/7 is the only failed page from the first crawl.
