# Current-site audit: Griffin HVAC

Site: http://www.griffinheatingcooling.com/ (redirects to https://www.griffinheatingcooling.com/). Crawl: 9 pages (homepage, /about-us, /video, /maintenance-plan-agreement, /contact-us, /blog, /financing, /recent-projects), plus 4 blog posts linked from the blog and checked directly.
Run date: 2026-11-15. Playwright Chromium. Widths: 1440x900 (desktop) and 390x844 (mobile), all pages.
Nothing submitted. No form was typed into or sent. The reCAPTCHA was not clicked.
Screenshots: `audit/` in this folder.

## Contact form (for the demo route)

- **URL:** https://www.griffinheatingcooling.com/contact-us (form is on the page, not in an iframe). Method POST. The form's action attribute was not captured in the DOM; the page is a Thryv-style form (field names `dmform-0` to `dmform-4`; footer links to thryv.com terms).
- **Fields (in order):**
  1. First Name, text
  2. Last Name, text
  3. Email, email
  4. Phone, tel
  5. Message, textarea
- **Required fields:** none marked in the DOM (no `required` or `aria-required` on any field). Whether the form blocks an empty submit was not tested.
- **maxlength:** none set.
- **CAPTCHA:** yes. Visible Google reCAPTCHA v2 checkbox ("I'm not a robot") above the SUBMIT button. It loads in an iframe from google.com/recaptcha/api2/anchor. Not clicked. Route is blocked, so hand-send only.
- **Submit control:** a blue "SUBMIT" button (input type=submit, name `submit`).
- **Other iframes:** Housecall Pro reviews widget (client.housecallpro.com/reviews/...) on every page, and a leaflet map on the Recent Projects page. Not in the form.
- Screenshot: `audit/contact-form-1440x900.png`.

## What works

- **Top bar:** BOOK ONLINE goes to book.housecallpro.com (third-party booking page). Not followed past the link target. "LOG IN TO PORTAL" button on the homepage: not followed.
- **Menu (Home, About Us, Schedule An Appointment, Video, Maintenance Plan Agreement, Contact Us, Blog, Financing, Recent Projects):** every item opens a page that returns 200 at both widths. "Schedule An Appointment" goes to the Housecall Pro booking link, not followed.
- **Phone links:** every `tel:` link uses `tel:309-676-0808`. At 390 px the header shows only "BOOK ONLINE" and "LOG IN TO PORTAL" (see problem 2). The DOM has tel links, but my visibility check on /contact-us at 390 px did not find a visible one. Not confirmed on a device.
- **Email link:** mailto:douggriffinheatcool@gmail.com, shown as text on each page. Personal Gmail address.
- **Footer social links:** Facebook (facebook.com/GriffinHeatCool/), Twitter (twitter.com/GriffinHVAC), Instagram (instagram.com/hvacgriffin). Not opened.
- **Google review link:** search.google.com/local/writereview?placeid=ChIJKbeJYLZZCogRU0RjDWqjaI8.
- **Blog posts** (4, not in the menu, checked directly, all 200): /why-amana-brand-is-air-conditioners-are-better (1631 words), /new-seer-efficiency-standards (1614), /community-house-network (1604), /dirty-condenser-coils (1609). Their titles are sensible; no H1 on them.
- **Placeholder text:** no "lorem" or "example.com" in visible text.

## What's broken or weak, most costly first

### 1. Mobile: the site is 768 px wide on a 390 px phone
- scrollWidth 768 against a viewport of 390 on every page (9 of 9 crawled, plus the contact page). The page scrolls sideways by about 378 px.
- Screenshot `audit/home-390x844.png`: the H1 runs off the right edge ("The online schedule is..." is cut off), and the logo and "Read our Reviews" badge sit over the background image. A cookie bar covers the bottom.

