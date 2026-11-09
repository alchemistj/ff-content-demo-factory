# Better Solutions Roofing & Construction LLC: current-site audit

Site: https://www.bettersolutionsconstruction.org/ (Duda-style site, platform not confirmed). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900 across the 9 pages: home, about, roofing, fences, concrete, siding, projects, contact, and terms/privacy. Screenshots are in `audit/`. Crawl data: `/tmp/claude-0/-home-user/9d8118b7-f5b3-5447-8eb5-932524a50e8e/scratchpad/better/crawl.json`, targeted checks in `targeted.json` and `mobile2.json` in the same folder. The contact form and the inspection form were not submitted.

## What works
- Every visible phone link is a `tel:` link to the one number the site shows, (316) 708-0046, on all 9 pages at both sizes. Headless Chromium cannot dial, so "it dials" is checked on the href only. The href is written as `tel:(316) 708-0046` (parentheses and a space); that is a visual-separator format, and it was not dialed.
- The one email link `mailto:eroofing57@gmail.com` matches the address shown in the footer, contact info and terms page. (The address itself is a Gmail address; see finding 9.)
- Desktop menu items Home, About Us, Roofing, Fences, Concrete, Siding, Projects and Contact all load their own pages (Services is the exception, finding 3). The four service links work inside the Services dropdown when it is opened (hover on desktop, tap on mobile).
- Mobile drawer opens from the hamburger button and lists Home, About Us, Services (with Roofing, Fences, Concrete, Siding under it), Projects and Contact.
- Contact page has a real "Send Message" form (First Name, Last Name, Email, Phone, Message) with a Google reCAPTCHA v2 checkbox in the page source. Not submitted, so whether it sends is unverified.
- The footer Terms of Use and Privacy Policy links go to `/t/tou-and-privacy#TOU` and `#PP` and load the same page.
- The Google Maps link in the header points to the same place as the scout place ID. Both IDs decode to the same feature ID and CID (checked by hand).

## What is broken, most costly first

1. **The phone layout is wider than the phone.** At 390 px wide, every page scrolls sideways: the document is 768 px wide on all 9 pages (scrollWidth 768 vs viewport 390). The hero headline runs off the right edge ("BETTER SO..." is cut off in the first screen), and the header phone number wraps across two lines as "(316) 708-" / "0046". Screenshots: `audit/mobile-home-first-screen.png`, `audit/mobile-home-full-page-768px-wide.png` (the full-page capture is 768 px wide, which is the overflow itself).

2. **A financing pop-up covers the first mobile screen and breaks its own words.** On the first phone load of the homepage, a white "IN-HOUSE FINANCING OPTIONS" box covers the hero. Its heading wraps mid-word ("FINANCI / NG", "OPTION / S") and the box runs past the screen edge. Screenshot: `audit/mobile-home-first-screen.png`. Only the first screen was checked; how the box is dismissed was not tested.

3. **"Services" is a dead link.** The header item "Services" has `href="#"`. On desktop, clicking it from the homepage lands on the homepage; clicking it from the roofing page leaves the page where it was. On mobile, tapping it from the homepage stays on the homepage. Nothing in the menu leads to a services overview page. Screenshots: `audit/desktop-services-click-goes-home.png`, `audit/mobile-services-tap-stays-home.png`.

4. **Homepage reviews repeat.** The "Customer Reviews" block on the homepage shows Zach G., Sophia H. and Marisol T. twice each (9 review names in the page text, 6 unique). Screenshot: `audit/desktop-home-reviews-repeat.png`. The reviews are on the site only; they were not matched to Google (the reviews pull was not run).

