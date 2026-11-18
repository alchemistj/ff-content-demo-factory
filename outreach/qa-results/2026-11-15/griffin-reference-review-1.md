# Griffin rebuild: reference review round 1 (separate Sonnet)

**NOT YET**

Method: I read words.json (all pages plus strategy and footer), outreach.md, usp.md and facts.md. I checked every review quote against reviews.json, and compared against Jon's Plumbing (SpringfieldPlumber 1095 words, BackflowTesting 1480) and the All-Phase service routes. There is no preview, so I did not check photos beyond the briefs and slot names.

Quotes: all 17 review quotes are verbatim, with no summaries. Fee-first and the old "ask what the fix costs" advice are fixed. The page is not fact-wrong. It fails because the service pages are mostly filler around review quotes.

## Per-page table

| Page | Closest reference | Verdict | Reasons and fixes |
|---|---|---|---|
| Home | Jon's Home and A&D Index. Both open on who the company is and why to call, then show proof. | WEAKER (fixable) | **Does well:** it leads with what the customer wants (heat or cooling back on). It does not open on fees. The plan is explained (two visits, spring and fall lists) before "What the Plan Costs". |
| | | | **Self-referential filler:** "Our site puts it plainly: HVAC equipment rarely requires repair at a convenient time. So the number is the first thing on every page." A customer doesn't care what the site says about itself. It is also a forced line lifted from the business's own site copy. Cut it, or replace it with Bob R.'s quote. |
| | | | **Voice:** it swings between "Our site", "Griffin's site" and "Griffin". |
| | | | **Plan order:** the $75 line (list item 5, "never pay after-hours, weekend or holiday rates, only $75.00") still appears before the $160 price. Josh's complaint is only half fixed. Move the $75 line under "What the Plan Costs", or fold it into one paragraph after the visit lists. |
| | | | **Odd advice:** "Rates and terms aren't listed on Griffin's site, so ask when you call." This admits the site has a gap, and it is the same "ask the cost" move Josh rejected. Cut the sentence. |
| | | | **Weak proof:** Bob K. ("Quick response and great tech.") is 5 words and proves nothing. Swap it for Reed S. or Jill T. The services section intro "Repair is where most calls start" is unsupported. |
| | | | **Service area:** the page lists 25 towns, but contact lists 6 and the business record lists 10. Pick one list. |
| | | | **Photos:** `service-van` ("white service van at the curb") is used on home and contact, and reads as Griffin's own van when it would be stock. Needs a preview check, or drop it. |
| Furnace Repair (364 words) | Jon's BackflowTesting. It is specific about the job and the owner, and it has a reason to hire. | WEAKER | **Does well:** the review set is the strongest asset. Bob R. (igniter, part on the truck, 5:10 to 5:45 on New Year's Eve), Kevin S., David R., Marolyn W. and Reed S. (no upsell) are real, specific proof. |
| | | | **First lines:** the hero and the "Why Call Griffin" paragraph rest on 24/7 and "since 1963". USP.md says 3 of 5 competitors also claim 24/7. The paragraph says "Griffin lists 24/7 emergency service on its own site, because HVAC equipment rarely requires repair at a convenient time". That is the same meta line as the home page. The paragraph never states in Griffin's own voice why to hire them. |
| | | | **Filler:** "Here is a furnace call on New Year's Eve, in the customer's words." is a throwaway lead-in. |
| | | | **Invented process:** the 4-step "What Happens When You Call About a Furnace" has no source in Griffin's own material. "The technician checks the furnace to find what is wrong" is something any competitor could print. "The furnace is checked before the technician leaves" is unsupported. This is the explainer padding Josh objected to. |
| | | | **Off-topic section:** "What the Fall Clean-and-Check Covers" is plan content on a repair page. It mentions "priority scheduling and 10% off parts" before the plan is explained. The FAQ "Can I get the fall clean-and-check on a weekend? No." is a plan question with a negative answer, not a furnace-repair question. |
| | | | **Financing:** the replacement paragraph adds "highest score from all 3 bureaus", which sits oddly next to the "soft credit check" wording elsewhere. |
| | | | **Photo:** the `furnace-detail` brief ("furnace cabinet with the access panel removed, burner assembly and wiring visible") is close to the banned `furnace-hero` look ("an empty furnace cabinet", demo-gates.md line 37). Check it on a preview or drop it. |
| | | | **Fix:** lead with Bob R. in the first screen. Write one honest own-voice line from what the reviews show (customer-named tech arrives fast, brings the part, explains it, no upsell), using the review facts. Delete the 4 steps. Move the fall section to the plan, or cut it. Replace the FAQ with real repair questions answered from reviews. |
| AC Repair (331 words) | All-Phase electrical service pages, which lead on what is covered. | WEAKER | **Does well:** concrete proof. Kristopher H. (Labor Day Saturday), JL X. (called morning, fixed same afternoon), Jigar P. (noise, "very reasonable cost") and Judith G. (explained the system, showed the Nest). |
| | | | **Same filler pattern as the furnace page:** "Here is one hot-day call, in the customer's words.", the near-identical 4 steps ("The technician checks the system to find what is wrong"), and a spring clean-and-check section plus FAQ. |
| | | | **Risky quote:** Jeff B. ("I am on the hook for a new AC unit… the unit is 30 years old") reads as bad news. It could work as an honest-diagnosis proof, but it has no framing and a worried owner may read it as a complaint. Julia D. ("did a thorough inspection") is generic. |
| | | | **Unused material:** Bob R.'s July 3rd 90-degree-day AC review is in reviews.json and unused. |
| | | | **Fix:** as for furnace. Drop the steps and spring section, and use the July 3rd review. |
| Contact | Jon's Contact. | WEAKER (minor) | The "What to Tell Us When You Call" list (ice, tripped breaker, system age) is generic. "Hours. Monday to Friday, opening at 8:00 AM" is awkward and is a workaround for the 5:00 vs 6:00 conflict. That conflict is raised on the strategy page, which is the right place. The area list (6 towns) conflicts with home (25). The page is acceptable, not a blocker. |
| Strategy | The Lovable strategy pages (DemoStrategyPage). | AS GOOD | It states the site's problems with real checked facts: the 768 px width, no phone in the header, the same "Heating Services" title on three pages, and the hours and 1963/2019 conflicts. The confirm items are good. One caution: the "lead" block says the plan is "explained first and priced last", but the home page puts $75 before the price. |

