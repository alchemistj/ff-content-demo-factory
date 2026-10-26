# Uncertainty — Moore Heating & Cooling

These items are flagged for human QA. They did not stop the draft.

1. Phone is unresolved. Do not ship a call link.
   - Merchant Circle, fetched 2026-09-30: 417-344-0669 near the title and (417) 588-8822 in the body.
   - Exa place page, fetched 2026-09-30: +14176572342.
   - The task named 417-588-8822 versus 417-657-2342. Both appear. Merchant Circle adds a third.
2. Address spelling. Fetched pages say 22 Glenridge St, Lebanon, MO 65536. The task said 22 Glenridge Road. Discovery did not preserve the street. No official site confirmed it.
3. No working official website was opened. Discovery website field was empty. http://www.moreheatingcooling.com returned HTTP 502 on 2026-09-30. That does not prove no site exists. Some snippets spell the name More Heating & Cooling at the same street.
4. Review inventory is incomplete.
   - Listing count on 2026-09-30: 11.
   - Actor sample was capped at 5 reviews and was not preserved in discovery.json.
   - Apify dataset was not re-read. No paid call was made.
   - Exa displayed 8 texts, 2 truncated with an ellipsis, no reviewer names, and a 4.5-from-11 line.
   - Quotes use only complete text or a contiguous excerpt of that display. They are not the Apify sample and not all 11 reviews.
5. A 1-star filter-cost comment is in the evidence and in the Strategy Overview only. It alleges $100 yearly versus $700 at filter-change time. It is not used as a company price.
6. Customer comments say Dave / Dave Moore / Mr.Moore, and some state 20, 30, or 40 years of dealing with him. Owner title and years in business are not confirmed. A directory snippet that called him owner was behind a bot wall and was not fetched.
7. Same-day arrival appears inside one customer’s winter story. It is not a company promise.
8. Hours and email were not confirmed. A location.com snippet mentioned moreheatingcooling@yahoo.com. That page was not used as proof.
9. timetoopen listed furnace and cooling categories and also mislabeled Lebanon as United Kingdom. Those category lines were not used as a service menu.
10. Merchant Circle’s own review module showed 0 reviews, which conflicts with the Maps listing count of 11.
11. Service area beyond Lebanon was not confirmed. One comment mentions rentals in Lebanon.
