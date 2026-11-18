# ComfortTechs: reference review after Josh's 8 round-3 fixes (deployment 1dc5ce2)

Plan changed after this review (FF Architect, 22:42 UTC): ComfortTechs is being rewritten from scratch in Google Docs by FF Architect, so these fixes were NOT applied on #80. Kept here as input for the rewrite.

**NOT YET.** The page is close: words match, photos and footer are fine, and 7 of Josh's 8 items are done. But the BBB badge has no "what it is" sentence, one new install claim isn't on their site, and a few lines say the same thing twice.

**What I checked** on deployment 1dc5ce2 at 390 and 1440 (full-page scroll, no horizontal scroll on any page):
- Every string in words.json is on the rendered home, furnace, AC and contact pages. Nothing is missing, and the only extras are chrome.
- The strategy page renders, with the corrected findings.
- Screenshots: `/tmp/claude-0/-home-user/57631495-4bd1-5c8e-bdf1-716f94388210/scratchpad/shots/ct5-*-390.png` and `ct5-*-1440.png`, footers as `ct5-footer-*-390.png`, photos as `ct5-img-*.png`.

**Josh's 8 items**
1. **NATE sentence.** Done. The wording matches the natex.org line quoted in facts.md ("the nation's largest nonprofit certification organization for heating, ventilation, air conditioning and refrigeration (HVACR) technicians"). It is on home, furnace and AC. The fact is also in their own site's text (about-us.md:26).
2. **Owner's voice.** Done on the body copy ("We're A+ rated…", "We've served Lincoln since 2007", "We repair…"). Fix: the services intro "Repair, installation and maintenance for homes and commercial buildings." is the one report-style line left. Make it "We repair, install and maintain…".
3. **No website talk.** Done. The repair links now sit inside "Whether you need furnace repair or AC repair, call us…". The fixed "See why we built this site" bar is standard chrome.
4. **"and more" and brands named.**
   - "Any make… and more" is done on home, the AC hero and the AC card.
   - American Standard install (about-us.md:13) and WaterFurnace ("Geothermal Installation", waterfurnace-geothermal.md:12) are supported.
   - **Mitsubishi is not.** "We install American Standard and Mitsubishi Electric systems" and "we install Mitsubishi Electric systems" (AC page) are not in site/. mitsubishi-electric-products.md only shows indoor units, outdoor units and controls with "Learn More" links, and no site page says "install" or "dealer" for Mitsubishi. facts.md still marks Mitsubishi dealer status unverified.
   - Fix: say "We carry Mitsubishi Electric ductless systems", or drop it. Also add a note in facts.md.
5. **Audience.** Done. Home install paragraph and service cards say "your property" and "homes and businesses". The furnace and AC sections stay home-only.
6. **Geothermal and commercial folded into cards.** The standalone sections are gone, but see Fix 3 below: the WaterFurnace line appears twice.
7. **Footer at 390.** Passes. All 44px list rows are even, and the Services and "Why choose us" lists read as a regular column with no empty band. The contact lines sit in a steady rhythm. The fixed bars cover part of the footer in my element screenshots, which is a capture artifact only.
8. **Manufacturer-link finding.** The 7, 3 and 10 counts match site/ exactly (7 American Standard, 3 Mitsubishi, 10 WaterFurnace "Learn More" links). The wording "may list competing dealers" is appropriately hedged.

**Josh's standing checks, per page**

| Page | Verdict | Reasons and fixes |
|---|---|---|
| Home | WEAKER (small) | **Credential sentence.** The BBB badge reads "A+ rated with the Better Business Bureau / We're A+ rated with the Better Business Bureau." The title and text repeat each other, and nothing says what the BBB is. Josh's rule is one plain sentence per credential, sourced in facts.md. Fix: add something like "BBB is a nonprofit that rates businesses on how they treat customers", sourced from bbb.org in facts.md. If it can't be sourced, drop the badge. The A+ itself is confirmed on bbb.org. <br>**Double coverage.** The WaterFurnace line appears both in "We install American Standard and Mitsubishi Electric systems, and WaterFurnace for geothermal" and in the Geothermal Heat Pumps card. Keep one. <br>**Hub pattern.** Repair and installation each appear as a section and as cards. That is the usual hub pattern and I would leave it, but it is the one thing Josh could read as covering a service twice. |
| Furnace repair | AS GOOD | Opens on fix-first, then Robin B. The NATE sentence is in the owner's voice. |
| AC repair | WEAKER (small) | **Repetition.** "NATE-certified" is said in the intro body, again in the first bullet, and a third time in the NATE sentence. The brand list "Bryant, American Standard, Trane, Carrier and more" appears in the hero sub, the "Why Hire" body and the replacement paragraph. Fix: drop the "NATE-certified technicians" bullet, and keep the brand list once in the sub and once in the replacement paragraph. <br>**Mitsubishi line** (see item 4). <br>The Ashley H. quote is still in the same paragraph as the brand sentence, which is acceptable. |
| Contact | AS GOOD | One number, hours, Tracy R., and "Where to Find Us" is in the owner's voice. |
| Strategy | AS GOOD | Reads accurately. |

**Photos:** unchanged from my previous pass, so keep all of them. The `home-hero-alt` condenser on siding is clean, and nothing shows a face under text, a blank prop, a `tech-at-door` image or a `furnace-hero` image.

**Outreach:** unchanged and still passes (plain link, exact full-sentence quote, opt-out line).

**Fix list**
1. Add a sourced one-sentence "what BBB is" line, or drop the BBB badge.
2. Replace the Mitsubishi "install" claim with what their page shows, or drop Mitsubishi.
3. Remove the WaterFurnace repeat (install paragraph vs geothermal card) and the AC NATE bullet and repeated brand list.
4. Fix the services intro to owner's voice.

Once these are in, this is SEND-READY.