## Josh's five complaints

1. **After-hours cost lead:** fixed. The page does not open on it.
2. **$75 before the plan is explained:** half fixed. The plan is introduced first, but $75 still precedes the $160 price.
3. **"Ask what the fix costs":** not present. But "so ask when you call" about financing rates on the home page is the same kind of line.
4. **Rejected furnace photo:** `furnace-hero` is gone. The replacement `furnace-detail` brief is too close to the banned "empty furnace cabinet". It needs a visual check.
5. **Half-blog service page with no reason to hire:** only partly fixed. The review wall gives a reason to hire, but about 40% of each page is generic process, plan and weekend-booking filler. That is blog-style content that can't stand beside a reference page.

## Is Griffin TOO THIN for two service pages?

My call is that neither page is too thin on proof, and both are thin on Griffin's own substance.

- **Proof:** there are enough specific reviews. For furnace: Bob R., Kevin S., Joseph A. (heat on before cold), Jill T., Reed S. For AC: Kristopher H., JL X., Jigar P., Judith G., Jeff B., plus Bob R.'s July 3rd review.
- **Own substance:** Griffin's site has no repair pages, no brands, no licenses, no named owner and no warranty claims. Take out the invented steps and the plan sections, and each page shrinks to roughly 200 words of quotes plus 24/7. That is far below the references (Jon's pages are about 1100 to 1500 words of owner-specific claims).
- **Furnace:** workable as a short, proof-led page.
- **AC:** borderline. After the cuts it is a review wall with one generic claim.

If Josh wants reference-level depth from Griffin's own material, Griffin is TOO THIN. If Josh accepts proof-led short pages, fix the items above and it passes. This is his call, and I would not call it send-ready on the current copy.

## Outreach

- **Link:** plain, with no `?utm_source`. Pass.
- **Quote:** Bob R.'s quote matches reviews.json word for word. Pass.
- **Opt-out:** present ("Reply 'no thanks'…"). Pass.
- **Tone:** it reads like Josh. "Lol" and "How'd we do on your company vibe?" are in character. Pass.
- **Josh problem:** the quoted tech is named Josh ("Josh showed up at 5:10 pm") and the sender signs "Josh, Fluid Frame Marketing". An owner may read that as the sender claiming the job. Use a different review (for example Kristopher H.'s Labor Day Saturday AC call, which names Doug), or add a short framing line.
- **Repeat:** the "page for furnace repair and one for AC repair" sentence is repeated almost word for word in the last paragraph ("We built your homepage and your furnace repair and AC repair pages"). Cut one.
- **Phone-width detail:** "768 pixels wide on a 390-pixel screen" is jargon for an owner. Say "your site scrolls sideways on a phone and has no phone number in the header".
- **Variant:** "My daughter and I…" is correctly gated on Josh's confirmation.

Outreach verdict: nearly ready. It needs the Josh/Josh fix and a trim, but the main problem is the service pages.
