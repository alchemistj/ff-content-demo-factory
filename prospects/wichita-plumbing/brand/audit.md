# Current-site audit: Brand Plumbing, Inc.

Site: https://brandplumbinginc.com/ (http://www.brandplumbinginc.com/ redirects here)
Pages crawled (all 200 at both widths): / , /about/ , /services/ , /services/repairs/ , /services/warranty-products/ , /blog/ , /blog/welcome-to-our-newly-redesigned-website/ , /contact/ , /pay-online/
Widths: 1440x900 and 390x844 (Playwright Chromium). Run date 2026-11-13. Screenshots: `audit/`.
Nothing submitted. No forms filled.

## What works
- **Desktop header (6 links):** PAY YOUR BILL ONLINE, ABOUT, SERVICES, BLOG, CONTACT, FACEBOOK. Each opens its page (200).
- **Mobile menu (slicknav hamburger at top right, 390 px):** opens and lists ABOUT, SERVICES (with a ► sub-menu for Repairs & Repiping and Warranty & Products, both 200), BLOG, CONTACT, Facebook. Desktop has no dropdown; Services is a plain link.
- **Homepage tabs** (NEW CONSTRUCTION / COMMERCIAL / OUR VENDORS) are in-page anchors. They exist; the commercial tab click did not change the URL (in-page content switch, not verified visually).
- **Facebook link** returns 200 in a browser (a direct request returned 400, which is bot filtering, not a broken link).
- **Internal and external links checked (200):** all the pages above, the blog post, enegren.com (site credit), cooksheatingandcooling.com (HVAC referral, http).
- **No broken images** found on any page at either width.
- **No sideways scroll at 390 px** on any page (scrollWidth 390 = viewport).
- **Titles and H1s:** every page has a title and an H1. The H1 on every page is the site name ("Brand Plumbing, Inc. Wichita, KS"); the visible section headings carry the page topic.

## What's weak, most costly first

### 1. The phone number is not tappable on any page, at either width
- "(316) 942-2306" appears as plain text in the "Have a plumbing problem? Call or stop by" block (homepage, services, repairs, warranty, blog, contact, pay-online) and on the contact page. Zero `tel:` links on any page.
- Evidence: `audit/` 390 px screenshots; the page text shows the number in plain text in the footer block.
- Cost: a phone visitor cannot tap to call.

### 2. No contact form
- /contact/ has the office hours, address, phone, fax (316) 942-3119 and mailto links for mary@, mike@ and marc@brandplumbinginc.com. No form, no CAPTCHA, no iframe.
- Cost: no form for a visitor to use; also means the standing outreach route is unavailable (see qualify.md).

### 3. Dated and thin content
- Blog: one post, "Welcome to Our Newly Redesigned Website!", dated August 13, 2015 (/blog/). Footer says "© 2026" over that old blog.
- Pages are short: homepage 192-196 words; /contact/ 113-117 words; /blog/ 109-113 words; /services/ about 392-402 words. Totals per page are at the top of this file (the crawl recorded them).
- Homepage "FROM THE BLOG" block shows the 2015 post as the newest item.
- Cost: the site reads as a 2015 build with a 2026 footer.

### 4. Pay-online page is a third-party ACH form
- /pay-online/ posts to https://alangroup.transactiongateway.com/cart/cart.php (hidden fields plus submit, "Pay By ACH / e-check (No fee)"). Not inspected beyond the form fields; the visible content is the ACH option only.

### 5. Desktop Services link goes straight to the Services page
- No dropdown on desktop; the Repairs and Warranty pages are reachable only from the Services page or the mobile menu. Minor.

## Word counts (visible text, rough)
- / : 196 (1440) / 192 (390)
- /about/ : 195 / 191
- /services/ : 402 / 392
- /services/repairs/ : 237 / 227
- /services/warranty-products/ : 316 / 306
- /blog/ : 113 / 109
- /contact/ : 117 / 113
- /pay-online/ : 81 / 77

## Titles and H1s
- / : "Reliable Plumbers Since 1981 » Brand Plumbing, Inc. Wichita, KS"
- /about/ : "Full-Service Plumbers in Wichita » Brand Plumbing, Inc. Wichita, KS"
- /services/ : "Plumbing Solutions in Wichita » Brand Plumbing, Inc. Wichita, KS"
- /services/repairs/ : "Repair and Repiping Services » Brand Plumbing, Inc. Wichita, KS"
- /services/warranty-products/ : "Trusted Plumbing Products » Brand Plumbing, Inc. Wichita, KS"
- /blog/ : "Trusted Plumbing Information » Brand Plumbing, Inc. Wichita, KS"
- /contact/ : "Dependable Plumbers in Wichita » Brand Plumbing, Inc. Wichita, KS"
- /pay-online/ : "Pay Your Bill Online » Brand Plumbing, Inc. Wichita, KS"
- H1 on every page: "Brand Plumbing, Inc. Wichita, KS" (site name). Section H1s: ABOUT, SERVICES, REPAIRS & REPIPING, WARRANTY & PRODUCTS, BLOG, CONTACT, PAY ONLINE.

## Addresses and phones (every instance on the site)
- 2418 S Hoover Rd, Wichita, KS 67215 (all pages, footer block)
- (316) 942-2306 phone (all pages); (316) 942-3119 fax (/contact/)

## Not checked
- Speed: page loads measured 2.9 to 3.6 s through the agent proxy; not a real-device or PageSpeed test.
- Real-phone dialing: moot, there are no tel links.
- Google listing hours, address and owner replies: not pulled (no review pull for a qualify-stage prospect).
