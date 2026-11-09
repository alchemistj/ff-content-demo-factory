# Plan: Alpha HVAC & Plumbing (Wichita, KS)

Sources: `facts.md`, `audit.md`, `reviews.json` in this folder. Only those facts.

## Company type and homepage H1
- Company type: **HVAC Company**. HVAC is two of three service lines and about 88% of the reviews that name a service. Plumbing is a real second line, so it goes in the services list and the homepage copy, not the H1.
- Business name on pages: **Alpha HVAC & Plumbing** (the site's logo and titles). Google says "Alpha HVAC and Plumbing LLC". Flag the name mismatch for the call; don't fix it in copy.
- Homepage H1: **HVAC Company in Wichita, KS — Alpha HVAC & Plumbing**
- Homepage keyword: `hvac company wichita ks`

## Pages
| Page | Route | H1 | Keyword |
| --- | --- | --- | --- |
| Home | `/home/` | HVAC Company in Wichita, KS — Alpha HVAC & Plumbing | hvac company wichita ks |
| Service 1 | `/ac-repair-wichita-ks/` | AC Repair in Wichita, KS — Alpha HVAC & Plumbing | ac repair wichita ks |
| Service 2 | `/furnace-repair-wichita-ks/` | Furnace Repair in Wichita, KS — Alpha HVAC & Plumbing | furnace repair wichita ks |
| Contact | `/contact/` | Contact Alpha HVAC & Plumbing | (contact) |

Cannibalization test: the homepage owns "HVAC company"; the service H1s don't use it. AC repair and furnace repair are distinct. Both are year-round money calls, and both fit the 24-hour emergency line. Pass. (Water heater replacement is their best plumbing page for a full build; mention it on the strategy page as a page a full build adds, using only FULL_BUILD_LINES.md wording.)

Where the reviews fit:
- AC repair page: Peter T. (Brett, Saturday, AC running within an hour), Divine L. (Michael, same day, blower motor), Michael B. (mini split leak found), Candice R. (Brett answered questions), plus more AC repair reviews from `reviews.json`.
- Furnace page: Kasie M. (new furnace, neat install), Melissa S. (Geoff explained the process), and heating reviews from `reviews.json`. Brian R. (repair vs replace) if five-star and it fits.
- Home: Greg W. (Brett, new A/C, years of use), Janet A. (whole team), Mary B. (used them many times), Nick B. (Tom, quote through install, permits), Braxton H. or Kevin C. (maintenance plan), Thomas T. or Jarett B. (water heater, plumbing proof), Cassie R. (sink).
- Quotes: five-star only, word for word, First L., each used once.

## Full confirmed services list (`services[]`)
1. AC Repair → `/ac-repair-wichita-ks/` (all makes and models)
2. Furnace Repair → `/furnace-repair-wichita-ks/` (all makes and models)
3. AC Installation (new cooling equipment, free replacement estimates)
4. Furnace Installation (new heating equipment, free replacement estimates)
5. Heating and Cooling Maintenance (scheduled service; annual service plan per reviews)
6. Plumbing Repairs (residential and commercial)
7. Water Heater Replacement (free estimate) and Water Heater Service
8. Plumbing for Remodels

Confirmed extras the copy may use: 24-hour emergency service; Mon–Fri 7:30 AM–5:00 PM; free replacement estimates; financing through Wisetack; extended warranties on high-efficiency A/C and heating equipment; "100% Customer Satisfaction Guaranteed"; residential and commercial; locally owned and operated.

Do not claim: dealer status for any brand (logos only, nothing confirmed), veteran-owned (chamber snippet only), licensed/insured, founding year, owner name.

## Offices and numbers
- Office: 3101 W Harry St, Wichita, KS 67213 (Google). BBB snippet shows 1405 S Bebe St; unverified. Use Harry St.
- Number: (316) 260-5775, `tel:+13162605775`. It matches Google.
- Do NOT use 316-765-4492 (leftover page) or the gmail address.
- Email: tomt@alpha-heatair.com (the site's contact address).
- Hours: "Monday to Friday, 7:30 AM to 5:00 PM, with 24-hour emergency service".
- Service area: "Wichita and surrounding areas". Towns: Wichita only unless the writer finds towns named in five-star reviews (then cite them in the plan notes).

## People
- Tom (Tom Tallon) is the most-named contact (quotes and installs). Not confirmed as owner. Do not call him the owner. The copy may say "you'll talk with Tom" only if the writer is sure it's true for every customer; safer to leave names inside quotes.

## What the strategy page argues
1. **On a phone, your number isn't tappable at the top of the page.** For a business with 24-hour emergency service, a visitor has to open the menu to call, and the footer number is plain text (audit finding 1).
2. **The top of your homepage says your name but not what you do or where.** The H1 is "Alpha HVAC & Plumbing"; it never says HVAC company in Wichita (audit finding 7 and qualify).
3. **AC repair and furnace repair share one thin page each with three bullets.** No page speaks to the person whose AC quit today.
4. **Your reviews are better than your site says.** The site widget shows 48 reviews; Google has 131. In customers' words: same day, explained everything, neat installs.
5. Report card items (cosmetic): leftover "Site Under Maintenance" page with another phone number and a gmail address; empty "Test for Reviews" page; brand logos that say "click" but do nothing; two Facebook links; three versions of the business name.

## Onboarding questions (carry into `onboardingQuestions`)
Owner and Tom's role; legal name; dealer status for Goodman, Amana, Bryant, Daikin, Ruud, LG; founding year and veteran-owned; the 316-765-4492 line and the gmail address; licensed and insured; maintenance plan price and contents; Wisetack terms; towns served; remove the leftover pages.
