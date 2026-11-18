# QA batch 1 results (independent reviewer) and FF Architect decisions, 2026-11-15

QA batch 1 (message 1 of 3): ALL 8 = MUST FIX, no PASS yet. This message has the issues that apply to every demo, then the outreach issues. Messages 2 and 3 have the per-demo lists.

How I checked: crawled all 4 pages of each demo at 390 and 1440, quote-matched every review quote against reviews.json, and read every page against facts.md and the other source files. Good news: all quotes are verbatim; no sideways scroll; no broken images; one H1 per page; tel: links match the source phone on every page of every demo; no dead forms.

A. TEMPLATE-WIDE (fix once in the shared template, applies to all 8)
A1. Phone: the person's face sits behind the headline on the 7 HVAC homepages at 390. Same hero photo (woman at a condenser), head under "Kuhn Heating And / Air Conditioning" etc. This breaks "no text over faces". Move or crop the subject so the face is clear of text, or darken/shift the image on mobile. Sandhill (roof photo) is fine.
A2. Tap targets under 44px at 390: header business name link is 27px tall, and inline text links are 19-20px tall: the phone link inside the hero paragraph, footer phone, footer email, footer service links, "See how replacement works"-type text links. Give them 44px min height (padding or block links).
A3. Trust bar text is 10.24px at 390 on every business page. Too small. Raise it to 12-13px or more.
A4. Page titles repeat the brand: "HVAC Company in Lincoln, NE — Cool Concepts | Cool Concepts" (same on all pages, all demos). Drop the duplicate.
A5. CTA labels overpromise: "Request Service", "Request an Estimate", "Get a Free Estimate", "Ask About Your System" all go to a contact page that has only phone and email, no form. Fine functionally, but label them "Contact us" or "Call or email".
A6. Strategy page, every demo: the SRA Roofing result ("342 views to 5,530", "top 10 across two-thirds of Springfield") is not in any demo source file; I could not verify it. FF Architect needs to confirm it is an approved Fluid Frame case study. Not blocking for me.
A7. Judgment call for Josh, not blocking: 7 HVAC demos share the identical hero photo.

B. OUTREACH MESSAGES (all 8, same issues unless noted)
B1. No easy opt-out line in any message. Add one (e.g. "If this isn't useful, just tell me and I won't write again.").
B2. "Which brands or manufacturers are you certified with?" presumes certifications that no source states (and "certified" is a hard-no word). Griffin and Custom Assured also already show brands (Amana, Bryant) on their own sites, and the Custom Assured line "Bryant is on your site. Which other brands... certified" implies Bryant certification. Reword as "Which brands do you install most?" or cut.
B3. "My daughter and I build websites for service businesses": I can't verify this anywhere in the repo. Josh must confirm it is true and wanted, since it is a family claim sent to strangers.
B4. "By the way, our contact form system would have recognized this as a solicitation, and you wouldn't have even seen it." is confusing and reads as a gimmick, and on JD Kuhn (email) it was correctly left out. Recommend cutting from all form messages. Also "Lol" and "How'd we do on your company vibe?" are not in plain business voice; check against the voice guide (JOSH-VOICE.md is not available to me, so I could not check).
B5. The demo link in every message is the production subdomain, which is not live until merge. Nothing may be sent before it resolves. (I did not send or contact anyone.)
B6. THERMAL outreach claim "your site shows 309-324-5317 while your Google listing shows (309) 699-3333" is not true as of my check today. I fetched https://www.tsipeoria.com/ and /contact-us just now: every tel: link is 309-699-3333 and 324-5317 does not appear. The same false claim is on the Thermal strategy page (Contact card "Your site shows 309-324-5317 on every page" and the "What we'd confirm" bullet). Re-verify, then remove it from outreach and strategy. The demo's own phone (699-3333) is correct against both the live site and Google.
B7. Roettger's: "her A/C" and "she" assume the reviewer's gender from a first name; use "their".
B8. Verified true against audit.md/reviews.json (no change needed): JD Kuhn 768px, Custom Assured phone/tappable, ComfortTechs retreat links, Roettger's no address/hours, Cool Concepts 404 button, Sandhill five phone-number headings, Griffin 768px and header, all review facts quoted in the messages.

Per-demo lists follow in messages 2 and 3.

---

QA batch 1 (message 2 of 3): per-demo MUST FIX, demos 1-4. All are in addition to the template-wide list (A1-A5) and outreach list (B1-B8).

