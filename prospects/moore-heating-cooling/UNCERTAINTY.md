# Uncertainty — Moore Heating & Cooling

These items are flagged for human QA. They did not stop the draft. They stay out of customer-facing pages.

1. Phone is unresolved. Do not ship a call link.
   - Merchant Circle, re-read 2026-09-30: 417-344-0669 near the title and (417) 588-8822 in the about text.
   - Exa place page, re-read 2026-09-30: +14176572342.
   - The task named 417-588-8822 versus 417-657-2342. Both appear. Merchant Circle adds a third.
   - Customer pages and chrome use one line, "Phone number not confirmed." They do not publish any of these numbers.
2. Address spelling. Both re-read pages say 22 Glenridge St, Lebanon, MO 65536. The task said 22 Glenridge Road. Discovery did not preserve the street. No official site confirmed it. Customer copy uses Street and does not invite a walk-in.
3. No working official website was opened. Discovery website field was empty. http://www.moreheatingcooling.com returned HTTP 502 on 2026-09-30. That does not prove no site exists. Some snippets spell the name More Heating & Cooling at the same street.
4. Identity is corroborated by name and address only. The 2026-09-30 re-read of https://exa.ai/library/place/kb345qddxgs and https://www.merchantcircle.com/moore-heating-cooling-lebanon-mo shows Moore Heating & Cooling at 22 Glenridge St, Lebanon, MO 65536 on both. That is not an independent full Google verification of placeId ChIJP1KNzm45xYcRFL7_8I0jLR0. The Exa page heading showed September 14, 2026, a category line "Heating, Ventilating and Air Conditioning Contractor," status Open with no hours, coordinates 37.658049, -92.670036, and an Open in Google Maps link. A Carthage, Tennessee Moore Heating & Cooling, a Lebanon Highway listing, and moore-heating-cooling.business.site were not used.
5. Review inventory is incomplete.
   - Listing count on 2026-09-30: 11.
   - Actor sample was capped at 5 reviews and was not preserved in discovery.json.
   - The Apify dataset was not re-read. No new paid call was made in this revision.
   - The stored file evidence/exa-place-reviews-2026-09-30.json has 8 texts. The 2026-09-30 re-read of the same Exa page matched those texts. Reviewer names were absent. This is not a complete Google review inventory.
   - On the 2025-09-05 winter display, the installation sentence "Once everything showed up he came out to the house and installed it!" is complete. The following sentence is truncated at "It took him no time at…". The furnace page quotes through the complete installation sentence and does not quote the truncated sentence.
   - The 2025-07-29 display that begins "I have done business" is truncated at its final sentence and is not quoted.
   - Public quote attribution is the rating and date from that display, because no reviewer name was shown.
6. A 1-star filter-cost comment is in the evidence and in the Strategy Overview only. The comment names 100$ yearly for filters, then 700$ when the filters were changed. It is not used as a company price.
7. Customer comments say Dave / Dave Moore / Mr.Moore, and some state 20, 30, or 40 years of dealing with him. Owner title and years in business are not confirmed. A directory snippet that called him owner was behind a bot wall and was not fetched. Customer pages use the name Dave and do not call him the owner.
8. Same-day arrival appears inside one customer's winter quotation. The furnace page does not offer same-day service as a company promise.
9. Hours and email were not confirmed. The Exa status line said Open and did not list hours. A location.com snippet mentioned moreheatingcooling@yahoo.com. That page was not used as proof. Hours and email are omitted from customer pages.
10. timetoopen listed furnace and cooling categories and also mislabeled Lebanon as United Kingdom. Those category lines were not used as a service menu. The Exa category line is not an official service menu. Ventilation is not an approved page.
11. Merchant Circle's own review module showed 0 reviews, which conflicts with the Maps listing count of 11.
12. Service area beyond Lebanon was not confirmed. One comment mentions rentals in Lebanon.
13. No displayed comment describes an air-conditioning repair specifically. Generic system comments stay on the homepage and are not presented as AC or furnace jobs.
