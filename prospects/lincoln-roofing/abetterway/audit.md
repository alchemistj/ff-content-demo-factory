# Current-site audit: A Better Way Construction & Roofing

Run date: 2026-11-15. Playwright Chromium, 1440x900 and 390x844. Read-only: no form submitted, nothing typed into any field, no email sent.
Site: https://abetterwayconstructionandroofing.com/ (WordPress with the Divi theme; the contact form is the Happyforms plugin).
Screenshots: `audit/` in this folder.

## Contact form (the one the brief asked for)

- **URL:** https://abetterwayconstructionandroofing.com/contact-a-better-way-construction-roofing-company/ (linked from "Request FREE Estimate" and "CONTACT US" on every page).
- **Fields, in order** (from the page HTML):
  1. Hidden honeypot, labelled "Leave this field blank" (text, hidden, not required). Do not fill.
  2. First Name, text, not required in HTML
  3. Last Name, text, not required in HTML
  4. E-mail, email, not required in HTML
  5. Phone, tel, not required in HTML
  6. Subject, text, not required in HTML
  7. Message, textarea, not required in HTML
  8. A select, labelled empty in the DOM, **required**. Options: "" (blank), "Internet Web Search", "I saw your company truck(s)", "Recommended by a friend or colleague", "Social Media", "Yard Sign". These are referral sources, not services. QUALIFY.md called this a "required service select"; that is wrong.
  - Submit button: "Send".
- **Required fields:** only the referral select, per the HTML `required` attribute. No maxlength on any field.
- **Iframe:** one iframe with no src attribute. No CAPTCHA markup.
- **CAPTCHA:** none. No reCAPTCHA, hCaptcha or Turnstile script, iframe or badge found on the page (checked in the HTML at 1440 px). The contact form is a plain send target.
- **Other forms on the site:** the blog search (https://abetterwayconstructionandroofing.com/a-better-way-construction-roofing-blog-page/), a site search, required field "Search". No other forms.

## What works

- **Top menu and dropdowns:** every target opens at both widths. I checked all 33 unique menu targets in the browser (200 each): PROJECTS, REVIEWS, TIPS (blog and page 2), CONTACT, ROOFING and its 12 city pages (Lincoln, Seward, Crete, Waverly, Milford, Eagle, Greenwood, Beatrice, Wahoo, Ashland, Hickman, Roca), CONSTRUCTION, DECKS, ABOUT, and the blog posts listed in the menu.
- **"Request FREE Estimate" and "CONTACT US"** go to the contact page (200).
- **"Our Work" filter tabs** (All, Concrete, Decks, Fencing) change the visible set of project images in place. Counts moved each time (for example Concrete 9 to 4). This is a light check, not a full one.
- **Mobile menu:** the Divi mobile menu toggle is present at 390 px. I did not click it open.
- **Phone links:** `tel:402-432-6800` and `tel:+14024326800` are visible links on every page. The fixed bottom bar at 390 px ("CALL US", "MESSAGE", "EMAIL US") is visible and works as a link.
- **Layout at phone width:** no horizontal scroll on any of the 20 pages crawled (scrollWidth 390 at 390 px).
- **Broken images:** none found on the pages crawled.
- **Placeholder text, lorem, example.com:** none found.
- **Copyright:** "© 2026 – A Better Way Construction & Roofing" in the footer.
- **Hero at 390 px:** the "CONTACT US" button sits partly off the left edge in an early screenshot. After the page settles (4 seconds) it sits in place (audit/home-390x844.png). Not a defect.

## What's broken or weak, most costly first

### 1. Several service menu links go to one general page
- These all go to https://abetterwayconstructionandroofing.com/general-construction-contractor-in-lincoln-nebraska: Gutters, Custom Skylights, Siding/Soffit/Fascia, Remodeling, Aluminum Fence Installation, Concrete, General Construction, and Sky Lights (second menu).
- Cost: a visitor looking for skylights, fence or siding lands on the same generic "Your Local Contractor" page (H1). No dedicated page for those services.

### 2. Conflicting years of experience
- "With over 40 years of experience" (homepage, contact, about and services text: https://abetterwayconstructionandroofing.com/ ; https://abetterwayconstructionandroofing.com/about/).
- "20+ years of proven experience" (https://abetterwayconstructionandroofing.com/residential-roofing).
- Ownership: "For the past six years, Alex and Maria have proudly owned and operated" (https://abetterwayconstructionandroofing.com/about/). The two can both be true (the company is older than its owners), but the site never says which years are the company's and which are the roofing crew's.

### 3. Legal name is written two ways
- "A Better Way Construction & Roofing LLC" (review text: https://abetterwayconstructionandroofing.com/customer-reviews/ and the Facebook review on the homepage).
- "A Better Way Construction, LLC" (https://abetterwayconstructionandroofing.com/about/).
- Cost: small, but a demo should not print a legal name the owner has not confirmed.

### 4. The owners' phone numbers: one is not tappable
- Alex: (402) 432-6800, tappable.
- Maria: (402) 570-5813, shown as text only on the contact page (https://abetterwayconstructionandroofing.com/contact-a-better-way-construction-roofing-company/). No tel link.

### 5. Email domain is not the website domain
- Owner email is alex@lincolnroofingexperts.com, on a different domain from the website (https://abetterwayconstructionandroofing.com/contact-a-better-way-construction-roofing-company/). Visible on every page. Same point QUALIFY made. Worth raising on the onboarding call.

### 6. Reviews on the site are unnamed
- The customer-reviews page and the homepage reviews carousel show quotes labelled "Facebook Review" or "Google Review" with no reviewer names (https://abetterwayconstructionandroofing.com/customer-reviews/). The same quote appears three times on the reviews page.
- Quotes are not checked against Google (review pulls are for final picks only).

### 7. Certifications on the site
- "WE ARE GAF CERTIFIED" (homepage), "GAF Certified Roofing Contractor" (https://abetterwayconstructionandroofing.com/residential-roofing), "fully insured and licensed with the City of Lincoln" (homepage), "Lead-Paint Certified" (homepage). None is confirmed here. GAF locator not checked. Per the rules, no certification goes on a demo until the manufacturer's locator confirms it.

## Other observations

- Homepage H1 is "Construction & Roofing"; the homepage's first visible H1 is that phrase, and it also contains "A BETTER WAY CONSTRUCTION & ROOFING" (logo). Title is "A Better Way Construction & Roofing | Lincoln Roofers, Painting, Fencing & More".
- Title and H1 pairs on the service pages are clear: "Residential Roofing" (title "Professional Residential Roofing Installation"), "Decks" (title "Custom Deck Installation in Lincoln, NE"), "Roof Repairs", "Painting" (title "Lincoln, NE Painting Contractor Interior & Exterior Painters").
- City pages: 800 to 1,570 words each, with H1s such as "Lincoln Roofing", "Seward Roofing", "Crete Roofing" (https://abetterwayconstructionandroofing.com/residential-roofing/crete-nebraska/). Not compared line by line for duplication.
- Blog has at least two pages of posts. Longest checked: "How Can I Tell If My Roof Was Damaged by Wind" (3,445 words).

## Not checked (and why)

- **Form submission:** not submitted, per the brief.
- **Hours:** none found on any page crawled. Not stated on the site.
- **Financing:** none found on the site.
- **Google listing:** not pulled (QUALIFY method). Address and rating not confirmed.
- **Speed:** no PageSpeed or Lighthouse score recorded.
- **Phone dialing on a device:** no device; tel links checked as hrefs only.
- **Mobile menu opened:** toggle found, not clicked open.
- **External links:** Facebook and Google review links not opened.