1. JD KUHN (fortwayne, jdkuhn-fortwayne) - MUST FIX
 1. home, "Started in the Trade in 2005..." section: "That's the person technicians call when a job doesn't add up, and it's where I learned what a tech should find before anyone writes up a replacement." No source. facts.md section 2/7 only has: started 2005 as a high school junior, 12 years with JF Miller as Service Manager, 17 years continuing education. Cut that sentence.
 2. replacement page, FAQ "When do I pay?": "Ask about payment options when you call." Hints at financing. facts.md section 8: financing none stated, Unverified. Cut it.
 3. replacement page: "Newer furnaces and air conditioners do the same job on less." and "Equipment that's decades old runs on technology from a different era" are generic cost/efficiency claims, no source. Cut or make plainly general.
 SHOULD FIX: home "Told You Need a Whole New System?" retells Tim D.'s story right above his quote. Tim D.'s review says "JD Kuehn" (reviewer typo); consider a different lead quote. "Kristen in the office takes appointment calls and texts" rests on reviews only (usp.md), fine but soften to what customers said. Service area "Fort Wayne, IN" is from the Google address only (facts.md section 4 Unverified). Desktop trust bar orphans "8 / to 4:30".
 Outreach-specific: facts match audit; "certified" question (B2).

2. CUSTOM ASSURED (customassured-fortwayne) - MUST FIX
 1. home hero, "The Same Technician Who Already Knows Your System" section, FAQ, maintenance page "Our aim is the same technician at your door each visit", footer "The same technician, as often as we can / We call you when service is due": the business never says this. It is a pattern from reviews (Samantha R., Gina W.). usp.md lines 50-51 say "'Same technician' is a pattern in reviews, not a stated policy. The site does not say it... Ask Rod." Either get Rod's confirmation or reword as what customers say.
 2. maintenance page, Dennis G. quote: "They are about the only service that hasn't raised pricing." A claim about other companies and a price claim. Trim the quote before that sentence.
 3. home + maintenance + contact trust bar: "Twice-a-Year Maintenance" stated as the company's offer. facts.md section 5 supports "annual service agreements" and the Custom Priority Club; "twice yearly" only appears in testimonials/reviews. Source it or reword.
 SHOULD FIX: Custom Priority Club is presented as current; facts.md open question says "whether the Custom Priority Club is still offered". Odd meta lines "We don't publish lender names or terms on a web page" and "We don't put numbers on a web page that might be out of date by the time you read it" leak the sourcing logic; say "Call and ask". FAQ "Do you do new construction?" and "Do you work on businesses as well as homes?" give the same answer twice. Generic cost line "A visit is the cheapest time to ask".
 Verified OK: name, phone (260) 496-8400, address 2630 Independence Drive, email julie@customassured.com, office hours Mon-Fri 9-4, 1998 and 35 years, Bryant, 100% Satisfaction Guarantee, financing with approved credit, owner Rod/Kim, team names.
 Outreach: also the B2 Bryant-certification implication; audit facts (no tappable phone) are accurate.

3. COMFORTTECHS (comforttechs-lincoln) - MUST FIX
 1. home + AC page: Kim H. quote ("Another company in town told us... a whole new system... resolved for a small fraction of the cost the other company had quoted us") and Matt A. ("after not hearing back from other shops in town"): reviews that make claims about other companies and a price comparison. Swap for Brendan M. or Bryce R. minus any competitor clause.
 2. AC page, Savannah K. quote ("didn't charge for service fees... VERY affordable price"): price and fee-waiver claim from one reviewer. Replace. (Sovida T. "Made the repairs for a fair fee" is a price claim too, should fix.)
 3. home "Most no-heat and no-cooling calls trace back to one failed part" and AC "Most no-cooling calls come down to a short list of parts": reads as the company's own call stats. No source. Cut or say "often".
 4. Repair-first as company policy: home hero "Before anyone says new system, we find out what actually failed", AC FAQ "Will you try to sell me a new system? Not before we've found what failed", "nobody leaning on you", footer "Repair first, replace when it's time". Not in facts.md; rests on 3 reviews (Kim H., Bryce R., Brendan M.). usp.md says ask the owner. Confirm with owner or reword as customer-reported.
 5. Cost/timing claims, no source: "A weak capacitor... one of the smallest repairs in the trade", "among the most common and least expensive repairs", "costs a fraction of a new system", "only buys a few weeks", "A big repair bill on an old unit is often money better put toward a replacement". Remove the cost wording.
 6. AC page: "If the air conditioner quits on a weekend or an evening, call anyway and ask when we can be there." Implies weekend/evening service. facts.md hours are Mon-Sat 7-5 and 24/7 is an unresolved conflict; usp.md says do not use 24/7. Reword without promising evenings/weekends.
 SHOULD FIX: Miss H. quote names a warranty company (AHS) and an assigned contractor (claim about other companies), trim. "Then we get a technician headed there" reads like a dispatch promise. "named" in FAQ "are the ones we've named" leaks sourcing. "Free estimate / no-obligation" repeated ~6 times. Heading "When It's Your Kid's Furnace That Quit" retells Miranda M. beside her quote.
 Verified OK: name, phone (402) 465-0000, address 540 Blue Heron Dr, email jory@comforttechs.com, trust bar (family owned, financing upon approval, geothermal) sourced.

