# Inventory: Roettger's Heating and Cooling (Lincoln, NE)

Built 2026-11-16 from `site/` (all 7 pages, FAQs included), `reviews.json` (75 entries: 65 with text and 10 rating-only, all five-star) and `facts.md`. Coverage verdict: `site/COVERAGE.md` (COMPLETE).

**Two corrections to earlier files:**
1. `facts.md` says "No brand names on the site." That is wrong. The FAQ names Comfortmaker (see Credentials). `usp.md` repeats the error ("the site names no brand").
2. `facts.md` says the Google rating is unverified. `reviews.json` records rating 5 for the place (the profile itself was not opened).

## Services (named on the site, with page)

1. Heating System Repair, `/services-content`
2. Furnace Installation & Replacement, `/services-content`
3. Heating Maintenance & Tune-Ups, `/services-content`
4. AC Repair, `/services-content`
5. Air Conditioner Installation & Replacement, `/services-content`
6. AC Maintenance & Tune-Ups, `/services-content` (in the cooling copy)
7. Maintenance Memberships, `/services-content` (2 tune-ups a year, priority scheduling, discounts on repairs; no price)

Count: **7**.

## Differentiators (their words, page)

- "Lincoln's Locally-Owned HVAC Provider", `/`
- "Speak directly with Matt for fast answers and service scheduling", `/contact`
- "We offer honest recommendations and free estimates", `/faqs`
- "We treat your home or business as if it were our own", `/faqs`
- "treating every home or business as if it were my own", `/about-us`
- "Backed by more than 10 years of hands-on, high-quality experience", `/about-us` (conflicts with 2022, see below)

Count: **6**.

## Unusual offers

1. Wisetack financing: "as low as 3 to 60 months", "No compounding interest, prepayment penalties, or late fees", "won't affect your credit score to check your options". Example: "$2,500 project could be as low as $46/month over 60 months (*subject to approval)", `/financing`
2. Maintenance membership with stated benefits, no price, `/services-content`
3. Locally supplied Comfortmaker equipment, "we can get equipment quickly", `/faqs`

Count: **3**.

## Review themes

Every review is five-star. Quotes below are word for word from `reviews.json`.

1. **Speed (AC and same day).** Ben U.: "Matt came out within an hour of me calling, diagnosed the problem, and fixed it within 20 minutes!" Laurie F.: "He got me up and running in about an hour." Janel C.: "They had our AC fixed up in less than 3 hours of us call."
2. **The heads-up before arrival.** Glenn F.: "I appreciated the heads up about arrival." Mike K.: "Great heads up text when the technician was arriving." Shelly G.: "sent a text to let us know when he was on his way to our house." Six reviews in all (Mary S. and Dawn S. also; Kathi V. "arrived promptly and with great notification").
3. **Honest, no pressure.** Paul C.: "no pushy sales tactics." Matthew C.: "Fast, honest, and great price." Susan S.: "Honest, knowledgeable, and they always answer the phone."
4. **Explains the work.** Luke C.: "He explains the work that he has done and makes sure you understand what is being done every time." Marcus B.: "showing me why issues were happening and what the best courses of action were." Gail A.: "discussed to our satisfaction all questions we had."
5. **Named staff; the owner answers.** Dave M.: "The phone was answered right away, and Matt was available." Amelia P.: "Matt the owner ... has great communication." Chelle S.: "Kaden & Matt have been extremely helpful." Staff are spelled Kaden, Caden and Kaleb across reviews.
6. **Clean work site.** River K.: "They were very tidy while here working." Donna W.: "cleaned up after they were done." Martha R.: "cleaned inside and out."
7. **Fair price.** Elizabeth B.: "very reasonable pricing." River K.: "Very fair pricing." Shelly G.: "charged an extremely reasonable price for the repairs."

## Credentials (as the site states them)

- **Comfortmaker® brand.** Site (`/faqs`): "We proudly install Comfortmaker® HVAC equipment." The `about-us` page also has an image named "Comfortmaker-Dealer.png" (file name only; the page text does not say dealer). **Not confirmed.** Checked comfortmaker.com: homepage, and the dealer finder at `https://www.comfortmaker.com/en/us/find-a-dealer/` (searched Lincoln zip 68508). No Roettger's listing found. A web search also found no listing.
- **Wisetack partnership.** Site (`/financing`): "we've partnered with Wisetack." **Not confirmed.** Wisetack's site not checked.
- **Licensing, insurance, warranty.** None stated on the site. Nothing to confirm.
- **"Locally-Owned."** A claim on the site, not a credential.

