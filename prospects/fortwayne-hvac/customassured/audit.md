# Current-site audit: Custom Assured Mechanical

- **Site checked:** https://customassured.com/home (also /). Crawled nine URLs; eight distinct pages (`/` and `/home` are the same page). Pages: /home, /our-company-1, /our-services, /financing, /contact, /bill-pay, /privacy-policy-terms-of-service, /cart.
- **Run:** 2026-11-15, Playwright Chromium, widths 1440x900 and 390x844. Forms not submitted. Nothing sent.
- **Screenshots:** `audit/` in this folder.
- **Load times (first load):** 0.6 to 3.4 s across pages.

## What works
- **Desktop menu (1440):** Our Company, Our Services, Financing, Contact, PAY BILL and the logo all load their pages (200). Verified by clicking each one.
- **Mobile menu (390):** opens from the "Open Menu" button. Visible items in my run: Our Services, LEAVE US A REVIEW (a Google search link), Contact Us, Privacy Policy, and the logo. Our Company, Financing and PAY BILL did not appear in the open menu in my run. Unverified on a real phone.
- **Homepage "Contact Us" button:** goes to /contact.
- **Email link:** `mailto:julie@customassured.com`, shown in the header and footer, and on /contact and /privacy.
- **Facebook link:** goes to http://facebook.com/customassuredmechanical. The link uses plain http. Not opened in a browser.
- **No horizontal overflow at 390:** scroll width 390 on every page.
- **Images:** no broken images found.
- **Placeholder text:** none found.

## What's broken, most costly first

### 1. The phone number is not tappable, and the homepage has no phone number
- The phone (260) 496-8400 appears only as plain text on /contact and /privacy. There is no `tel:` link on any page.
- The homepage shows no phone number at all; it has "Contact Us" and "LEAVE US A REVIEW" only.
- Cost: a phone visitor cannot call with a tap, and the number is hard to find on the homepage.

### 2. Broken video block on the homepage
- The video block under "Our Services" on the homepage shows "Video is not available or format is not supported. Try a different browser." (text captured on /home at 390 and 1440).
- Evidence: `audit/mobile-390-homepage.png` shows the homepage at 390.

### 3. The contact form has an invisible reCAPTCHA
- Contact form at https://customassured.com/contact. Fields: First Name (`fname`), Last Name (`lname`), Email (type email), a "Sign up for news and updates" checkbox, Subject (text), Message (textarea), and one extra text input with an empty label (`message-yui_...`, which may be hidden; not confirmed). Submit button labeled "Submit".
- Labels say "(required)" on First Name, Last Name, Email, Subject and Message, but the HTML `required` attribute is not set on any field. No `maxlength` on any field.
- Form `method` is **GET**. A submit would put the message into the URL. Not submitted.
- An invisible reCAPTCHA Enterprise iframe is on the page (`google.com/recaptcha/enterprise/anchor`, `size=invisible`). The crawler flagged no CAPTCHA only because the check looked inside the form element.
- Evidence: `audit/desktop-1440-contact.png`.

### 4. Services and financing pages are thin, and some have no H1
- Our Services (471 words) is generic: "Dependable Service", "Products for you" and product descriptions. It is long but says little about their own work.
- No H1 element on /cart, /our-services, /financing and /bill-pay.
- Financing page: "Financing Options Available With Approved Credit". The lender is not named.

### 5. Copy errors and internal inconsistencies
- "CPC Benifits" (Benifits is misspelled). "maintenances preformed" on Our Services (should be "performed"). "programable thermostat" (should be "programmable").
- Homepage says "Our service department is available around the clock"; the Contact page lists hours of Monday to Friday, 9 am to 4 pm. This is an internal tension to ask about, not a verified conflict.
- No copyright line on any page (only the map credit "©2026 Google" on /contact).

### 6. Cart and bill-pay pages
- The header cart icon goes to /cart, an empty shopping cart ("You have nothing in your shopping cart."). Visitors see it on every page.
- /bill-pay has instructions ("Click on 'Make a Payment' to pay a bill."). The "Make a Payment" control was not clicked, so its destination is unverified.

### 7. Testimonials
- Homepage testimonials are signed with first names and initials only: Elizabeth, Kathy, Tom. Looks like real customer quotes; not verified.

## Page inventory

| Page | Title | H1 | Words | Scroll width at 390 |
|---|---|---|---|---|
| customassured.com/home (also /) | Custom Assured Mechanical | "We earn our customers for a lifetime, not just a single job." and "We'd love to work with you." | 415 | 390 |
| customassured.com/cart | Custom Assured Mechanical | none | 31 | 390 |
| customassured.com/our-company-1 | Our Company — Custom Assured Mechanical | Meet the Team | 369 | 390 |
| customassured.com/our-services | Our Services — Custom Assured Mechanical | none | 471 | 390 |
| customassured.com/financing | Financing — Custom Assured Mechanical | none | 174 | 390 |
| customassured.com/contact | Contact — Custom Assured Mechanical | 2630 Independence Drive Fort Wayne, IN 46808 | 65 | 390 |
| customassured.com/bill-pay | Bill Pay — Custom Assured Mechanical | none | 81 | 390 |
| customassured.com/privacy-policy-terms-of-service | Privacy Policy & Terms of Service — Custom Assured Mechanical | Terms of Service; Privacy Policy | 865 | 390 |

## Not checked
- Google Business profile hours and photos.
- The "Make a Payment" destination.
- The LEAVE US A REVIEW target beyond its Google search URL.
- The Facebook page content.
- Whether the mobile menu shows all items on a real phone.