4. ROETTGER'S (roettgers-lincoln) - MUST FIX
 1. AC page, Jane B. quote: "fixed by just replacing one element and service call for under $200." A dollar figure for a repair, no business source. Remove.
 2. home hero Susan S. ("a very fair bid"), AC page Mary S. ("affordable price"), home Martha R. ("It was also nice to not have a bill") imply price/free visits; the membership has no stated price (facts.md). Cut the "no bill" sentence at minimum.
 3. "You'll get a heads-up before the technician arrives" is stated as company practice ~8 times (home hero, bullets, closing; AC hero, FAQ). Source is only reviewers (six). usp.md "What's thin": "Ask Matt whether the heads-up text or call is standard on every visit." Confirm or mark as customer-reported.
 4. AC page: "If the AC quits on a weekend or a holiday, call anyway... Emergency HVAC service is something we offer" and FAQ "What if it quits on a weekend?": implies weekend/holiday availability. facts.md: hours not stated, emergency hours unknown. Use only the FAQ's "emergency HVAC service" line.
 5. home "For Realtors, Landlords and Anyone Calling for Someone Else" and AC FAQ tenant/parent answer: service policy from one realtor review (Charli H.). Reframe to what that customer saw or cut.
 6. "Most no-cooling and no-heat calls come down to one failed part" and "one of the most common repairs": no source.
 SHOULD FIX: Matt line "speak directly with Matt for fast answers" repeated 5 times; Charli H. quote and retell both present. Shelly G. quote starts mid-sentence. Heading "What Lincoln Homeowners Ask..." claims real questions.
 Verified OK: name, phone (402) 314-3612, email roettgersheatingandcooling@gmail.com, no invented address/hours.

---

QA batch 1 (message 3 of 3): per-demo MUST FIX, demos 5-8. Also in addition to the template-wide list (A1-A5) and outreach list (B1-B8).

5. COOL CONCEPTS (coolconcepts-lincoln) - MUST FIX
 1. home (3 places) and AC page: "the estimate is free, and so is the onsite inspection that comes first" / "Estimates are free, and so are onsite inspections" / "an onsite inspection comes first." The only source (audit.md line 115, their homepage) lists "free estimates, onsite inspections" side by side. Nothing says the inspection is free or that it always comes first. Say "free estimates and onsite inspections" as listed.
 2. home "Find What Failed First", AC FAQ "Will you try to sell me a new air conditioner? Not before we've found what failed", "so you know what went wrong before any work starts": company process claims with no source (only individual James reviews: Kristi A., Alisa M.). Confirm or reword as customer-reported.
 3. home "Most no-heat and no-cooling calls trace back to a single part": no source. Make it general or cut.
 4. home FAQ and AC FAQ "Do you work on heat pumps and geothermal? Yes... Both are on our list" and service card "Geothermal: Service for geothermal heating and cooling": facts.md only has geothermal in the site navigation (line 35). Soften to match the nav or drop "repair/service".
 5. AC page, Miss H. quote names a warranty company (AHS) and its contractor "dragging their heels": claim about other companies. Cut the sentence.
 6. home, Samantha C. quote: "helped with an easy fix over the phone instead of charging us an after-hours service charge." The strategy page says phone-first after-hours calls are a proposal, "not something Cool Concepts does today". The homepage shows it as existing proof. Trim the quote to the part about knowledge.
 SHOULD FIX: "costs far less than a new system", "one of the smaller repairs in the trade" (cost claims); Daikin line 3 times on home; "Free estimates" ~7 times; "It's guests arriving, a holiday weekend..." paraphrases Bill F.; two emails in facts.md (coolconceptsne@gmail.com vs coolconcepts@neb.rr.com), confirm the right one; "Not sure we reach your address?" duplicated.
 Verified OK: phone (402) 483-2665, address 3701 Touzalin Ave, "since 2005", "small business", "locally owned and operated", Daikin.

