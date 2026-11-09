# Plan: Cook's Heating and Cooling (Wichita, KS)

Sources: `facts.md`, `audit.md`, `reviews.json` in this folder. Only those facts.

## Company type and homepage H1
- Company type: **HVAC Company** (heating and cooling only; residential and commercial per the About page).
- Business name on pages: **Cook's Heating and Cooling** (Google, site title).
- Homepage H1: **HVAC Company in Wichita, KS — Cook's Heating and Cooling**
- Homepage keyword: `hvac company wichita ks`

## Pages
| Page | Route | H1 | Keyword |
| --- | --- | --- | --- |
| Home | `/home/` | HVAC Company in Wichita, KS — Cook's Heating and Cooling | hvac company wichita ks |
| Service 1 | `/ac-repair-wichita-ks/` | AC Repair in Wichita, KS — Cook's Heating and Cooling | ac repair wichita ks |
| Service 2 | `/furnace-repair-wichita-ks/` | Furnace Repair in Wichita, KS — Cook's Heating and Cooling | furnace repair wichita ks |
| Contact | `/contact/` | Contact Cook's Heating and Cooling | (contact) |

Cannibalization test: homepage owns "HVAC company"; service H1s don't use it; AC repair and furnace repair are distinct year-round money calls, and the site already groups repair under each. Pass. (Their current service pages pair installation with repair; the demo splits repair out because that's the urgent call.)

Where the reviews fit (five-star only, word for word, First L., each once):
- AC repair: Tom V. (Shannon and Jose, outside AC unit), Vicki V. (technician that afternoon, Ricky), James B. (Brad fixed my ac), Lupe N. (clean, knew his job), Matthew L. (on time).
- Furnace repair: Carolyn R. (Don had the part, before the cold snap), Charlotte C. (honest, you can trust them), LaVona B. (saved me thousands), Diana N. (Charlie, knowledgeable) and other heating reviews in `reviews.json`.
- Home: John E. (many years, two homes), Sandra S. (35 years), Christy R. (new heater and AC, price), Joshua M. (installation guys), Sean S. (Glenn, Tyler, Rosa in the office), Ted H. (Ricky, prompt).

## Full confirmed services list (`services[]`)
1. AC Repair → `/ac-repair-wichita-ks/` (troubleshooting, Freon leak detection)
2. Furnace Repair → `/furnace-repair-wichita-ks/` (troubleshooting and diagnosis)
3. Air Conditioner Installation (equipment to fit your budget)
4. Furnace Installation (furnaces, unit heaters, electric air handlers)
5. Annual Maintenance Agreements (residential and commercial)
6. Air Quality: filters, whole-system filtration that the site says removes up to 90% of air contaminants, humidifiers (leave the filtration brand name out; the site spells it "ULTRVATION")
7. Carbon Monoxide Detection
8. Commercial HVAC and Mechanical Design
9. Custom Sheet Metal (in-house fabrication shop)

Confirmed copy claims: service all brands ("Our service department is equipped to service and maintain all brands"); EPA registered and certified (AC page); emergency service 5 PM to 10 PM on weekdays; Premium maintenance plan with two servicings a year, priority emergency service within 24 hours and 20% off parts and labor, on 1-, 5- or 10-year terms; second-generation family business (About page).

Do NOT use: dealer status or "top brands" lines for Trane, Goodman or Carrier (locators don't list Cook's; on the call list); licensed/insured; founding year or "since"; free estimates; financing; warranty terms; KCAA; owner name; "35 years" as a company claim (it's one customer's history, OK inside Sandra S.'s quote).

## Offices and numbers
- Office: 2215 S West St, Wichita, KS 67213 (site and Google match). Show it.
- Phone: (316) 945-2665, `tel:+13169452665`. It matches Google. Fax 316-945-7944 is not a phone line; leave it out of `phones`.
- Email: service@cookshvac.com exists only in a hidden HTML comment. Use `null` and put it on the call list.
- Hours: "Monday to Friday, 8:00 AM to 5:00 PM; emergency service 5:00 PM to 10:00 PM".
- Service area: "Wichita and surrounding towns"; towns: Wichita, Belle Plaine (review).

## People
- Owner unknown; never name one. Staff names (Shannon, Jose, Ricky, Charlie, Don, Glenn, Tyler, Rosa, Wayne Rau, Gerry) appear only inside quotes.

## What the strategy page argues (costliest first)
1. **The top of your homepage has no headline at all.** The only headline is your logo, with no text behind it, and the browser tab says "Home - Cook's Heating and Cooling". Nothing tells Google or a homeowner you're an HVAC company in Wichita. The demo says it right at the top.
2. **Your number can't be tapped at the bottom of any page.** The top bar works; the footer phone is plain text. Someone who reads to the end has to type it in.
3. **Your repair pages bury the urgent call.** AC and heating each have a page, but they pair installation with repair and carry no reviews. The demo gives AC repair and furnace repair their own pages with customers' words beside each claim.
4. **None of your customers' words are on your site.** Reviewers name your techs and say "honest", "fast response", "saved me thousands"; your site shows none of it.
5. Report card: copyright 2016; email address hidden in the page code, so visitors see no email; contact form with no spam protection; hidden "Site Desc" template text; brand claims ("top brands … Trane, Goodman and Carrier") that the Trane and Carrier dealer finders don't back up. Phrase the last one gently: "we couldn't confirm it on the manufacturers' dealer finders; let's confirm it so it can go on your site."

## Onboarding questions (carry into `onboardingQuestions`)
Owner and the second-generation family (vs the 2008 buy-out a 2009 review mentions); founding year; dealer agreements for Trane, Carrier, Goodman; licence and insurance; Saturday or after-10 PM service; maintenance plan prices; commercial share; email address to show; KCAA logo meaning; free estimates, financing, warranty terms; recent reviews about repeat visits and unreturned quotes.
