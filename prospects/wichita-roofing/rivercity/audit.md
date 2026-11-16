# River City Roofing: current-site audit

Site: https://rivercity-roofing.com/ (WordPress with Elementor). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900. Screenshots are in `audit/`. No form was submitted.

Pages found (10, all HTTP 200): /, /about/, /services/, /contact/, /services/roofing/, /services/gutters/, /services/siding/, /services/painting/, /services/windows/, /services/deck-staining/. No other internal pages were linked.

## What works
- Clear service list in the header and on the services page: six services, each with its own page and each page with real copy (roofing has the most: roof installation, repairs, maintenance, replacement).
- Every desktop menu link and every service card lands on the right page. No 404s on any page at either size.
- Phone number is shown in the header (desktop), in the footer and on the contact page, and it matches the Google profile.
- Contact page has a real form (Gravity Forms) with name, email and message fields, plus reCAPTCHA and a honeypot.
- Copyright line is current ("2026").

## What is broken, most costly first

1. **Every tap-to-call link dials 123-456-7890.** On all 10 pages, at both sizes, the two `tel:` links are `tel:123-456-7890`. Those are the two footer links (one visible and one hidden at each size). The visible number is (316) 295-2159. So a visitor who taps the number on the phone reaches a placeholder line. The header number (316) 295-2159 is plain text, not a link, at desktop size, and it is hidden on mobile. Screenshots: `audit/home-mobile-footer-phone.png`, `audit/home-desktop-footer-phone.png`, `audit/home-desktop-top.png`.

2. **The page has no visible headline.** The only H1 on each page is hidden (`display: none`) and reads the page name: "Home" on the homepage, "About", "Our Services", "Contact", "Roofing", and so on. The visible heading on the homepage is the brand name "RIVER CITY ROOFING", followed by generic copy. Nothing on the page says "roofing in Wichita" in a heading. Browser title: "Home - River City Roofing". Screenshots: `audit/home-desktop-top.png`, `audit/home-mobile-top.png`.

3. **Copy written for another trade.** The Windows page says "Our experienced painters specialize in diagnosing and repairing a variety of window issues". The Painting page says "our skilled painters". Screenshot: `audit/services-windows-painters-copy.png`.

4. **Trust claims with nothing behind them, and no proof of the basics.** The About page says the company is a member of the Wichita Area Builders Association, the Wichita Chamber of Commerce and the Wichita Better Business Bureau, and that it is "Certified Aging in Place Specialists (CAPS) and Certified Anderson Installers and Certified Pella Installers". None of those has a badge, number or link. On the whole site there is no mention of a licence, insurance, bonding, warranty, financing, reviews, testimonials or the owner's name (0 hits each in the visible text of all 10 pages). See `facts.md`.

5. **Leftover staging address behind the logo.** The logo link (no text) goes to `https://xku.82a.myftpupload.com/`, a staging host, not to rivercity-roofing.com. Clicked at desktop, it lands on the homepage, so it looks fine to a visitor, but it is an old address in the markup.

6. **The email address is not shown and there is no mailto link.** No email address appears anywhere on the site, and there are no `mailto:` links. The contact form has an email field, but the site never states an address. This is not a broken link, but a visitor cannot write to them directly.

7. **Service-page call-to-action number is not tappable.** On the roofing page, the "Call us Today for a Free Quote at" line is followed by an H2 with (316) 295-2159 as plain text. Checked on /services/roofing/ only; the other service pages use the same template but were not each checked for this.

8. **Copy inconsistencies.** Roofing page: "Contact us today to scheduled." (grammar). Homepage: "With decades of collective experience". About page: "Since 2011". Those do not match each other (2011 to 2026 is 15 years), so one of them is wrong or unclear.

9. **Thin pages.** Gutters, siding, painting and deck staining pages are one or two paragraphs of copy with a list of service names. No prices, warranties, photos, or before-and-after work on any page. No gallery, no project list, no reviews.

## Phone numbers and offices
- (316) 295-2159: the only phone number on the site. Shown as plain text in the header (desktop only), as plain text in the footer, and as the label of the footer `tel:` links (which dial 123-456-7890). Also on the contact page.
- Office: one address, 3750 N Topeka St, Wichita, KS 67219 (contact page, footer). No second office.
- Google profile phone (316) 295-2159 matches the site's number.

## Forms
- **Homepage "Quick Contact"** (Elementor form): First Name*, Last Name*, Phone Number*, Email*, Message, Submit. Invisible reCAPTCHA badge present (1 on each size). Not submitted.
- **Contact page** (Gravity Forms, `#gform_2`): name fields, email, message, Submit. reCAPTCHA and a honeypot field present. Not submitted.
- The homepage search box is a WordPress search, not a contact form.

## Titles and H1s (desktop)
| Page | `<title>` | H1 (hidden) |
| --- | --- | --- |
| / | Home - River City Roofing | Home |
| /about/ | About - River City Roofing | About |
| /services/ | Our Services - River City Roofing | Our Services |
| /contact/ | Contact - River City Roofing | Contact |
| /services/roofing/ | Roofing - River City Roofing | Roofing |
| /services/gutters/ | Gutters - River City Roofing | Gutters |
| /services/siding/ | Siding - River City Roofing | Siding |
| /services/painting/ | Painting - River City Roofing | Painting |
| /services/windows/ | Windows - River City Roofing | Windows |
| /services/deck-staining/ | Deck Staining - River City Roofing | Deck Staining |

Every page's H1 is hidden by the theme on both sizes. Each page's visible heading is the brand name or the service name in red.

## Menu and link checks
- **Desktop:** every unique link on all 10 pages was clicked (20 page-and-size runs, including mobile). Header nav, service cards and the dropdown items all land on the correct page. No dead links.
- **Mobile:** the hamburger opens the menu (screenshot `audit/home-mobile-menu-open.png`). It shows HOME, ABOUT US, OUR SERVICES and CONTACT US, with hrefs matching desktop. Playwright clicks on these four items timed out on every page, so the click-through is not confirmed on mobile. The service dropdown items (ROOFING, GUTTERS, etc.) did work on mobile.
- **Facebook link** (`facebook.com/profile.php?id=61559087330964`): opens the "River City Roofing" Facebook page.
- **Instagram link** (`instagram.com/river.city.roofing/`): from the homepage, About and Services pages it opened the Instagram login page; from the contact page it opened the profile. Not a site problem, but the link is not dependable.

## Speed and things not checked
- PageSpeed Insights: the API returned "Quota exceeded" (HTTP 429), so no score. Not checked in Lighthouse.
- Yext widget: the browser console on the homepage showed "Invalid API Key" errors from a Yext knowledge-tags embed. Not visible on the page; noted only.
- No form was submitted, so what the forms do with the data is unverified.
- Sitebulb export: none provided.
- Google profile hours and reviews were not compared to the site, because the site shows "Mon-Fri 8:00AM - 4:30 PM" and the scout data has no hours.