6. SANDHILL ROOFING (sandhill-lincoln) - MUST FIX
 1. roof-replacement: the materials block ("Asphalt shingles cost the least up front... Steel and standing seam steel cost more and are made to last longer... Cedar shake... takes more care... Impact-resistant shingles... hail is hard on every roof", "Each one fits a different house and budget", "Shingles, steel and slate-look roofs sit at very different prices"): price, lifespan and material claims with no source. facts.md only lists material names. Keep the names, cut the descriptions.
 2. roof-replacement: "On any roof replacement, the order is the same. The old roof comes off, the wood underneath gets checked... Then the yard gets cleaned up." Always-true process claim, no source, and a 1-star review (Toxic L.: nails and trash in the lawn) contradicts "yard gets cleaned up". Cut or make conditional.
 3. home + roof page insurance: "Insurance claims are part of the work we handle, and we walk you through what's needed", "help with the paperwork", "explain what we find on the roof", "Take dated photos of the damage". Only "We Handle Insurance Claims!" is sourced (facts.md line 28). The rest comes from reviews or nowhere. Use the sourced wording.
 4. home: "After a big storm, crews from out of town can show up, and they don't always stay. We're based in Lincoln, so if something looks wrong on a roof we put on, you know where to find us." A claim about other companies, plus a follow-up commitment near an implied warranty, with no source. Cut.
 5. roof page "A Roof Someone Else Got Wrong" section plus Dennis E. quote ("another contractor royally screw up an install..."): criticises another contractor and claims a rescue service from one review. Cut.
 6. home + roof page generic roofing-science claims stated as business fact, no source: "Wind can break a shingle's seal...", "Water can run along the framing before it shows inside", "That usually means the roof is wearing out across a whole slope... A patch buys a little time", "replacing a roof that's mostly sound costs you money for nothing", "Hail damage is easy to miss from the ground". Cut or mark as general.
 7. "impact-resistant shingles" in services/materials: the site's wording is "impact resistance" in a materials list. Use the site's words.
 SHOULD FIX: trust bar "Senior and Military Discounts" (site also says Government Employee; terms are an open question in facts.md, move to FAQ until confirmed). "Lifetime Workmanship Warranty" is correctly NOT used (good). "what it needs and what it doesn't" appears 8+ times. Alyssa T. quote keeps review typo "Im so thankful". Retells next to quotes (Joe B., Darion M., Nicole S., Alyssa T.). "Selling a House" block has no site source. Empty FAQ "How long does a roof replacement take?".
 Verified OK: name, phone (402) 890-6460, info@sandhillroofing.com, hours Mon-Fri 7-6 / Sat 7-12, no address shown (none sourced), family-owned/Lincoln/Eastern Nebraska, 101 reviews.

7. THERMAL SERVICES, TSI (thermal-peoria) - MUST FIX
 1. home + strategy, Brad S. quote: "When no other company we called would pick up the phone." Claim about other companies. Cut the parenthetical or use another quote.
 2. home hero Bob W. quote ("an after hour service call would cost much more than waiting until the next day") and the framing "Here is what one Peoria homeowner heard when they called TSI": price claim not in facts.md, turned into company practice (usp.md says it rests on one review). "Peoria" is not in Bob W.'s review: say "one customer".
 3. home, AC page, contact: "ask what the visit will cost before you decide", FAQ "expect a plain answer": presents cost-quoting on the phone as company behaviour; only reviews (Bob W., Ian B., Ben T.) back it. Rephrase as advice to the caller, delete "expect a plain answer".
 4. home FAQ "outside that window call (309) 699-3333" and contact "For after-hours emergency service, call and tell us...": asserts this number takes the after-hours line. facts.md open question 7 says unknown. Say "call", without tying the emergency line to this number.
 5. AC page: "Sizing a new system is free... so looking at replacement doesn't cost you anything." Source (facts.md section 4, /qas) is "free sizing for a generator or HVAC system, by quote and technician visit". Cut the second clause.
 6. AC page: "repair is the answer, and it costs a fraction of a new system", "The monthly filter rotation costs next to nothing", "Most of those calls come back to one part": unsourced cost comparisons and a call-mix stat.
 7. home "Locally Owned, in Peoria Since 2004": "since 2004" has no location in facts.md; site says "locally owned and operated". Use "Locally owned, since 2004".
 8. Phone fact (see B6): strategy page + outreach say the site shows 309-324-5317; it does not today.
 SHOULD FIX: Brad S. and Bob W. quoted and retold; Brad S. cut ("That was Friday by Monday, I had a quote on a new system") is garbled; Joe M. quote unclear; "office systems" and "towns between them" unsourced; contact page is phone only (no email/text), fine but label over-promises.
 Verified OK: name, phone (309) 699-3333 (matches live site and Google), address 2200 W Altorfer Dr, office hours, Ameren partner line (on their site), since 2004.

