# Current-site audit: Pro Comfort Heating & Cooling LLC

- **Site checked:** https://www.myprocomfort.com/ (WordPress). Crawl found 40 URLs, 34 distinct pages that returned 200 in the crawl.
- **Run:** 2026-11-15, Playwright Chromium, widths 1440x900 and 390x844. Forms not submitted. Nothing sent.
- **Screenshots:** `audit/` in this folder.
- **Load times (first load, 1440):** homepage 4.3 s, gallery 6.6 s (slowest), most service pages 0.2 to 1.8 s.
- **Errors during the run:** the site returned intermittent `403 Request blocked` and `502` responses to the renderer, mostly on the fast first pass. Re-tried one by one with pauses, most returned 200 (see "Not checked"). The 403 page reads "Request blocked", which looks like bot protection rather than a site error; not confirmed.

## What works
- **Phone links:** `tel:+12603107721` on service pages, visible and tappable at 390 (29 pages at 390 with a visible tel link). The number is 260-310-7721 on the footer and in the header.
- **No horizontal overflow at 390:** scroll width 390 on every page re-checked after the retry (the two 980-px readings in the first pass were 502 responses).
- **Contact form:** Gravity Forms on the homepage and every service page (visible, no CAPTCHA). Details below. Not submitted.
- **Titles and H1s:** every page has an H1. Titles follow "Service | Pro Comfort".
- **Desktop nav:** the service links sit in a hover dropdown. My click test could not click them (no click target was found), so click-through is not verified. Direct loads of each service URL return 200. The "Menu" trigger (`#sidewidgetarea`) did not navigate in my test.
- **Placeholder text:** none found.

## Contact form (not submitted)
- **URL:** the form is on the homepage, https://www.myprocomfort.com/ (`#gf_1`, Gravity Forms, `method=post`, `action` `/#gf_1`), and on every service page. No dedicated `/contact` page appeared in the crawl.
- **Fields:**
  - "YOUR NAME (REQUIRED)": text, `input_1`.
  - "EMAIL ADDRESS (REQUIRED)": email, `input_2`.
  - "PHONE NUMBER (REQUIRED)": tel, `input_3`.
  - "MESSAGE": textarea, `input_4`.
  - A second text input, `input_5`, visible. Labelled "Phone" in the HTML and "EMAIL" in the rendered text. Unverified which it is.
  - Submit button: "Submit".
- **Required:** the labels say "(REQUIRED)". No HTML `required` attribute on any field. No `maxlength`.
- **Honeypot:** `ak_hp_textarea` (hidden; validation field).
- **CAPTCHA:** none found (no reCAPTCHA or hCaptcha element or iframe on the page).
- **Other contact routes:** the phone number (tap-to-call on service pages) and "CONTACT NOW" / "SCHEDULE SERVICE" buttons on the homepage. No email on the site.

## What's broken, most costly first

### 1. Wrong city in headings and copy
- Homepage H1: "Your #1 Heating & Cooling Company In Fort Wayne, IN Area". The address in the footer is Fort Wayne.
- `/hvac-services` H1: "HVAC Service Company In Anderson, IN Area" (page address and footer say Fort Wayne).
- `/sheet-metal-fabrication-services` H1: "Sheet Metal Fabrication Services In Anderson, IN Area".
- `/about-us` text: "throughout the greater Anderson, I[N]" and similar.
- Two city pages, `/air-conditioning-and-heating-services-in-new-haven-in` and `/air-conditioning-and-heating-services-in-huntington-in`, use the same template.
- Cost: a Fort Wayne visitor sees "Anderson" in the H1 of a core service page. Looks like copied template text.

### 2. Broken images
- `Pro_comfort-logo-and-york-co-op-01.png` (homepage) does not load. The file name suggests a York co-op logo; the brand claim is unverified.
- `Doug-Frey-AC-600x400.jpg` (gallery page, desktop and mobile) does not load.
- Evidence: `audit/desktop-1440-homepage.png` (homepage at 1440).