## Facts and conflicts

| Item | Value | Source | Status |
|---|---|---|---|
| Phone | (402) 314-3612 | `/contact`; footer on every page; `reviews.json` place phone | Consistent |
| Email | roettgersheatingandcooling@gmail.com | `/contact` | Site only |
| Address | none on site | every page | Unverified. A BBB search result lists "Roettger's Heating And Cooling, LLC" in **Roca, NE** (not opened). That conflicts with "Lincoln" |
| Hours | none on site | every page; `/faqs` says emergency service with no hours | Unverified |
| Founded | "established in 2022" | `/about-us` | **CONFLICT** |
| Experience | "more than 10 years of hands-on, high-quality experience" | `/about-us` | **CONFLICT** with 2022 (see above) |
| Legal name | site uses "Roettger's Heating & Cooling" and "Heating and Cooling"; BBB says "... Heating And Cooling, LLC" | site; BBB search result | Unverified |
| Brand | Comfortmaker (`/faqs`) vs Rheem (review Lee P.: "a full replacement of our HVAC with a Rheem system") | site, reviews | **CONFLICT** (could be both: Comfortmaker is the stated line, Rheem a past install; ask Matt) |
| Google rating | 5 (`reviews.json`, place) | `reviews.json` | Consistent with reviews; profile not opened |
| Staff name | Kaden (also Caden, Kaleb in reviews) | reviews | Spelling conflict |
| Owner | "Matt" (site); surname Roettger inferred from business name | `/contact`, `/about-us` | Surname unverified |
| Service area | "Lincoln, NE and surrounding areas" | footer | Reviews name Roca and Hickman (Shelly G.) |

## Lead candidates

Scoring: Appeal × Exclusivity (1 to 5 each), per `docs/writer-guides/AVATAR-AND-USP.md` section 2. Appeal uses the avatar's fears (`avatars/hvac.md`): fear 1 someone at home hurt by heat or cold, fear 2 being sold a system they don't need, fear 3 nobody will come. Exclusivity is checked against the five Lincoln competitors in `competitors/lincoln-hvac.md`.

1. **"Matt picks up, and a text says the technician is on the way."** A4 × E4 = **16** (the top lead, just over the gate). A4: fear 3, "nobody will come." E4: none of the five competitors states an arrival notice on its homepage. National Furnace says "dedicated to arriving on schedule," which is close but not the same. Caveat: the site is silent. Six reviews carry it, so Matt must confirm the text is standard.
2. **"Your AC quit on a hot day, and it's back within hours."** A5 × E3 = **15**. A5: fears 1 and 3. E3: four of five competitors claim 24/7 or emergency service, but none gives a timing. Evidence: Ben U., Laurie F., Janel C., Lori W.
3. **"We tell you honestly whether it's a repair or a new system."** A5 × E3 = **15**. A5: fear 2. E3: National Furnace says "no pressure" on replacement estimates; none says it about repair. Evidence: Paul C., Marcus B., facts.md on honest recommendations.
4. **"You talk to Matt, the owner."** A4 × E3 = **12**. A4: want, a real person answers. E3: none of the five names an owner on its site, but two call themselves family-owned.
5. **"Replacement the next business day."** A4 × E3 = **12**. Three reviews only (Donna W., Susan S., River K.).

Top lead: **#1, heads-up text, score 16.** Note: it rests on six reviews, not on the site.

## Two money services

Both are AC. Furnace is the alternative if the factory wants a heating page.

1. **AC Repair.** Site: one sentence ("we'll troubleshoot and fix your cooling issues quickly"). Reviews: about 20 that name AC repair. Real material is the strongest of any service here.
2. **Air Conditioner Installation & Replacement.** Site: one sentence, plus the FAQ on replacing a system over 10 years old and "honest recommendations and free estimates." Reviews: about 10 (Donna W., River K., Manuel R., Loriana S., Mike K.).

**Could either reach a 700-word page honestly?** No, not from the material. AC Repair comes closest, with roughly 20 word-for-word review quotes, but 700 words would need the owner to describe the process, emergency answer and hours. Without that, the page would be padded. AC Replacement is thinner, with about 10 reviews and a site that says almost nothing.

Open questions for the owner: arrival text standard? Hours and after-hours? Address? Comfortmaker dealer status, and Rheem? Founding year vs "10 years"? Legal name (LLC) and Roca vs Lincoln?
