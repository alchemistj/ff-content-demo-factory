# Facts: Ballinger Electric

Compiled 2026-11-09. Each line cites its source. Marked **(uncertain)** where the source is a search summary, an inference, or conflicts with another source. "Site" means https://www.ballingerelectric.com/ (pages cited by path). "Maps scout" means the Google profile data in the brief (2026-11-09); I did not open the Google profile myself.

## Identity

- Business name as shown on the site: "Ballinger Electric". Site title on all pages: "... | Ballinger Electric" (https://www.ballingerelectric.com/). Logo reads "BALLINGER ELECTRIC" with a lightning icon (homepage image).
- Legal name: **"Ballinger Electric LLC"** appears in directory listings (HomeAdvisor/Angi "Ballinger Electric LLC", seen in search results: https://www.homeadvisor.com/rated.BallingerElectric.147006299.html; ServiceAgent: https://serviceagent.ai/directory/kansas/wichita/electrician/ballinger-electric/). **(uncertain)**: I did not open these pages and did not find a Kansas Secretary of State record to confirm the LLC name (see Licensing and registration).
- Google name: "Ballinger Electric" (Maps scout, 2026-11-09).
- Google categories: Electrician / Electrical installation service (Maps scout, 2026-11-09).
- Google place ID: ChIJH_JPc5-2IEYRWuyV3hyDN30 (Maps scout, 2026-11-09). The site's "READ MORE REVIEWS" button points to a Google search URL that includes a Google place identifier (0x4620b69f734ff21f:0x7d37831cde95ec5a) (https://www.ballingerelectric.com/, "READ MORE REVIEWS" link). The site's map embed uses the same place identifier (homepage map iframe). **(uncertain)**: the place identifier in the site's link and the Maps scout place ID are written in different formats; I did not confirm they are the same place.

## Contact

- Phone: **(316) 213-4513**. Shown on every page as "Call Us Today! (316) 213-4513" (https://www.ballingerelectric.com/, /contact). Same number in Maps scout (2026-11-09). Plain text, not tappable (see audit.md, finding 2).
- Email: **benjaminballinger87@gmail.com**. Shown on /contact as text and as mailto link (https://www.ballingerelectric.com/contact). Personal Gmail address; no business-domain email found on the site.
- Street address (Google): **1711 S Eisenhower Ave Suite B, Wichita, KS 67209** (Maps scout, 2026-11-09). Also shown in directory listings (search results: ServiceAgent and HomeAdvisor/Angi, see Identity).
- Address on the site: **no street address**. The site shows "Ballinger Electric / Wichita, KS 67215" (https://www.ballingerelectric.com/contact, lower block; also on homepage and service pages). **ZIP conflict**: the site says 67215; Google says 67209 (conflict, unresolved).
- Facebook: https://facebook.com/people/Ballinger-Electric/61563743377664 (linked from the site header; brief). The Facebook page loads, but only its title was readable ("Ballinger Electric", Wichita, KS). Creation date and About text not confirmed.
- Facebook creation: "created in 2024" (per the prospect qualify note, /home/user/ff-content-demo-factory/prospects/wichita-electrical/ballinger/qualify.md). **(uncertain)**: from the scout note, not verified in this session.

## Hours

- **Mon - Fri 8:00 am - 5:00 pm; Sat - Sun Closed** (https://www.ballingerelectric.com/contact). Only the contact page states hours.
- Google hours: not in the brief and not checked. **(uncertain)**.
- Conflict: the Electrician page says emergency service is available "no matter the time of day or night" (https://www.ballingerelectric.com/electrician, "Emergency Services"). After-hours availability is not stated in any other way.

## Services (named as the site names them)

Homepage cards and page headings (https://www.ballingerelectric.com/):
- "Electrician" (page: /electrician, H1 "Electrician in Wichita, KS")
- "Electrical Panel Replacement" (page: /electrical-panel-replacement, H1 "Electrical Panel Replacement in Wichita, KS")
- "Electrical Upgrades" (page: /electrical-upgrades, H1 "Electrical Upgrades in Wichita, KS")
- A third homepage card links to /lighting, which redirects to the homepage (no lighting page exists). See audit.md finding 3.

Named sub-services by page:
- /electrician: "Electrical Repairs", "Wiring & Rewiring", "Lighting Installations", "Emergency Services".
- /electrical-panel-replacement: "Panel Upgrades", "Troubleshooting & Diagnosis", "Professional Installation".
- /electrical-upgrades: "Panel Upgrades", "Wiring Upgrades", "Lighting Upgrades", "Circuit Additions", "Generator and Surge Protection Upgrades".
- /about and homepage: "custom lighting design" (text only).

Customers: "We serve both residential and commercial properties" (https://www.ballingerelectric.com/electrician, homepage). The contact form asks "Type of Service": Residential / Commercial / Other (Please Specify) (https://www.ballingerelectric.com/contact).

## Service area

- "Wichita, KS and Surrounding Areas" (https://www.ballingerelectric.com/, hero line "Serving Wichita, KS and Surrounding Areas").
- No towns listed by name. **(uncertain)**: "surrounding areas" is not defined.

## Years in business and people

- Years in business: **not stated**. The site says "With years of experience" on the homepage, Electrician, and About pages, with no number (https://www.ballingerelectric.com/about).
- Founded: **not stated** on the site. About page: "Founded on the principles of integrity, expertise, and exceptional customer service" (https://www.ballingerelectric.com/about). No year.
- Facebook page created 2024 (see Contact, uncertain). A search summary of a Manta listing said "served the Wichita area since August 2024", which is probably a listing date, not a founding date. **(uncertain)**.
- Owner name: **not confirmed by any source**. Evidence that exists:
  - Reviews on the site name "Ben" (four quotes on every page: "Ben was quick to reply...", "Ben was friendly...", etc.) (https://www.ballingerelectric.com/).
  - The email is benjaminballinger87@gmail.com (see Contact). **(uncertain)**: "Benjamin Ballinger" is an inference from the email address, not stated anywhere.
  - A search summary reported a HomeAdvisor review mentioning a technician named "Ben"; the summary said the page does not say he is the owner. **(uncertain)**.
- About page: "Our team of skilled, licensed electricians", no names listed (https://www.ballingerelectric.com/about).
- Locally owned: "As a locally owned business in Wichita, KS" (https://www.ballingerelectric.com/, "Locally Owned and Operated").

## Licensing and registration

### Electrical contractor license (MABCD, Wichita / Sedgwick County)
**Not confirmed.**
- What I tried: the MABCD public portal lookup (https://mabcdportal.sedgwickcounty.org/Views/CDR/CDRLookUpMain.aspx). The "Lookup Contractor License" link leads to an application lookup that searches by application number, applicant, address or parcel, not a contractor-license lookup by name. Searching by applicant "Ballinger" (establishment, all statuses, 1/1/1990 to 11/9/2026) returned three "Trade Certificate" records:
  - CER2015-10164: issued 12/13/2023, fee $210, status Expired.
  - CER2024-12703: issued 12/5/2025, fee $70, status Active.
  - CER-3868: issued 3/10/2022, fee $195, status Expired.
  - The record summary pages show no applicant name, license class or license number, so I cannot tie any of these to Ballinger Electric. They are not confirmed as this business's license. **Not used as confirmation.**
- The MABCD renewal guide says contractor license numbers begin with "BUS" (search summary of https://mabcdportal.sedgwickcounty.org/ContractorLicensingInstructions.pdf). None of the three records above has that prefix. This is not proof either way.
- Site claim only: "Our licensed electricians" and "fully licensed" (https://www.ballingerelectric.com/electrician; /about). Not a confirmation.
- No license number appears on the site or in directory listings I could see.

### Kansas Secretary of State (LLC)
**Not checked in the state portal.** The SOS Business Entity Search (https://sos.ks.gov/eforms/BusinessEntity/Search.aspx) needs an interactive security check, which I could not run. A web search found no SOS record for Ballinger Electric. Legal name, formation date, registered agent and status are **unconfirmed**.

### BBB
No Better Business Bureau profile for Ballinger Electric appeared in search results. **Not confirmed.** Accreditation status unknown.

### Insurance, bonding, warranties, financing
- Insurance: **not mentioned** on any page I crawled (text search of all seven pages: no "insur", "bonded", "warrant" or "financ" matches).
- Warranties: **not mentioned**.
- Financing: **not mentioned**.

## Reviews and ratings

- Google: 5.0 stars, 158 reviews (Maps scout, 2026-11-09). Not verified in this session.
- Directory listings in search results describe about 100 Google reviews averaging 5.0 (ServiceAgent summary). **(uncertain)**: conflicts with the 158 in Maps scout; different times or sources.
- Site testimonials (same four quotes on every page): Spencer L., Terri H., Jason R., Bonnie T. (https://www.ballingerelectric.com/). Dates and review sources not shown. Not verified against Google.

## Other claims on the site (stated, not verified)

- "Free estimate": "We offer free estimates" (https://www.ballingerelectric.com/electrician). Testimonial also says "provided a free estimate".
- "Clear, upfront pricing", "no hidden fees" (https://www.ballingerelectric.com/electrical-upgrades; /electrical-panel-replacement).
- "Prompt emergency electrical services ... no matter the time of day or night" (https://www.ballingerelectric.com/electrician) (conflicts with hours; see Hours).
- "Up to code", "meets all local codes and regulations" (https://www.ballingerelectric.com/electrical-panel-replacement).
- "Sustainability ... recycling whenever possible"; "sponsoring community events", "volunteering our time" (https://www.ballingerelectric.com/about). No examples given.
- Meta description (homepage): "Ballinger Electric is an Electrician in Wichita, Kansas and surrounding areas. We specialize in Electrical Panel Replacement, Lighting Services and More."

## Website facts (for the demo)

- Platform: Duda (https://www.ballingerelectric.com/; page requests to rtc.multiscreensite.com and Duda form and layout classes).
- Pages: /, /electrician, /electrical-panel-replacement, /electrical-upgrades, /about, /contact. /lighting redirects to /.
- Titles: see audit.md (Electrical Upgrades title says "Lighting").
- Copyright line: none on the site.

## Conflicts summary

1. ZIP: site 67215 vs Google 67209.
2. Legal name: "Ballinger Electric" (site) vs "Ballinger Electric LLC" (directory listings, uncertain).
3. Hours: emergency "any time" (Electrician page) vs closed weekends (contact page).
4. Review count: 158 (Maps scout) vs about 100 (directory summary, uncertain).
5. Owner: "Ben" (site testimonials) vs benjaminballinger87@gmail.com (email; inference only).

## Open questions for the onboarding call

- Legal name and entity type: is the business "Ballinger Electric LLC"? Who are the members or owner? Confirm the Kansas SOS record (not checked here: https://sos.ks.gov/eforms/BusinessEntity/Search.aspx).
- Owner name: is the owner "Ben" (Benjamin Ballinger?) and what is his full name?
- Electrical contractor license: what is the license number and holder name? MABCD public lookup (https://mabcdportal.sedgwickcounty.org/Views/CDR/CDRLookUpMain.aspx) did not show a contractor license for Ballinger; the three Trade Certificate records found under "Ballinger" could not be linked to the business. Ask for the number and check it on the portal by number. Also ask whether the business needs a separate state or city license for work outside Wichita.
- Insurance: general liability and workers' comp carriers, and whether certificates are available.
- Founding year and years in business: when did the business start? (Facebook page: 2024. Directory summary: "since August 2024", probably a listing date.)
- ZIP and address: which is correct, 67209 with Suite B (Google) or 67215 (site)? Is 1711 S Eisenhower Ave Suite B a shop, office, or mailing address? Should the site show a street address?
- Hours: confirm regular hours, and whether emergency calls are answered 24/7. The site says both.
- Lighting: is lighting a current service? Should a lighting page exist (the /lighting link currently goes home)?
- Services: confirm the service list. Is commercial work regular, and what share?
- Service area: which towns and counties? "Wichita, KS and Surrounding Areas" is undefined.
- Reviews: are the four site testimonials (Spencer L., Terri H., Jason R., Bonnie T.) real and from Google? Permission to use reviews and owner replies.
- Warranties, financing and pricing: does the business offer any warranty on work or financing? Any free estimate policy details?
- Phone and email: is (316) 213-4513 the main line? Will the owner switch the site to a business-domain email? Is benjaminballinger87@gmail.com the address the owner reads?
- Contact form: has the owner received form submissions? Confirm the form sends (not tested; not submitted per the brief). Does the owner know the homepage form has no spam protection?
- Facebook: who runs the page, and when was it created? Confirm the Facebook link is theirs.
- Google profile: confirm hours, categories, and the address pin (Maps scout data only).
- BBB: any accreditation or complaints on file?
