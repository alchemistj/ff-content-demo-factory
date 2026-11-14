# Current-site audit: Young Electric

Site: https://www.young-electric.com/ (http://young-electric.com/ redirects here). Platform: Pen Publishing (footer), ASP.NET forms. Run date 2026-11-13. Playwright Chromium, widths 1440x900 and 390x844. Screenshots in `audit/`. Nothing broken, so `audit/` holds reference shots only.

## What works
- **Every link returns 200.** I requested all 46 internal links from the homepage menus (including the hidden dropdown items) plus the footer links. No 404s, no redirects to home. Only exception: the Facebook link (https://www.facebook.com/YoungElectricWichita) returned HTTP 400 to an automated request. Not opened in a browser, so unverified.
- **Phone is tappable on both widths.** Desktop header "Call 316.681.8118" is a `tel:` link (199x35, visible). Mobile header shows a tap-to-call icon (`tel:316-681-8118`, visible). The number is in the footer of every page as text.
- **No horizontal scroll.** Scroll width equals viewport (390 px on phone, 1440 px on desktop) on all 28 pages I crawled at both widths.
- **No placeholder copy.** No lorem, "coming soon" or sample text found. No copyright line found on any page.
- **Contact forms render.** Four forms (listed below). None submitted, per the brief.

## Findings, most costly first

### 1. The phone number is the first H1 on every page
- Every page's first `<h1>` is the header "Call 316.681.8118", not the page topic. The real page heading is the second H1 (or the only one, on service pages).
- Cost: search engines and screen readers read the phone number as the page's main heading. Evidence: H1 lists in the page table below.

### 2. Contact forms are gated by invisible reCAPTCHA
- /contact/, /ScheduleService/, /GetAFreeEstimate/ and /TellUsAboutIt/ load Google reCAPTCHA v2 (invisible, sitekey present). The homepage and most service pages have a form element with hidden fields only, and "Get an estimate" links instead of a visible form.
- Cost: an automated send would be blocked. Any outreach to this site goes to the hand-send list.

### 3. Business-to-customer copy is stale in places
- "Founded 30 years ago" and "almost 30 years" on /About/ and /About/OurTakeOnSafety/, while the footer says "Setting the Safety Standard Since 1992". Also "over 27 years" on /Industrial/. See facts.md, Conflict 1.
- The title on /About/AreasWeServe/ has a typo: "Residential and Commerical Electrical Service Areas".

### 4. The homepage is thin
- 132 words of body copy. Three bold question cards ("BREAKERS TRIPPING YOU UP?", "LIGHT BULBS BURNING TOO BRIGHT?", "WALL SWITCHES GETTING WARM?") lead, then a short intro. The services are only in the nav.

### 5. Industrial title claims certification with no detail
- Title on /Industrial/: "Wichita's Certified Industrial Electricians". The page body names no certification body. Unverified (see facts.md).

## Forms (not submitted)
| Page | Form | Fields (required marked *) | Max length | CAPTCHA |
|---|---|---|---|---|
| /contact/ | Contact | New/Existing (radio), First Name*, Last Name*, Address*, City, Zip Code, Preferred contact (Phone/Email), Phone Number*, Email Address*, Comments*, Category (Residential/Industrial/Commercial) | 250 on most text fields, 100 on one | Invisible reCAPTCHA |
| /GetAFreeEstimate/ | Free estimate | New/Existing, First Name*, Last Name*, Address, City, Zip, Phone, Email, Phone Number*, Email Address*, Category (radio), "Tell us a little about your project" | 250 / 100 | Invisible reCAPTCHA |
| /ScheduleService/ | Schedule service | Similar to the estimate form; required fields not checked one by one | 250 / 100 | Invisible reCAPTCHA |
| /TellUsAboutIt/ | Tell us about it | Similar; 5 radio groups | 250 / 100 | Invisible reCAPTCHA |

Mapping of max length to field names is from the ASP.NET DOM order, not confirmed field by field. The /contact/ screenshot is `audit/contact-page-1440x900.png`, and the estimate form is `audit/estimate-form-1440x900.png`.

## Title and H1 by page (1440 px)
| Page | Title | H1 (after the phone H1) |
|---|---|---|
| / | Licensed Electricians Proudly Serving Kansas Communities | Breakers Tripping You Up? / Light Bulbs Burning Too Bright? / Wall Switches Getting Warm? / Wichita's Safest Commercial, Industrial and Residential Electricians |
| /Residential/ | Residential Electricians \| El Dorado • Wichita • Derby • Winfield | The local residential electrician that makes you feel right at home. |
| /Residential/ServiceUpgrade/ | Residential Emergency Backup Generator Service | Emergency Home Backup Generators & Residential Service Upgrades |
| /Residential/Remodeling/ | Kitchen, Bath, and Interior Electrical Remodeling | Licensed Electricians for Kitchen and Bath Remodeling |
| /Residential/OutdoorImprovements/ | Enhance and Secure Your Outdoor Living Space | Residential Exterior and Landscape Lighting Installation |
| /Residential/TroubleshootingRepairs/ | Electrical Troubleshooting & Repairs | Proudly Providing Residential Electrical Repair in Wichita and its Surrounding Communities |
| /Residential/InspectionsCodeCorrections/ | Wichita's Safest Inspections and Code Corrections | Inspections and Code Corrections |
| /Residential/SmokeAlarms/ | Keep your home and family safe with up-to-date smoke alarms. | Smoke Alarms Save Lives |
| /Commercial/ | Commercial Electrical Contractors - Wichita's Safest Electricians | The commercial electrician that puts safety first – always. |
| /Commercial/ServiceUpgrades/ | Commercial Electrical Service Upgrades | Service Upgrades |
| /Commercial/CommercialRemodeling/ | Commercial Electrical Services - Wichita, KS | Commercial Remodeling |
| /Commercial/NewConstruction/ | New Construction Electric Design - Wichita, KS | New Construction |
| /Commercial/EmergencyandScheduledService/ | Commercial Emergency Service and Scheduled Maintenance | Emergency and Scheduled Service |
| /Industrial/ | Wichita's Certified Industrial Electricians | Our beginnings as industrial electricians was founded on extensive knowledge of control systems and automation. |
| /Industrial/PowerDistribution/ | Industrial Electricians for Power Distribution Services | If you're "moving power," choose the expertise of Wichita's safest industrial electricians. |
| /AutomationAndControls/ | Automation and Controls - Industrial Electrical Applications | Industrial Electrical Automation & Controls Systems |
| /contact/ | Contact Young Electric in Wichita, Kansas | Welcome to the start of Safe, Fast, Quality Service from Young Electric! |
| /About/ | Wichita, KS Electricians - About Young Electric | Safe, Fast, Quality Service. |
| /About/Testimonials/ | Electrical Repair Customer Testimonials | What our customers say about Young Electric |
| /About/AreasWeServe/ | Residential and Commerical Electrical Service Areas (typo) | Trying to find a licensed electrician in Wichita? |
| /About/Blog/ | Check out our blog and see Watt's New! | Welcome to our blog! |
| /About/PhotoGallery/ | Photo Gallery - Residential & Commercial Electrical Services | Let the light shine in |
| /About/OurTakeOnSafety/ | Unmatched Safety Among Wichita's Licensed Electricians | Safe, Fast, Quality Electrical Repair. It's been our mantra since 1992. |
| /About/WhatWeDo/ | Residential, Industrial, and Commercial Electrical Service Wichita | What We Do |
| /Careers/ | Jobs at Young Electric in Wichita, KS | CURRENT OPENINGS: |
| /TellUsAboutIt/ | Tell Us About It | Tell us about it! |
| /ScheduleService/ | Schedule Service | Schedule Your Next Electrical Service or Repair |
| /GetAFreeEstimate/ | Get A Free Estimate | Request A Free Electrical Repair Estimate |

## Word counts (body text, desktop)
Home 132 · Residential 397 · Residential service pages 101 to 171 · Commercial 412 · Commercial service pages 107 to 292 · Industrial 361 · Power Distribution 241 · Automation & Controls 192 · Contact 139 · About 303 · Testimonials 1,342 · Areas We Serve 206 · Blog 232 · Photo Gallery 122 · Our Take on Safety 238 · What We Do 201 · Careers 471 · Tell Us About It 150 · Schedule Service 130 · Get A Free Estimate 165.

## Offices and phones (every page)
- Address in footer on every page: 3046 E 31st St S, Wichita, KS 67216. One office on the site.
- Phone: 316.681.8118 (header and footer, every page).

## Speed and mobile
- Homepage, desktop, one run: DOMContentLoaded 1.0 s, load 1.0 s, 28 resources, no broken images. Mobile load time not measured separately.
- At 390 px the header is a three-icon bar (phone, email, menu) with four large tiles below. Layout is clean (`audit/homepage-390x844.png`).
- The mobile tap-to-call icon is the header phone; the text link beside it is 150x17, which is small for a tap target.

## Not checked
- Google Business Profile (not opened; only the prompt's review count).
- Facebook page (HTTP 400 to an automated request).
- Blog post dates and recency.
- Testimonial sources (the page does not say where they came from).
