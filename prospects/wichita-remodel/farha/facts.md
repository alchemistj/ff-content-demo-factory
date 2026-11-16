# Farha HomeTrends: research facts (2026-11-08)

Sources: site pages fetched by curl (browser UA), reviews from `wichita/reviews/farha-hometrends.json`, search snippets and WebFetch on public directories. BBB, Angi and NAICS returned 403 to WebFetch, so they are not verified. A Bash/curl attempt at those directories was blocked by the permission check and not retried.

**1. Owner.** Geremy Farha. Confirmed by the site: "Founder Geremy Farha began as a tile installer more than 20 years ago in Wichita" (https://farhahometrends.com/about-us/) and "Geremy Farha Founder" (https://farhahometrends.com/our-staff/). Reviews name him: "Geremy has handled all of our renovations for almost 20 years now" (review by Julie W., 2025-12-11). No owner replies exist on Google (0 of 24 text reviews have an ownerResponse).

**2. Independent?** Appears independent and founder-run. "This family owned company topped all the lists" (review by Dayhiker, 2026-02-09). Not a franchise in anything I found. Site says "Certified Onyx Dealer" and "Show-place dealer for cabinets" (https://farhahometrends.com/our-services/). That is a manufacturer dealer label, not a franchise.
Years: site says "Remodeling homes for more than 20 years" (home page) and "over 20 years" (our-services). Our Staff page says Geremy "started in the construction industry over 25 years ago". Angi snippet: "over 20 years" in Wichita (search result, unfetched). Kansas SOS record not found in search, so the legal entity and formation date are unverified. Search snippets give "Farha HomeTrends, LLC" as the name (BBB/NAICS, unfetched).

**3. Services.** Site's own list: "Kitchen, Bathroom, Living Space, Outdoor, Custom Cabinetry & Woodworking, Custom Spaces, Additions" (nav). Our Services: "Custom cabinetry, Full-service remodeling, In-house interior designer, Certified Onyx Dealer." Windows and doors make up essentially none of the work. The only window mention on the site's own copy is a generic line on /home-improvement/: "better insulated windows and water saving fixtures."
Reviews: none of 24 text reviews mention windows. Doors appear once: Sheryl D. (2018-05-15): "install three exterior doors" (in a long list of other work). Waterproofing and tile dominate.

**4. Claims.** Licensed and insured: "crews are trusted, skilled, licensed, and insured in carpentry, tile and flooring, plumbing, electrical and painting" (About page). No license number shown. Free estimate: "request a free estimate" (About page). Warranty: review by Amy B.: "faithful to warranty work." Brands: Onyx cabinets, Delta fixtures (review by Dayhiker). Financing: none found. Certifications: none on site. Expertise.com (third-party) lists NAHB Green Building membership. Service-area towns: none listed; "Wichita" only. BBB: search snippet says accredited and an average of 3.75 from 4 reviews, while another snippet says A+. Conflicting and unverified.

**5. Website problems (as seen).**
- Title: "Farha HomeTrends-Wichita's Most Trusted Remodeling Contractor." H1: "Wichita's Trusted Home Remodeling Contractors." Says Wichita, but not what they do in windows terms; generic.
- Phone: no tel: link on the home page. Tel links appear only on /contact-us/.
- Service pages: none per service. Gallery pages exist for kitchen, bath, living, outdoor, additions, custom spaces. /services returns 404 (the real page is /our-services/).
- Reviews shown: yes, on home and /testimonials/.
- Inconsistency: "more than 20 years" (About) vs "over 25 years" (Our Staff).
- Address conflict: Expertise.com and MapQuest list 1004 E 2nd St N, Wichita 67214, with MapQuest showing "Closed." The site and BBB snippet use 1300 E Central Ave. Flag for the pitch.
- Speed: home page took 1.4 to 2.9 s in my curl runs (picks.md recorded 4.8 s; not reproduced).
- Redirect: http to https://www. is 301. Fine.
- Site is server-rendered WordPress/Beaver Builder, so Playwright was not needed.

**6. Contact form.** URL: https://farhahometrends.com/contact-us/. Contact Form 7. Fields: Name, Email, Phone, Address, "How Did You Hear About Farha HomeTrends?", "Tell Us About Your Potential Remodeling Project." CAPTCHA: yes, Google reCAPTCHA v3 (`google.com/recaptcha/api.js?render=...`), invisible with no visible challenge. Not submitted.

**7. What customers praise.** Craftsmanship and attention to detail ("Craftsmanship is top notch," Kyle L., 2023). Professional, on-time crews who leave the house clean ("cleaned up after each day," Norma M.; "left the house looking as if they hadn't been there," Carol W.). Good communication and repeat business ("Geremy has handled all of our renovations for almost 20 years," Julie W.). Also specific: "showed up as promised" (Norma M.).

## Gaps
- Kansas SOS entity record, BBB grade and complaints, Facebook, Yelp: not verified.
- Owner's full legal name: "Geremy Farha" from the site and reviews, not checked against records.
