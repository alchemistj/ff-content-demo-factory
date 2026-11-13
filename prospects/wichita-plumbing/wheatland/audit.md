# Current-site audit: Wheatland Plumbing

Site: https://www.thewheatlandway.com/ (Webador). Pages crawled: 24 URLs (home, our services, 9 service pages, about, careers, areas index, 6 area pages, photo gallery, prayer request, financing, get-a-quote at two URLs).
Widths: 1440x900 and 390x844. Run date 2026-11-13. Playwright Chromium. Nothing submitted.
Screenshots: `audit/`.

## What works

- **Phone number is tappable** at both widths: `tel:+1316-640-1635`, "CALL US TODAY" in the header, plus many in-page buttons.
- **Top-level links that go to a page** (click at 1440 px): HOME, PHOTO GALLERY, PRAYER REQUEST, FINANCING.
- **Mobile menu:** "Toggle menu" opens a list with working links, "More info" links, a Get a Quote link, Facebook, email (`office@thewheatlandway.com`) and phone.
- **Phone width:** no sideways scroll (390 px on all pages).
- **Titles and H1s** are present on all pages. Titles name Wheatland on every page.
- **Financing page** gives terms (up to $65,000, 3 to 120 months, APR 0 to 35.9%) and the Wisetack disclaimer.

## What's broken, most costly first

### 1. Three top menu items do not open their page on click
- At 1440 px, clicking "OUR SERVICES", "ABOUT US" or "AREAS WE SERVICE" leaves the visitor on the homepage. Three of three tries. The link `href` is correct (`/our-services`, `/about-us`, `/areas-we-service`), and the page loads when typed directly.
- Each is a dropdown parent (class `sf-with-ul`). Hover opens the sub-menu. Whether the sub-items open correctly on hover was not separately tested.
- Evidence: `audit/evidence-our-services-click-stays-home-1440x900.png`.
- Cost: a visitor who clicks the main menu item gets nothing. The main service page is reachable only through the sub-menu.

### 2. The Wichita area page has no city in its H1
- `/areas-we-service/wichita-area-plumber`: H2 "Wichita's Cleanest 24/7 Plumber". The only H1 is "Need Something Else? We've Got You Covered", placed at the bottom of the page.
- Service sub-headings name Wichita ("Sewer Cabling in Wichita, KS (24/7 Service)"), but as H3s.
- Evidence: `audit/wichita-area-page-top-1440x900.png`.

### 3. Typos in menu labels, URLs and titles
- "Hutchison Area Plumbrer" (menu label, URL `/areas-we-service/hutchison-area-plumbrer`, page title). Should read "Plumber".
- "Mcpherson" (menu label, title). Should read "McPherson" (the H1 on that page does).
- Homepage lists "Hutchinson" in the service area; the Hutchison page says "Hutchison". Inconsistent spelling.
- "Valley Centers Cleanest 24/7 Plumber" (H1 on the Valley Center page) has a stray apostrophe.
- Garbage disposal page title: "Garbage Disposal, and its not your DOG".

### 4. Near-duplicate city pages
- Five area pages share one template and close wording: "We're a local plumbing company bringing a better standard to [city]. You'll get clean workmanship, upfront pricing, and an experienced technician who does the job right the first time." This appears on Wichita and McPherson meta descriptions.
- Each page swaps the city name and a "Cleanest 24/7 Plumber" H1.

### 5. Contact form uses free text where a choice belongs
- Get a Quote (`/areas-we-service/get-a-quote`, same form at `/contact/get-a-quote`): Full Name, Phone, Email, Address (all required), "How would you like to be contacted?" (free text), "What time of day is best for you?" (free text), Message, honeypot "Leave this field empty".
- A visitor types "phone" or "anytime" into free text. A select would be cleaner.
- reCAPTCHA Enterprise scripts load on the page. The widget container has class `hidden`, so it may be invisible. Not tested by submitting.

### 6. No owner, no license numbers
- "All our plumbers are licensed and insured to ensure quality service and peace of mind for our customers." (FAQ on homepage, https://www.thewheatlandway.com/). No license numbers.
- "Locally owned small business" (https://www.thewheatlandway.com/about-us). Owner not named.
- Careers page: "We currently have openings for a licensed plumber (full-time)." Staff count not stated.

### 7. Service H1s do not name the city
- Nine service pages. H1s name the service only: "Hot Water Hydro Jetting Services", "Drain Replacement, Repair & Clogged Sewer Services", "Water Line Repair & Replacement Services", "Gas Line Repair, Replacement & Maintenance", "Water Heater Repair & Replacement", "Sump Pumps, Well Pumps & Sewage Ejectors/Grinder Pumps Repair & Replacement", "Water Treatment Services", "Garbage Disposal Repair & Replacement".
- Titles and meta descriptions name Wichita on some pages (e.g. Hydro Jet meta: "Hydro jetting services in Wichita, KS").

## Other checks

- **Reviews widget:** the homepage embeds a Housecall Pro reviews widget (count not read).
- **Booking:** "BOOK ONLINE" on the homepage goes to a Housecall Pro booking page.
- **Speed:** no Lighthouse run. No console errors on any page at either width.
- **Images:** none broken in the crawl.
- **Copyright:** "© 2025 - 2026 Wheatland Plumbing" on every page.
- **Email:** `office@thewheatlandway.com` (domain email, good).

## Not checked (and why)

- **Form submission:** not submitted, per the brief.
- **Hover sub-menu clicks:** only the parent links were clicked. Sub-items were fetched by direct URL.
- **Google reviews text:** not pulled (final picks only, per rules).
- **Facebook page:** linked (profile id 61573386959626). Not opened.
