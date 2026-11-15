# Current-site audit: JD Kuhn Heating And Air Conditioning LLC

- **Site checked:** https://www.jdkuhnhvac.com/ (brief URL http://www.jdkuhnheating.com/ redirects here). One page; the menu links are section anchors (`#OurServices`, `#AboutUs`, `#Reviews`, `#FAQ`, `#OurWork`, `#Contact`).
- **Run:** 2026-11-15, Playwright Chromium, widths 1440x900 and 390x844. Forms not submitted. Nothing sent.
- **Screenshots:** `audit/` in this folder.
- **Load times (first load):** homepage 3.2 s at 1440 and 2.5 s at 390. Slower than the other two sites in this batch, but no single resource is shown as failing.

## What works
- **Menu (desktop, 1440):** Home, Our Services, About Us, Reviews, FAQ, Our Work, Contact. All seven resolve to the homepage or the matching anchor, and every target exists. Verified by clicking each one.
- **Menu (mobile, 390):** the same items appear after opening the menu. Verified by clicking each one.
- **Phone links:** `tel:` links point to 2604131856. Visible and tappable at 390 (the "Call Us" button and the phone text) and at 1440 (header phone). Non-visible copies exist in the DOM and are hidden.
- **Email link:** `mailto:justin@jdkuhnheating.com` in the contact section and footer. Visible.
- **Images:** no broken images found.
- **Placeholder text:** none found (no lorem, "example.com" or copied-page text in the crawled text).

## What's broken, most costly first

### 1. The page does not fit a phone screen (390 px)
- At 390 px the document is 768 px wide. The page scrolls sideways by about 378 px.
- Evidence: `audit/mobile-390-homepage-full-768px-overflow.png` (full page at 768 px wide, cut off on the right).
- Cost: most HVAC searches on a phone. A phone visitor has to scroll sideways to read the page.

### 2. No contact form; booking goes to Housecall Pro
- The page has 0 `<form>` elements.
- "Book Now" (three buttons: header, hero and a repeat) opens a Housecall Pro booking dialog. The dialog loads `https://book.housecallpro.com/book/JD-Kuhn-Heating-And-Air-Conditioning-LLC/...` in an iframe. In my screenshot after 3 s the dialog did not render visibly, so I have not confirmed what the visitor sees. Not completed.
- "Chat with us" is a Housecall Pro chat widget in an iframe (`messages.housecallpro.com`). A floating chat button also shows bottom-right at 1440.
- Evidence: `audit/desktop-1440-book-now-click.png`.

### 3. Three of the phone numbers on the page are referrals, not the business
- The FAQ sends geothermal, duct cleaning and fireplace work to other businesses (260-927-5225, 260-432-7796, 260-483-2126). Those numbers appear in the phone list, so a crawl that reads all numbers will pick them up. They are not JD Kuhn's numbers.

### 4. Email domain does not match the site
- Email is on @jdkuhnheating.com; the site is jdkuhnhvac.com. See `facts.md`, Conflict.

### 5. Empty or unlabeled buttons
- About 30 buttons on the homepage have no label (text "Button", most of them linking to `/`). These are likely slider or decorative controls. They are not labeled for a screen reader.

### 6. Copy and structure
- One H1 ("Your Comfort Zone Experts"). The page title is "JD Kuhn HVAC: Trusted HVAC Experts", which uses the HVAC brand rather than the legal name.
- The footer copyright is "© JD Kuhn Heating And Air Conditioning LLC" with no year.
- 732 words on the homepage, all on one page. The FAQ has six Q&As, and they are useful content.
- The reviews section is labeled "Happy Clients" with generic copy. No named testimonials in the crawled text.

## Page inventory

| Page | Title | H1 | Words | Scroll width at 390 |
|---|---|---|---|---|
| https://www.jdkuhnhvac.com/ (one page, all sections) | JD Kuhn HVAC: Trusted HVAC Experts | Your Comfort Zone Experts | 732 | 768 (overflow) |

## Not checked
- Google Business profile hours and photos (not pulled; `reviews.json` has review data only).
- The booking flow itself (not submitted).
- BBB, Facebook and other profiles.
- Dialog content from Book Now on the phone (no visible button at 390 in my run).
