# Ash's Barber Collective (Ozark, MO): confirmed facts

Sources: the demo's data files on branch `origin/claude/ashs-photo-placeholders` of ff-astro-demos, under `clients/ashs-barber-collective/src/data/`. A web search for the shop's hours and listing (2026-11-09) found nothing about this business, so the Google listing and the shop's own site were not checked. Everything below is only as good as the demo data.

## Confirmed (from the data files)
- **Name:** Ash's Barber Collective. (site.ts)
- **Type:** barber shop / barbershop. (site.ts `chrome.bottomRight`: "Barber Shop in Ozark, MO"; chrome.description)
- **Address:** 5104 N 22nd St, Ozark, MO 65721. (site.ts `site.address`; contact.ts)
- **Phone (call):** 417.380.3078, shown as (417) 380-3078. (site.ts `phoneDisplay`, `phoneHref` tel:+14173803078)
- **Not Ash's number:** (417) 373-2773 in site.ts is Fluid Frame's own text line for the strategy page. Never put it on Ash's pages.
- **Online booking:** Square booking page, https://book.squareup.com/appointments/77swrfww28wf0y/location/L7RTB2NJBH1F8/services. (site.ts `bookingUrl`; home.ts FAQ "Square booking page")
- **Booking button labels in use:** "Book Your Haircut" (home.ts), "Book a Kids or Teen Haircut" (kids.ts), "Book Your Beard Appointment" (beard.ts), "Book Online" (contact.ts), "Book Now" (site.ts chrome).
- **Wheelchair accessible entrance:** shown on the Google listing. (home.ts FAQ, contact.ts FAQ, site.ts trustItems)
- **Rated highly on Google.** (site.ts trustItems; ratingAsOf 2026-10-22). No star number or review count is in the data, so none is used.
- **Services:** barber haircuts; fades and tapers; kids and teen haircuts (incl. first haircuts); beard trim, beard cut, beard shaping; haircut and beard in one visit (tell the shop when booking). (home.ts, kids.ts, beard.ts, contact.ts, site.ts footerServices). Only beard trim is backed by a review (Scott W.); beard cut and shaping rest on the demo's own copy.
- **The barber is "Ash" / "Ashley."** Reviews name "Ashley" and "Ash" (reviews.ts). The demo photos show "Ash at her barber station" (site.ts image alt text).
- **Beard oils for sale or on display at Ash's station:** photos show a collection of beard oil bottles and tins on the counter (site.ts image alts; beard.ts caption "A look at the beard oil collection at the shop").
- **Pages/routes:** /home/, /beard-trim-cut-shape-ozark-mo/, /kids-teen-haircuts-ozark-mo/, /contact/ (routes.json; the "/" strategy page is owner-facing and not written here).
- **What reviewers confirm:** same cut every time (Levi B., Matt M.); a 5-year-old with multiple cowlicks (Josie M.); toddlers (Mark B.); kids getting what they want (Sabrina L.); fades (Austin C., Chris V.); quick (Mark B., Chris V., Brady R.); conversation (Matt M., Gordon W., Brady R.); easy to contact and schedule (Matt M.); clean and professional (Derek B.); relaxing environment (Takota S.); a haircut and/or beard trim (Scott W.).

## Reviews note
reviews.ts gives only text and a name per review, no star ratings or dates. As instructed, all 15 are treated as five-star in reviews.json. The data says the shop is "highly rated," but no individual rating is shown, so this is an assumption.

## Not confirmed (kept off the pages)
- Hours of operation. Not in any data file.
- Walk-ins. Nothing says whether the shop takes them.
- Prices for any service (the old copy only says prices are on the booking page; not verified).
- How long a cut, kids cut or beard appointment takes.
- Whether Ash owns the shop, how long she has cut hair or run the shop, licenses, training.
- Whether other barbers work there (the name says "Collective"; every review names Ash/Ashley).
- Star rating, review count, years in business.
- Payment methods, parking, age minimums, cancellation policy.
- Service area beyond Ozark itself. A review mentions a customer who moved from Kansas; no towns are listed.
- Whether beard oil is sold, and which brands.
- Email address (the old contact form has an Email field but no address is given).
- The business's own website or Google listing: not reached.
