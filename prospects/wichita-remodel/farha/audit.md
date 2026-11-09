# Farha HomeTrends: current-site audit

Site: https://farhahometrends.com/ (WordPress, Beaver Builder). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900. Screenshots are in `audit/`. I loaded the homepage, Our Services, About Us, Our Staff, Home Improvement, Custom Cabinetry, the kitchen, bathroom, living space and additions galleries, Project Gallery, FAQs, Testimonials, Careers, Blog, Contact Us and one blog post, and opened the phone menu.

## What works
- A real, specific founder story: Geremy Farha began as a tile installer in Wichita, and an Our Staff page names the team.
- Licensed and insured crews are stated plainly (carpentry, tile and flooring, plumbing, electrical, painting), and the About page lists NAHB Green Building and Lead Safe certifications.
- The Contact page has the address, email, phone and hours together, and a real form (Contact Form 7) with Google reCAPTCHA v3.
- Every page returns 200 except the guessable /services address. Kitchen and bathroom pages exist and have Wichita in their titles ("Wichita Kitchen Remodeling - Farha Home Trends").
- Speed is acceptable: the homepage loaded in about 3.8 seconds on a plain connection, 68 requests, about 3.1 MB (no Lighthouse score was run).

## What is broken, most costly first

1. **The phone number is plain text on every page but one, and the header never shows it.** The homepage, Our Services, About, Staff, both galleries and every other page show "316-680-7514" in the footer and nothing is a `tel:` link. The top of the page (desktop and phone) has an envelope icon, Facebook, Instagram and a ">> Request a Consultation!" line, but no number. Only /contact-us/ has `tel:` links (`tel:+13166807514` on an icon and `tel:3166807514` on the number; both dial the right number, the second without a country code). Someone on a phone has to copy the number. Screenshots: `audit/mobile-home-top.png`, `audit/mobile-home-full.png`, `audit/mobile-contact-us-top.png`.
2. **The phone menu has no Contact link and no call button.** Opened the menu at 390 px: Services, Project Gallery, About Us, Testimonials. Contact appears only in the small ">> Request a Consultation!" line above the logo and in page footers. Screenshot: `audit/mobile-menu-open.png`.
3. **Kitchen and bathroom live at gallery addresses.** The menu items "Kitchen" and "Bathroom" (inside the Services dropdown) go to /gallery/kitchen-gallery/ and /gallery/bathroom-gallery/. Both pages have a Wichita title and an H1, but under two short paragraphs they are mostly before-and-after photos and quotes (kitchen page text opens with "As a ShowPlace Cabinetry dealer" and "authorized Onyx Collection dealer"). Neither says what a kitchen job includes, how it goes, or shows a number. The bathroom page never mentions waterproofing, the point one reviewer used to choose Geremy. Screenshots: `audit/desktop-kitchen-gallery-top.png`.
4. **The top of the homepage is a big logo, with no photo of finished work.** At 390 px the first screen is the icons, the logo and an enlarged logo mark; the H1 starts below it. The H1 is "Wichita's Trusted Home Remodeling Contractors" and the browser title is "Farha HomeTrends-Wichita's Most Trusted Remodeling Contractor". Both name the town and the work; neither says "company", and "most trusted" is a claim nothing on the page backs. Screenshots: `audit/mobile-home-top.png`, `audit/desktop-home-top.png`.
5. **Service names mix in dealer labels.** Our Services lists "Custom cabinetry, Full-service remodeling, In-house interior designer, Certified Onyx Dealer, Show-place dealer for cabinets" as services. Dealer labels are not services and give a visitor nothing to call about. Screenshot: `audit/mobile-our-services-.png`.
6. **Years in business disagree.** Homepage, Our Services, Contact and About say "more than 20 years"; Our Staff says Geremy "started in the construction industry over 25 years ago". Screenshot: `audit/mobile-our-staff-.png`.
7. **A guessable address is a dead end.** /services returns 404 ("Sorry! That page doesn't seem to exist."); the real page is /our-services/. Screenshot: `audit/desktop-services-404.png`.
8. **Leftover and odd details (cosmetic).** The homepage testimonial slider shows quotes by first name only ("Larry") next to initials ("John C.") and loops the same two again; the Careers page says "WE ARE HIRING!" and its date was not checked. The form on /contact-us/ asks for a street address and "How Did You Hear About Farha HomeTrends?" with no field marked required in the page source (not submitted, so what it does is unverified).

## Offices and Google profile
- One office: 1300 E Central Ave, Wichita, KS 67214. The site (Contact page and footer) and the Google profile (reviews.json) agree, and the Google phone (316) 680-7514 matches the site.
- facts.md notes Expertise.com and MapQuest list 1004 E 2nd St N with MapQuest showing "Closed". Not re-checked; this is outside the site and not something a demo can fix.
- Site hours (Contact page): Monday to Friday 8am to 5pm, Saturday and Sunday closed. The Google profile hours were not compared.

## Headline, titles, services
- Titles: Home "Farha HomeTrends-Wichita's Most Trusted Remodeling Contractor"; Services "Our Services at Farha HomeTrends"; Kitchen "Wichita Kitchen Remodeling - Farha Home Trends"; Bathroom "Wichita Bathroom Remodeling | Farha HomeTrends"; Contact "Contact Us - Farha HomeTrends".
- Menu and footer services: Kitchen, Bathroom, Living Spaces, Outdoor, Custom Cabinetry & Woodworking, Custom Spaces, Additions. Only Custom Cabinetry has a non-gallery page.
- Corrections to facts.md: it says the site shows no certifications; the About page does list NAHB Green Building Certified and Lead Safe Certified. Neither is used as a fact in the words package until verified (see questions.md).

## Not checked
- No Lighthouse or PageSpeed score; only a headless load timing.
- The contact form was not submitted.
- Sitebulb export: none provided.
- The hamburger menu's Services and About Us submenus were not expanded by tapping; their links were read from the page's link list.
