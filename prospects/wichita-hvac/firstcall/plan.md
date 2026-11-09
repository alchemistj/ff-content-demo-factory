# Plan: 1st Call Heating & Cooling (Wichita, KS)

Sources: `facts.md`, `audit.md`, `reviews.json` in this folder. Only those facts.

## Company type and homepage H1
- Company type: **HVAC Company** (heating and cooling only; no plumbing or other trades seen).
- Homepage H1: **HVAC Company in Wichita, KS — 1st Call Heating & Cooling**
- Homepage keyword: `hvac company wichita ks`

## Pages
| Page | Route | H1 | Keyword |
| --- | --- | --- | --- |
| Home | `/home/` | HVAC Company in Wichita, KS — 1st Call Heating & Cooling | hvac company wichita ks |
| Service 1 | `/ac-repair-wichita-ks/` | AC Repair in Wichita, KS — 1st Call Heating & Cooling | ac repair wichita ks |
| Service 2 | `/furnace-repair-wichita-ks/` | Furnace Repair in Wichita, KS — 1st Call Heating & Cooling | furnace repair wichita ks |
| Contact | `/contact/` | Contact 1st Call Heating & Cooling | (contact) |

Cannibalization test: the homepage says "HVAC company"; neither service H1 uses "HVAC company". AC repair and furnace repair are different equipment and different searches. Both are year-round money calls in Wichita (AC from spring through fall, furnaces through winter, and both systems get checked in the off season). Pass.

Where the reviews fit:
- AC repair page: Clarence D. (fan, under an hour), Colleen E. (Mike, AC running), Rebecca S. (same day), Ron D. (capacitor and relay, Friday afternoon), Peter R. (Austin and Mike), Julia K. (repair vs replace honesty), Paul F. (leveled outside unit).
- Furnace page: Rebecca G. (furnace went out), Megan B. (have heat again), Jake A. (heater), Mandi A. (30-year-old furnace, fair estimate), Courtney B. (full system in one day).
- Home: Joe L. (integrity, only charge for work done), Trent A. (bid, install in one day), Alyson N. (did not push a new unit / best price), Rachel M. (Austin, advice), David P. (geothermal), Holly S. (biannual checks).
- Quotes: five-star only, word for word, First L., each used once.

## Full confirmed services list (`services[]`)
1. AC Repair → `/ac-repair-wichita-ks/`
2. Furnace Repair → `/furnace-repair-wichita-ks/`
3. AC and Furnace Replacement (full systems, often done in one day; reviews: Courtney B., Trent A., Alyson N.)
4. Seasonal Checkups (tune-ups before AC season; "biannual checks", Holly S.)
5. Ductwork (main supply duct replaced, Trent A.)
6. Geothermal Service (David P.: "Very well versed with geothermal". Single review; confirm on the call)
7. Home Warranty Repairs (Mark S., Britiany P.)

Do not list: commercial service, duct cleaning, financing, free estimates, warranties, emergency or after-hours service, brands, licensed/insured. None are confirmed.

## Offices and numbers
- One office: 937 W 50th St N, Wichita, KS 67204.
- One number: (316) 371-3815, `tel:+13163713815`. It matches Google.
- Email: none found → `null`.
- Hours: Monday to Friday, 8:00 AM to 5:00 PM (Dispatchcore; confirm on call). Use it.
- Address: show it (on Google).
- Service area: "Wichita and nearby towns". No towns are named anywhere, so the towns list holds only Wichita.

## Owner and people
- Owner: unknown. Do not name an owner.
- Technicians named in reviews: Mike, Austin, Derek. Use them only inside quotes, never as business claims ("our tech Mike").

## Trust bar candidates (confirmed only)
- Few business-stated claims exist (no site). Each trust bar item must be a plain fact from facts.md, e.g. "Heating & Cooling Repair", "Full Systems Installed", "Office on W 50th St N". Same-day visits show up in reviews but are not a stated promise, so put them in quotes, not in the trust bar. No ratings or review counts.

## What the strategy page argues
- Headline: **Google sends your customers to a page that says your website address is for sale.** Every person who taps "Website" on your Google listing lands on Porkbun's "This domain is for sale" page (audit finding 1, screenshots).
- Your reviews already make the case your website doesn't: same-day visits ("came out in less than an hour", Clarence D.), honest pricing ("only charge for the actual work performed", Joe L.), full systems in a day (Courtney B.). Today none of that is on a site.
- No tap-to-call, no services, no hours, nothing that tells Google you are an HVAC company in Wichita.
- Use the "A website …" subheading variant from STRATEGY_PAGE_GUIDE.md: today the address shows a for-sale page, so there is no working site.
- Report card is almost all "Missing". Be plain and kind; don't gloat.
- Keep it to what's verified: RDAP shows the domain registered until 2027-09-30, while the page says expired and at auction. Say "your website address shows a for-sale page"; don't claim they lost the domain.

## Onboarding questions (carry into `onboardingQuestions`)
Owner name; founding year; licensed and insured; brands and dealer status; warranties, financing and free estimates; maintenance plan; service area towns; hours and after-hours; geothermal confirmed; what happened to the domain and whether they want it back.
