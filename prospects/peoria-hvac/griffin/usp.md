# USP: Griffin HVAC, Peoria IL

Method: `docs/writer-guides/AVATAR-AND-USP.md` section 2. Appeal is scored against `avatars/hvac.md` (a Wichita avatar, reused for the trade). Exclusivity is scored against the 5 competitors in `competitors/peoria-hvac.md`: AAA Northgate One Hour, Meister, AbsoLutes, A&A, Josh Phillips HVAC. Four of the five have no own site we could load, so "not found" means not in directory or dealer text, and exclusivity is scored conservatively.

## Core customer insight (three lines)
- **What the buyer doesn't know:** what a night, weekend or holiday call will cost, until the bill arrives.
- **What most companies do:** advertise emergency service (3 of 5 competitors do) and keep the after-hours price to themselves.
- **What Griffin does instead:** prints the plan price and the service-call rate on its own site: $160 a year for one system, and members pay $75 for any service call, never after-hours, weekend or holiday rates.

## Business in one line
Griffin HVAC is a Peoria company that the site says has served the area since 1963, with a printed maintenance plan ($160, two visits, $75 service calls) and customers who describe quick, on-time visits on hot days, cold nights and holidays.

## USP table (sorted by score)

| Claim | Appeal | Exclusivity | Score | Evidence |
| --- | --- | --- | --- | --- |
| Plan members pay $75 for any service call, with no after-hours, weekend or holiday rates, and the price is printed | 4 | 4 | **16** | Appeal: fear #5 (paying and still being hot) and objection 3 (cost to have someone look). Exclusivity: only One Hour names a "Club Membership" (terms not in its visible text); none of the 5 shows a plan price or a capped service call. Source: site /maintenance-plan-agreement ("$160.00 for homes with 1 system", "only $75.00 for any service calls", "Priority scheduling", "10% off any parts"); Michelle C. ("signed up for their yearly maintenance plan. Pricing was fair"). |
| Braid: a priced plan whose two visits are listed by part | 4 | 4 | 16 | Scored as its strongest part (the service-call row). The spring and fall checklists (condenser coil, refrigerant pressures, drains; burners, flame sensor, safeties, gas pressures, flue, humidifier) are a named, checkable method that none of the 5 competitors lists. |
| Emergency calls answered on holidays and hot weekends | 5 | 3 | 15 | Appeal: fears #1 and #3. Exclusivity: One Hour, Meister and AbsoLutes claim 24/7 or emergency; few prove it. Source: site ("24/7 Emergency Services Available"); Bob R. (furnace out 4:30 pm on New Year's Eve, tech there at 5:10 pm); Kristopher H. (AC out at the start of Labor Day weekend, visited that Saturday); Bob R. also called on July 3rd. Written as what customers saw. |
| No upsell, with the root cause explained | 5 | 3 | 15 | Appeal: fear #2. Exclusivity: not found at any of the 5 (4 have no site). Source: Joseph M. ("locate the root cause ... did not try and upsell us on anything"), Reed S. ("Did not feel like they were trying to up sell us at all"), Jigar P. (charged only for the filter), Ross S. ("went out of his way to make it as cost efficient as possible"). |
| A named technician customers ask for again | 4 | 3 | 12 | Appeal: want "having a guy again." Exclusivity: none of the 5 names staff, but easy to match. Source: Josh is named in 18 of 61 text reviews (reviews.json). His role is not stated in any source, only "technician" (Joseph M.). |
| Fall and spring checks listed part by part | 3 | 4 | 12 | Appeal: practical want ("problem is found and explained"). Exclusivity: no competitor lists check items. Source: site /maintenance-plan-agreement. |
| A picture of the tech sent before arrival | 3 | 4 | 12 | Appeal: trust in a stranger at the door (buyer C). Exclusivity: not found at any of the 5. Source: Marolyn W. ("the picture of the person coming to service our furnace prior to his arrival"). **One review only; not stated as practice in the copy.** |
| GoodLeap financing with a soft credit check until funding | 3 | 3 | 9 | Appeal: new-system cost worry (avatar notes financing is thin). Exclusivity: Meister lists Wells Fargo financing. Source: site /financing and homepage. Rates and terms are not stated. |
| Authorized Amana dealer | 3 | 2 | 6 | Appeal: nice to have. Exclusivity: Meister is a Trane dealer, and dealer claims are common. Source: site homepage. **Dealer status not checked against Amana's locator (facts.md).** |
| Serving the Peoria area since 1963 | 2 | 2 | 4 | Appeal: rarely considered. Exclusivity: One Hour (since 1948) and A&A (70+ years) also state years. Source: site About page. The current owner took over in 2019. |

