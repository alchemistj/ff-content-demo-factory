# Plan: Epic Heating & Cooling (Wichita, KS)

Sources: `facts.md`, `audit.md`, `reviews.json` in this folder. Only those facts.

## Company type and homepage H1
- Company type: **HVAC Company** (HVAC only; residential and commercial per the site).
- Homepage H1: **HVAC Company in Wichita, KS — Epic Heating & Cooling**
- Homepage keyword: `hvac company wichita ks`

## Pages
| Page | Route | H1 | Keyword |
| --- | --- | --- | --- |
| Home | `/home/` | HVAC Company in Wichita, KS — Epic Heating & Cooling | hvac company wichita ks |
| Service 1 | `/ac-repair-wichita-ks/` | AC Repair in Wichita, KS — Epic Heating & Cooling | ac repair wichita ks |
| Service 2 | `/furnace-repair-wichita-ks/` | Furnace Repair in Wichita, KS — Epic Heating & Cooling | furnace repair wichita ks |
| Contact | `/contact/` | Contact Epic Heating & Cooling | (contact) |

Cannibalization test: homepage owns "HVAC company"; service H1s don't use it; AC repair and furnace repair are distinct, year-round money calls. Pass. Geothermal and water-source heat pumps are a real specialty; put them in the services list and the homepage, and name a geothermal page as something a full build adds (FULL_BUILD_LINES.md wording only).

Where the reviews fit (five-star only, word for word, First L., each once):
- AC repair: Ruth O. (Memorial Day weekend AC), Jeff W. (Karlee called, Will out 30 minutes later), Tyler N. (didn't up-sell, fixed the problem), Molly B. (cleaned it, made sure all was well), Luqueeda P. (explained things).
- Furnace repair: Pearl A. (furnace replaced within two days), heating repair reviews in `reviews.json`, Chad S. (not pushy, realistic), Cathie M. (Preston and Will, Haysville).
- Home: Jane V. (great service from Justin and all employees), Jacob B. (Justin running Epic) only if it reads well, Theresa F. (Preston and Aaron), Zach T. (clean-up), Mitchel D. (best deal in Wichita, on time), Chris A. (four rooftop units, River City Brewing Co.) as commercial proof, Jennifer D. or Kenneth B. (Justin explained the process).

## Full confirmed services list (`services[]`)
1. AC Repair → `/ac-repair-wichita-ks/` (all makes and models)
2. Furnace Repair → `/furnace-repair-wichita-ks/`
3. AC and Furnace Replacement (full system installation; high-efficiency systems)
4. Geothermal and Water-Source Heat Pumps (repair and replacement)
5. Mini Split Systems (repair and replacement; listed with water source on the services page)
6. Preventive Maintenance (seasonal maintenance; no plan details confirmed, so no plan terms)
7. Smart WiFi Thermostats (Nexia)
8. Bathroom Ventilation
9. Custom Sheet Metal and Ductwork (own fab shop)
10. New Construction HVAC (residential)
11. Commercial HVAC (rooftop units; one review)

Confirmed copy claims: since 2012 (site states it); Preston in HVAC since 1999 and Justin since 2000 (site); "Licensed Master Mechanical technicians" is a site claim without a number — **leave it out** (licensing is on the call list); 100% satisfaction guarantee (site); residential and commercial.

Do NOT use: "24/7" (conflicts with posted hours; on the call list), Bosch dealer (unverified per rule), financing (link broken; on the call list), maintenance plan terms or prices, free estimates, owner title for Justin or Preston, the Benton LLC address.

## Offices and numbers
- Office: 339 N West St, Wichita, KS 67203 (Google). Birdeye shows 224 N Pennsylvania Ave (unclaimed, unverified). Address: `null` on the page until confirmed; use "Wichita, KS" in copy.
- Number: (316) 633-8097, `tel:+13166338097`. It matches Google.
- Email: justin@epichvac.net.
- Hours: "Monday to Friday, 8:00 AM to 5:00 PM".
- Service area: "Wichita and surrounding areas"; towns: Wichita, Haysville (review).

## People
- Justin and Preston, by their site-stated experience ("Preston has been in the HVAC industry since 1999, and Justin since 2000"), may be named in body copy as the people with that experience. Don't call either the owner. Other staff names appear only inside quotes.

## What the strategy page argues (costliest first)
1. **The top of your homepage says "Comfort Solutions Simplified."** No "HVAC", no "Wichita". Google and a hurried homeowner can't tell what you do or where. Your demo's homepage says HVAC company in Wichita, KS, right at the top.
2. **Your financing button opens a page that doesn't load.** Both "Financing" and "Get Financed" open Synchrony in a new tab: "Access Denied" in our browser, and a "page not found" naming "Epic heatingcooling" in a second check. Say we couldn't open it, not that it's broken for everyone.
3. **AC repair and furnace repair have no page of their own.** All your services share one page, a heading and a paragraph each.
4. **Your maintenance-plans page talks about replacing an AC.** Visitors who click "maintenance plans" get a replacement pitch and no plan.
5. **Your reviews say what your site doesn't:** same-day help (Jeff W.), no up-selling (Tyler N.), clean work (Zach T.).
6. Report card (cosmetic and trust): "24/7" next to Monday-to-Friday hours; no street address on the site; typo on the services page ("We offer for residential new construction"); unfinished sentence on the maintenance page.

## Onboarding questions (carry into `onboardingQuestions`)
Owner (Justin or Preston) and full name; legal entity and the "since 2012" date; current address (West St or Pennsylvania Ave); financing link and merchant ID; Bosch and other dealer status with proof; licence numbers and insurance; written warranty terms; real 24/7 line and Saturday hours; maintenance plan contents and price; commercial share; towns served; free estimates.