### 3. Title and copy oddities
- `/about-us` title is "About us | | Pro Comfort Heating & Cooling LLC" (double separator).
- `/other-services` title is "OTHER SERVICES | Pro Comfort Heating & Cooling LLC" (all caps).
- `/gallery` is a 162-word page with one H1 ("Our Gallery") and a broken photo (see item 2).

### 4. Slow pages
- `/gallery` loads in 6.6 s and homepage 4.3 s at 1440 (first load, single session). Measure again on a normal connection before reporting.

### 5. Hidden or missing anchor
- `#sidewidgetarea` (the "Menu" trigger) is an anchor to an element that does not exist on the page. Minor; it probably opens a menu by script.

### 6. Reviews and testimonials
- `/about-us/customer-reviews` has named reviews (John, Casey). Some owner replies on Google are generic. Not verified as real.

## Page inventory

| Page | Title | H1 | Words | Scroll width at 390 |
|---|---|---|---|---|
| myprocomfort.com/ | Pro Comfort Heating & Cooling LLC / Indiana | Your #1 Heating & Cooling Company In Fort Wayne, IN Area | 1238 | 390 (re-checked) |
| myprocomfort.com/hvac-services | HVAC Services / Pro Comfort Heating & Cooling LLC | HVAC Service Company In Anderson, IN Area | 782 | 390 (re-checked) |
| myprocomfort.com/ac-installation | Air Conditioning Installation Services / Pro Comfort | AC Installation Services | 922 | 390 |
| myprocomfort.com/air-conditioning/ac-repair | Air Conditioning Repair Services / Pro Comfort | AC Repair Services | 693 | 390 |
| myprocomfort.com/air-conditioning/ac-maintenance | Air Conditioning Maintenance Services / Pro Comfort | AC Maintenance Services | 763 | 390 |
| myprocomfort.com/heating | Heating Services / Pro Comfort Heating & Cooling | Reliable Heating Repair, Maintenance & Installation Services | 853 | 390 |
| myprocomfort.com/heating/furnace-installation | Heating Installation Services / Pro Comfort | Furnace Installation Services | 619 | 390 |
| myprocomfort.com/heating/furnace-maintenance | Heating Maintenance Services / Pro Comfort Heating & Cooling | Furnace Maintenance Services | 706 | 390 |
| myprocomfort.com/thermostat | Thermostat Services / Pro Comfort Heating & Cooling | Professional Thermostat Services | 518 | 390 |
| myprocomfort.com/thermostat-installation-and-replacement | Thermostat Installation and Replacement Services / Pro Comfort | Thermostat Installation & Replacement Services | 892 | 390 |
| myprocomfort.com/thermostat-repair | Thermostat Repair Services / Pro Comfort Heating & Cooling | Thermostat Repair Service | 673 | 390 |
| myprocomfort.com/thermostat-maintenance | Thermostat Maintenance / Pro Comfort Heating & Cooling | Thermostat Maintenance Service | 979 | 390 |
| myprocomfort.com/ducts-and-vents | Duct and Vents Services / Pro Comfort | Reliable Ducts & Vents Services | 780 | 390 |
| myprocomfort.com/air-duct-and-vents-installation-services | Air Duct and Vents Installation Services / Pro Comfort | Air Duct and Vents Installation Services | 868 | 390 |
| myprocomfort.com/air-duct-and-vents-repair-services | Air Duct and Vents Repair Services / Pro Comfort | Air Duct and Vents Repair Services | 871 | 390 |
| myprocomfort.com/air-duct-and-vents-maintenance-services | Air Duct and Vents Maintenance Services / Pro Comfort | Air Duct and Vents Maintenance Services | 900 | 390 |
| myprocomfort.com/indoor-air-quality | Indoor Air Quality - Pro Comfort Heating & Cooling | Indoor Air Quality Services | 848 | 390 |
| myprocomfort.com/indoor-air-quality-testing | Indoor Air Quality Testing / Pro Comfort Heating & Cooling | Pro Comfort's Indoor Air Quality Testing Services | 868 | 390 |
| myprocomfort.com/air-quality-cleaning-system-installation-services | Air Quality Cleaning Installation Services / Pro Comfort | Air Quality Cleaning System Installation Services | 611 | 390 |
| myprocomfort.com/air-filters | Air Filters / Pro Comfort Heating & Cooling | Air Filter Installation & Repair | 831 | 390 |
| myprocomfort.com/ductless-services | Ductless Services / Pro Comfort Heating & Cooling | Pro Comfort's Ductless Services | 845 | 390 |
| myprocomfort.com/ductless-heating-and-cooling-installation | Ductless Heating and Cooling Installation Services | Ductless Heating and Air Conditioning Installation Services | 1023 | 390 |
| myprocomfort.com/ductless-heating-and-cooling-repair | Ductless Heating and Cooling Repair Services | Ductless Heating and Air Conditioning Repair Services | 929 | 390 |
| myprocomfort.com/ductless-heating-and-cooling-maintenance | Ductless Heating and Cooling Maintenance Services | Ductless Heating and Air Conditioning Maintenance Services | 936 | 390 |
| myprocomfort.com/other-services | OTHER SERVICES / Pro Comfort Heating & Cooling LLC | Other Services Pro Comfort Offers | 862 | 390 |
| myprocomfort.com/sheet-metal-fabrication-services | Sheet Metal Fabrication Services / Pro Comfort | Sheet Metal Fabrication Services In Anderson, IN Area | 951 | 390 |
| myprocomfort.com/the-green-initiatives | The Green Initiatives / Pro Comfort Heating & Cooling | Pro Comfort's Green Initiatives | 915 | 390 |
| myprocomfort.com/about-us | About us / / Pro Comfort Heating & Cooling LLC | About Pro Comfort Heating & Cooling, LLC | 421 | 390 |
| myprocomfort.com/about-us/customer-reviews | Pro Comfort Heating & Cooling - Customer Reviews | Customer Reviews | 521 | 390 |
| myprocomfort.com/gallery | HVAC Photo Gallery / HVAC Service Company / Pro Comfort | Our Gallery | 162 | 390 (broken image) |
| myprocomfort.com/specials | Specials - Pro Comfort Heating & Cooling | Heating & Cooling Specials | 218 | 390 |
| myprocomfort.com/financing | Financing - Pro Comfort Heating & Cooling | Finance Your New Air Conditioner Today | 191 | 390 |
| myprocomfort.com/air-conditioning-and-heating-services-in-new-haven-in | Top Air Conditioning and Heating Services in New Haven, IN | Air Conditioning and Heating Services in New Haven, Indiana | 949 | 390 |
| myprocomfort.com/air-conditioning-and-heating-services-in-huntington-in | Top Air Conditioning and Heating Services in Huntington, IN | Air Conditioning and Heating Services in Huntington, Indiana | 865 | 390 |

## Not checked
- Retry pass (one attempt each, paused): these returned 200 on retry after a 403 or 502 on the first pass: `/air-conditioning`, `/heating/furnace-repair`, `/mini-split-installation-and-repair-services`, `/light-commercial-services`, `/air-conditioning/ac-maintenance`, `/ductless-services`, `/specials`, `/financing`, `/about-us/customer-reviews`. The first-pass 403s on `/ac-installation`, `/air-filters` and `/air-duct-and-vents-maintenance-services` and the 502 on `/ductless-heating-and-cooling-maintenance` were not re-checked by name in the retry pass.
- `/air-conditioning-and-heating-services-in-fort-wayne-in` returned 403 on retry. Not confirmed as a site problem.
- Dropdown service links were not clicked (hover-only menu).
- Mobile click test: not run. The mobile checks above are page loads, overflow and tap targets only.
- The Gravity Forms submission (not submitted).
- Google Business profile hours and photos.
- BBB profile.
- Facebook page.