## Gate result
Top claim: "plan members pay $75 for any service call, with no after-hours, weekend or holiday rates," **16**. **Passes gate (16+),** just. The braid ties it at 16. The next claims score 15 and are used as supporting customer proof, not as the headline.

## Three USP statements
- **A, pain point:** For Peoria homeowners dreading an after-hours or holiday repair bill, Griffin's maintenance plan caps every service call at $75, with no after-hours, weekend or holiday rates, for $160 a year.
- **B, method:** Unlike companies that advertise emergency service and leave the rate for the doorstep, Griffin prints the plan price and the service-call rate, and lists what the spring and fall visits check.
- **C, emotional outcome:** The furnace quits on a holiday evening, you call, and you already know what the call costs.

**Pick: A (claim), but see "Rebuild 11/15" for page order.** It names the fear and a printed, checkable number. B is a good outreach line.

## Brand short form
**Printed Price. Any Hour.**

## Promise ladder
| Level | Line |
| --- | --- |
| General | Heating and cooling in Peoria, IL. |
| Specific | Plan members pay $75 for any service call, at any hour. |
| Cinematic | The furnace quits at 4:30 on a holiday evening, and you already know what the visit costs. |
| Emotional | You're not stuck in a cold house wondering what this will cost. |
| Core transformation | From "what will this cost me tonight?" to "it's $75, I'm on the plan." |

## What's thin
- **Owner.** "Doug" appears only in reviews (Jigar P.: "Doug (owner)"; Patti F.: "Doug, the owner") and in the email address. The site's About page is signed "I" with no name (facts.md). The copy names no owner and says "Griffin," "we" and "the current owner."
- **Hours conflict.** Homepage, financing and plan pages say Monday to Friday 8:00 to 6:00; the contact page says 8:00 to 5:00 (facts.md). The copy says only "opening at 8:00 AM" and lists the conflict in `confirm`. `business.hours` is null.
- **24/7.** Used as the site states it ("24/7 Emergency Services Available") and backed by two holiday and weekend visits in reviews. Whether the emergency line is the same number is not in facts.md.
- **Non-member rates are not stated anywhere,** so the copy says what members pay and never what non-members pay.
- **Plan terms** (one year, $160 / $260 / +$100, two visits, $75 calls, 10% off parts, priority scheduling) come from one page and have not been confirmed with the owner. Clean-and-check visits are weekday-only; one 1-star review (Chester M., 2026-04-25) is about an online booking that allowed a weekend slot and was then canceled. The FAQ says the weekday-only rule plainly.
- **Amana dealer status is not used in the demo (QA 2026-11-15) until the owner confirms it. "Since 1963" and the 2019 ownership change** are the site's own statements; none is verified elsewhere. No license, warranty, BBB or Ameren claim is used (facts.md: Unverified or not found).
- **Tech photo before arrival** rests on one review (Marolyn W.). It appears only as her quote.
- **Competitors are "not found," not "absent."**

## Rebuild 11/15 (Josh's review)
- The plan is the strongest claim (16) but is not the homepage lead. The homepage leads with who Griffin is and 24/7 emergency service, with customer quotes as proof. The plan comes after the services, explained first (one-year agreement, spring and fall visit lists, priority scheduling, 10% off parts, $75 service call with no after-hours, weekend or holiday rates) and priced last ($160 / $260 / +$100). No plan price appears in the hero, trust bar or footer.
- Service pages: furnace repair and AC repair. Griffin's own site has no pages for either, so each rests on the 24/7 line, the plan's fall and spring visit lists, GoodLeap financing and on-topic review quotes. Thin: about 170 and 190 words of copy after the round-2 cuts (proof-led pages, no padding).
- Dropped: "ask what failed and what the fix would cost" advice, the banned furnace-hero image, and the furnace page's explainer sections.
