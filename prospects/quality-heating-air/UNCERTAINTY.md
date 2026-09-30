# Uncertainty — Quality Heating & Air

These items are flagged for human QA. They did not stop the draft.

1. Review text is missing. Discovery listing count was 192 on 2026-09-30. The normalized export dropped reviews. Apify dataset `o3rGh1edmkftb6dNG` (run `3s6cuct3drvx0BJNx`) was not re-read because `APIFY_API_TOKEN` is not on this worker. No paid call was made. Customer pages quote nobody.
2. Lennox dealer-locator page matches the NAP. Premier Dealer, factory-trained, and mini-split blocks were not used as credentials. Confirm if any of those badges are actually assigned.
3. The Amana nav item links to amana-hac.com, not a dealer record. Amana dealer status is not claimed.
4. Homepage heading "Customer Satisfaction Guaranteed" does not define a remedy. It is not repeated as a warranty.
5. "Emergency Service Available" has no after-hours schedule. Weekday hours and weekend-by-appointment are what the site publishes. A third-party snippet said weekends are closed. This draft follows the official site.
6. WhatsApp `(417) 288-2968` is published and is not the shop phone `(417) 532-6239`.
7. Financing link is published. Terms are not.
8. Jobber URL is a work request, not a confirmed appointment. It was not submitted.
9. No town list beyond Lebanon was on the captured homepage.
10. Copyright © 2018 in the footer is not treated as a founding year.
11. Lennox JSON-LD hours of 00:00–23:59 were ignored as template noise.
12. The homepage image alt is only the business name. It is an image reference, not a job photo claim.

## Revision check, 2026-09-30

Read-only re-fetch of https://www.qualityheatnow.com/ confirmed the same NAP, hours, email, emergency sentence, financing URL, WhatsApp URL, and Jobber href. No new Apify call. Prior discovery spend stays USD 0.2832.

Customer pages omit these source limits. They stay here:

- Lennox product link on the shop nav is https://www.lennox.com/products, which redirects to the general residential catalog. Amana nav link is https://www.amana-hac.com, the general product site. Repair vs replace is https://www.lennox.com/buyers-guide/guide-to-hvac/repair-vs-replace, a Lennox buyers guide. None of those is a shop resource in this revision.
- Lennox dealer locator https://www.lennox.com/residential/locate/dealer/mo/lebanon/quality-htg-and-air still matches 22124 MO-32, 417-532-6239, and qualityheatnow.com. Premier Dealer, factory-trained, and mini-split blocks on that page still read as generic locator explanation. They are not customer claims.
- Jobber remains the external work-request href. A HEAD request from this worker received Cloudflare HTTP 403. The form was not submitted.
- The live phone href is `tel:4175326239`. Markdown drafts use `tel:+14175326239` and `mailto:josh@qualityheatnow.com`. Package span hrefs cannot store those schemes.
- The live homepage also has a Send Message form (name, email, phone, address). This draft does not treat that form as a working path.
- Review text is still absent. No quotations were added.