5. **The "years" claims conflict.** The homepage says "over 20 years of hands-on experience" and "20+ years of experience" (service areas block). The BBB profile lists the business start date as 1/26/2025 and "Years in Business: 1" (https://www.bbb.org/nebraska/quote/request-better-solutions-roofing-construction-llc-1000068049; the BBB page is filed under the Nebraska path but describes the Wichita business). The site may mean the owner's experience; it does not say so.

6. **Projects page copy has errors.** The "Our first commercial project" story says "a little over 50 square feet!" for a motel roof in Wellington, KS (https://www.bettersolutionsconstruction.org/photo-projects-construction-roofing). The siding story calls the homeowner "cookie-cutter." Both are visible on the page.

7. **Headings with no visible body text.** The roofing page has "ROOF SERVICES" and "ROOFING OPTIONS" headings with no list visible beneath them. The fence page has "FENCE MATERIAL OPTIONS" with no visible text under it. These may be slider or tab content the crawl did not capture; not confirmed either way.

8. **Hours conflict within the site.** The footer says "Mon - Sun, 7:00 am - 7:00 pm" and "24-hour emergency" in the same block. Both appear on every page.

9. **Generic email and title.** The business email is `eroofing57@gmail.com` (footer, contact, terms). Home page `<title>` is "Roofing & Construction Contractor - Wichita, KS", with no business name in the title.

10. **Hidden location block.** The page source has a location block for eight cities (Wichita, Garden City, Dodge City, Liberal, Hutchinson, Salina, Emporia, Great Bend) with "Go to location page", "See all locations" and "Call Us" text. It is not visible, and its links have no href. Not shown to customers; noted so nobody mistakes it for live offices.

11. **Not confirmed in our run:** tapping "Home" in the mobile drawer timed out, so that one item is untested (the logo link goes to `/`). Desktop hover on "Services" also timed out once; the dropdown links were still read from the page and clicked.

## Phone and email, every place shown

| Where | Shown | Link |
| --- | --- | --- |
| Header (mobile and desktop), hero, "Call Us Today" buttons, footer, contact info | (316) 708-0046 | `tel:(316) 708-0046` (works as an href) |
| "Get a Free Quote!" button (home) | (316) 708-0046 | `tel:(316) 708-0046` |
| Email (footer, contact info, terms page) | eroofing57@gmail.com | `mailto:eroofing57@gmail.com` (matches) |

Only one phone number appears on the site. The Google scout phone (316) 708-0046 matches. A third-party aggregator page lists (316) 531-9087 (https://serviceagent.ai/directory/new-york/wichita-ks/roofing/better-solutions-roofing-construction-llc/); that number is not on the site or the scout data and was not checked further.

## Pages, titles, H1s (desktop and mobile identical)

| Page | `<title>` | H1 |
| --- | --- | --- |
| / | Roofing & Construction Contractor - Wichita, KS | BETTER SOLUTIONS ROOFING & CONSTRUCTION LLC – WICHITA, KS |
| /about-roofing-construction-contractor | About Professional Roofing Contractor - Wichita, KS | ABOUT BETTER SOLUTIONS ROOFING & CONSTRUCTION LLC IN WICHITA, KS |
| /roofing-repair-replacement-inspections | Roofing Inspections, Repair & Installations - Wichita, KS | PROFESSIONAL ROOFING SERVICES IN WICHITA, KS – BUILT TO LAST |
| /fence-installation-commercial-residential | Custom Fence Installation - Wichita, KS - Better Solutions | PROFESSIONAL FENCE INSTALLATION IN WICHITA, KS – SECURE & STYLISH SOLUTIONS |
| /concrete-driveways-sidewalks-foundation | Custom Concrete Work - Wichita, KS - Better Solutions | EXPERT CONCRETE SERVICES IN WICHITA, KS – STRONG FOUNDATIONS, BEAUTIFUL FINISHES |
| /siding-vinyl-wood-installation | Custom Siding Installation - Wichita, KS - Better Solutions | PROFESSIONAL SIDING SERVICES IN WICHITA, KS – PROTECTION, STYLE, AND LASTING VALUE |
| /photo-projects-construction-roofing | Completed Roofing Projects - Wichita, KS - Better Solutions | OUR ROOFING & CONSTRUCTION PROJECTS IN WICHITA, KS |
| /contact-general-contractor-wichita | Contact Roofing & Construction Contractor - Wichita, KS | CONTACT BETTER SOLUTIONS ROOFING & CONSTRUCTION LLC IN WICHITA, KS |
| /t/tou-and-privacy | Roofing & Construction Contractor - Wichita, KS | TERMS AND CONDITIONS OF USE (TOU) AND PRIVACY POLICY |

Titles are inconsistent: four say "Better Solutions" (fence, concrete, siding, projects) and the rest use a generic phrase. The homepage H1 is the company name in capitals followed by the town, and every other H1 names the service and the town.

## Menu and button links checked

- Header menu (desktop and mobile): Home (/), About Us, Services (`#`, dead), Roofing, Fences, Concrete, Siding, Projects, Contact (all load their page; Services excepted).
- Services dropdown (opened by hover on desktop, tap on mobile): Roofing, Fences, Concrete, Siding (each loads its page).
- "Learn More" buttons on the homepage service cards: to /roofing-repair-replacement-inspections, /fence-installation-commercial-residential, /concrete-driveways-sidewalks-foundation, /siding-vinyl-wood-installation.
- "Any Inquiries?" goes to the contact page. "Call Us Today" and "Find Out More!" are tel links.
- Facebook (https://www.facebook.com/people/Better-Solutions-Roofing-Construction-LLC/61556188483260/) and Google Maps icons in the header. Facebook was not opened (login wall in our tool); Google Maps link decodes to the scout place ID.
- Homepage slider buttons ("go to slide") have no links; they are carousel controls.
- "Schedule Free Inspection" submit buttons on every page belong to the inspection form (see Forms).

## Forms (not submitted)
- **Inspection form** ("SCHEDULE YOUR FREE ROOF INSPECTION!", in the footer of every page): First Name, Last Name, Email, Phone, and a select with Roof Inspection, Roof Leak Repair, Storm Damage, Roof Replacement, Fences, Concrete, Siding. No captcha found in the page scans. Submit button "Schedule Free Inspection".
- **Contact form** (contact page only): First Name, Last Name, Email, Phone, Message, plus a "Send Message" button. Google reCAPTCHA v2 is in the page source and rendered on the page. The inspection form also appears on the contact page.
- Whether either form sends, and where the messages go, is unverified.

## Placeholder, copied and sample content
- Homepage reviews repeat three names (finding 4). Reviews are unverified against Google.
- No "copy-of" pages, lorem ipsum or sample-name placeholders found in the visible text of the 9 pages.
- No copyright year line found. The footer says content is protected by copyright, with no year.
- Image alt text on service pages describes generic scenes ("Red-tiled rooftops and chimneys against a clear blue sky"). Whether these are the company's own jobs was not checked.

## Offices and site vs Google
- Site names one city only: Wichita. It shows no street address anywhere in the visible text.
- BBB address: Wichita, KS 67204-6337, no street address (BBB page above).
- The site's service-area list names eight towns and says "within a 4-hour radius."
- Google (scout): 4.9, 161 reviews, (316) 708-0046, categories roofing, concrete, fence, siding. The site covers roofing, fences, concrete and siding; the BBB lists gutters too, and the site has no gutter page.
- Google profile hours and address: not in scout data; not checked.

## Speed and other checks not run
- No PageSpeed or Lighthouse score; no API key available.
- No Sitebulb export provided.
- Form submissions were not tested; the tel links were not dialed.
- Kansas Secretary of State and Kansas AG roofing registrations: not checked (see facts.md).

## Questions for the onboarding call
- Which is right: "20+ years" on the site or the BBB start date of 1/26/2025? Is "years" about the owner or the company?
- Is (316) 531-9087, shown on a third-party aggregator, a live number for this business?
- Is the financing box meant to appear on the first phone screen? Does it close?
- Does the inspection form and the contact form deliver to a monitored inbox? Where do they go?
- Is the "24-hour emergency" line correct alongside 7 am to 7 pm hours?
- Should the homepage reviews be deduplicated, and which reviews are from Google?