### 2. Phone and menu on mobile
- At 390 px the header has only BOOK ONLINE and LOG IN TO PORTAL. No phone number and no visible menu toggle in the header on the screenshot.
- The number 309-676-0808 appears in the body and footer at desktop. On the 390 px contact page, my check found no visible tel link. Needs a phone check before the demo says "tap to call".

### 3. Homepage H1 is an operations notice
- Homepage H1: "Please call if the online schedule doesn't show a time you want" (the second H1 on the page is empty). The top banner says: "The online schedule isn't a true reflection of our actual schedule, please call if you don't see a time you want." A visitor's first read is that the online booking is unreliable.

### 4. Template filler in the HTML
- "Slide title" appears 15 times in the homepage's raw HTML. It is not in the visible text, and I did not confirm whether any copy is displayed. Count from the raw HTML only.

### 5. Page titles
- "Heating Services | Peoria, IL | Griffin HVAC" on /, /video and /maintenance-plan-agreement. The /video page is about videos, /maintenance-plan-agreement is a maintenance page. Duplicate titles.
- /contact-us title: "Heating Maintenance | Peoria, IL | Griffin HVAC" (the page is a contact page).
- /about-us title: "HVAC Experts | Peoria, IL | Griffin HVAC".
- /financing and /blog titles: "Heating and Cooling contractor Peoria, Il area, Residential" (both; /financing has no H1).

### 6. Hours conflict on the site
- Homepage, financing and maintenance pages: "Mon - Fri 8:00 am - 6:00 pm".
- Contact page: "Mon - Fri 8:00 am - 5:00 pm".

### 7. Thin pages
- /contact-us: 114 words. /video: 98 words, mostly six embedded YouTube videos (titles not read). /financing: 142 words. /maintenance-plan-agreement: 373 words but a real list (see facts.md).
- /recent-projects: 5768 words, a job list with a map. Not checked job by job.

### 8. Reviews widget and copy
- Homepage shows about ten reviews (name and zip) from a reviews widget; the widget source is not confirmed. Google count from QUALIFY (444) not re-checked.

## Not checked
- Phone calls (not dialed).
- Google listing content (rating, hours, photos).
- Housecall Pro booking page (link target only).
- Facebook, Twitter, Instagram and Google pages.
- Form submission (not allowed).
- Page speed (no Lighthouse run).

## Pages (crawl, titles/H1/words; 390 px scroll width)
| Page | HTTP | Title | H1 | Words | Scroll width at 390 px |
|---|---|---|---|---|---|
| griffinheatingcooling.com | 200 | Heating Services / Peoria, IL / Griffin HVAC | Please call if the online schedule doesn't show a time you want | 558 | 768px |
| griffinheatingcooling.com | 200 | Heating Services / Peoria, IL / Griffin HVAC | Please call if the online schedule doesn't show a time you want | 548 | 768px |
| griffinheatingcooling.com/about-us | 200 | HVAC Experts / Peoria, IL / Griffin HVAC | About Griffin HVAC | 967 | 768px |
| griffinheatingcooling.com/video | 200 | Heating Services / Peoria, IL / Griffin HVAC | (none) | 98 | 768px |
| griffinheatingcooling.com/maintenance-plan-agreement | 200 | Heating Services / Peoria, IL / Griffin HVAC | Maintenance Plan Agreement | 373 | 768px |
| griffinheatingcooling.com/contact-us | 200 | Heating Maintenance / Peoria, IL / Griffin HVAC | Contact Us | 114 | 768px |
| griffinheatingcooling.com/blog | 200 | Heating and Cooling contractor Peoria, Il area, Residential | Heating and cooling information and tips | 1592 | 768px |
| griffinheatingcooling.com/financing | 200 | Heating and Cooling contractor Peoria, Il area, Residential | (none) | 142 | 768px |
| griffinheatingcooling.com/recent-projects | 200 | Peoria, IL Heating Contractor Service Area & Recent Jobs / Griffin HVAC | Recent Peoria, IL Area Projects | 5768 | 768px |