8. GRIFFIN HVAC (griffin-peoria) - MUST FIX
 1. strategy: "None of the five Peoria competitors we checked shows a plan price." Overstated: usp.md says 4 of 5 have no site that could be loaded, so "not found" is not "absent". Soften or drop.
 2. strategy: "four different pages carry the title 'Heating Services'". It is three (/, /video, /maintenance-plan-agreement; audit.md line 52). The Furnace card on the same page says three.
 3. home: "It's a smaller shop at 1007 W Detweiller Dr": "smaller shop" has no source. Cut it.
 4. home: "Don't see your town on the list? Call and ask, because the list is where Griffin works, not where it stops." Implies service beyond the stated area. Use "Don't see your town? Call and ask."
 5. All pages, trust bar "Serving Peoria Since 1963" plus home H2 "A Peoria Shop With Roots Back to 1963": the About page does say it, but the owner took over in 2019 and renamed the company, and the strategy page itself asks which date should lead. Use "Serving the Peoria area since 1963, current owner since 2019" or drop it from the trust bar until confirmed.
 6. home and furnace page: "Whole-House Humidifiers: humidifiers added to a system" and FAQ "Can Griffin add a humidifier? Yes": rests on one review (Reed S.). facts.md only has a humidifier check in the fall visit. Drop "whole-house" and the install claim, or confirm.
 7. "Authorized Amana Dealer" (trust bar, every page): on their own site, but facts.md marks it Unverified (Amana's dealer locator not checked). Keep only if confirmed with the owner.
 8. home: "$75 for any service call, at any hour" and hero "only $75 for any service call": the source is "members never pay after hours, weekend or holiday rates, only $75.00 for any service calls". Add "member"/"plan members", make clear it is the service-call fee not the repair price, drop "at any hour".
 9. furnace page: "it costs far less than a new furnace", "It's the cheapest fix there is"; home "Finding that in spring is cheaper than finding it in July": unsourced cost claims.
 SHOULD FIX: plan terms repeated 5+ times on home; two back-to-back "no upsell" quotes (Reed S., Jigar P.) plus Joseph M.; voice shifts between "Griffin offers" and "we"; Michelle C. quote has a stray ellipsis; "Not today." in the weekend FAQ is odd; gas-smell safety advice unsourced.
 Verified OK: name, phone (309) 676-0808, address 1007 W Detweiller Dr, email, plan prices $160/$260/+$100, 10% parts, GoodLeap soft-check, 24/7 emergency, weekday-only clean-and-checks.

When you send fixes, tell me the branch/preview URL and I will re-check against this list. I am not touching the demos or sending anything.

---

From FF Architect: decisions on the QA reviewer's batch-1 notes (fix everything else on its MUST FIX lists exactly as written).
1. **SRA case-study numbers on the strategy pages:** remove them from every demo. They aren't sourced or verified, and we don't publish a client's numbers without Bailey's and Josh's OK. Describe the method without SRA figures.
2. **Outreach template:**
   - add a clear one-line opt-out ("Not interested? Reply 'no thanks' and you won't hear from me again.");
   - remove the "certified with?" question;
   - remove the odd "contact form system" line;
   - remove "my daughter and I" unless Josh confirms it tomorrow. Write it without that line for now and keep the line as an optional variant in the approval block.
3. **Cross-demo template fixes:** give the HVAC heroes per-business images or a stacked layout with no face behind the headline at 390px, 44px tap targets everywhere including header, footer and inline links, trust text of at least 13px, and fix the doubled brand in titles.
4. **Facts:** "policy from reviews" is not policy. Write "customers mention…" with the source, or cut it. No prices, financing hints, after-hours or weekend claims, or founding years unless the business states them.
Re-run through QA. Only PASSes go live.
