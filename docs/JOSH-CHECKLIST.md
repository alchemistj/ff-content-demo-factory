# JOSH-CHECKLIST: the single source of truth for Josh's demo lessons

Status: written 2026-11-15 from `ff-astro-demos/docs/demo-definition-of-done.md` (DoD), `ff-astro-demos/docs/josh-demo-checklist.md` (Checklist, only the writer-facing rules), the squash commits of ff-astro-demos PRs #41 to #64 (`#NN`), ASSIGNMENT.md "Demo copy" (Nov 15 Josh, and the eight ComfortTechs notes, `CT note 1` to `CT note 8`), `docs/demo-gates.md` (Gates) and `docs/briefs/REFERENCE-REVIEW-BRIEF.md` (Brief).

This file is the one list of Josh's lessons. The writer loads it before writing and the independent reviewer loads it before reviewing; neither keeps a second copy. Every item is a pass/fail test, answered **per page** with a quote from the page as evidence (the Reviewer table at the end is the answer sheet). One FAIL on any item means the demo is NOT YET. ASSIGNMENT.md's "Demo copy" section points here; if the two ever disagree, fix both the same day. When Josh states a new rule, add it here with its origin before anything else.

Page codes: **all** = home, service, contact, strategy; **home**, **service**, **contact**, **strategy**, **outreach** (the message to the owner). "Business pages" = home, service, contact.

Origin note: most commit messages in #41 to #64 say only what changed, not why. Where the reason is not written down, the item says "reason not recorded" and states the rule the change implies.

---

## A. Facts and sources

1. **Every quote is word for word.** PASS if each quoted review appears exactly in `reviews.json`, with that reviewer's First L. caption (or "Google review" when the Google name is not a person's name). FAIL on any changed word, any invented quote, or a username as a name (the Integrity review signed "TheDaendric" was replaced by "Debra D."). Trims are 1 to 3 whole sentences with gaps marked " … ". [Gates check 3; Checklist 14, 15; #54] Pages: all.

2. **Every number traces to a source.** PASS if each phone number is in facts.md, and each year count, "since YYYY", percentage, dollar figure and price is in facts.md, audit.md or a review. FAIL on any figure with no source, and on any line that facts.md marks "Unverified" or "Conflict" used as if it were fact. [Gates check 3] Pages: all.

3. **Claim words match the source's words.** PASS if every claim word (guarantee, warranty, licensed, insured, certified, award, 24/7, family-owned, generation, master) is used by a source and keeps its strength. FAIL on a stronger word than the source ("EPA registered and certified" had to become "EPA registered"; "warranties from 5 to 15 years" had to become "up to 15 years"). [Gates check 3; #56] Pages: all.

4. **Say the strongest claim the evidence supports, and no more.** PASS if each claim is the strongest reading of what we found (reviews, badges, manufacturer directories, the business's own site) and no stronger ("fewer drafts", not "drafts are no longer an issue"). FAIL on a claim with nothing behind it. [DoD 2.10; Checklist 8] Pages: business pages.

5. **Never contradict what the business does.** PASS if no line limits or denies a service the business offers. FAIL on a line such as "Flat roofs aren't our specialty" when the business does flat roofs (it became "We do flat roofs too, but they're a smaller part of our work"). [#56] Pages: service, home.

6. **Facts come from the business's full page text.** PASS if facts.md cites files saved by `fetch-site-text.mjs` and every own-site claim (certification, years, guarantee, how it works) is quoted or closely follows those files. FAIL on a generic efficiency or statistic claim copied from a manufacturer, or a claim the writer could have got only from notes. [CT note 8; ASSIGNMENT Demo copy] Pages: all.

7. **Use the business's everyday name.** PASS if the H1, title and body use the name the business uses with customers. FAIL on a legal suffix ("Dream Makers LLC Heating and Cooling" was cut to "Dream Makers Heating and Cooling" everywhere). [#56] Pages: all.

8. **Every credential is explained in one plain sentence.** PASS if each certification, rating or program (NATE, BBB, a manufacturer tier) has one short line saying what it is, taken from the certifying body's own site and cited in facts.md. FAIL on a bare acronym. Brand dealer status is stated only if the manufacturer's locator confirms it. [CT note 1; ASSIGNMENT Prospect picking] Pages: home, service, contact.

9. **No rating counts or star counts, anywhere.** PASS if no page shows a star rating, "5.0", a review count ("27 Google reviews", "63 five-star reviews") or a count of how often a name appears in reviews ("Ravi is named in 11 of them"). FAIL on any of them, strategy page included. [#46; #53; #54; Checklist 13; DoD 1.1 refined by #53] Pages: all.

10. **Examples and scenarios match the business's real hours and offer.** PASS if every example (day, time, who answers, what it costs) is consistent with the hours and terms in facts.md. FAIL on a scenario that the facts do not support (Integrity's "Saturday night" became "Tuesday night" because its weekday 8-to-5 hours and "weekends at additional cost" made the real gap a weeknight after 5). [#64] Pages: all.

11. **Named people are sourced.** PASS if every person named (owner or technician) appears in facts.md or a review as that role, and the owner's first name is confirmed from the owner's site, profile or reviews that say "owner" (an employee named in reviews is not the owner). FAIL on a name added to make the page warmer (the line "Customers have met Clayton and Cory" was removed from Integrity's FAQ; reason not recorded). [#45; Checklist 3] Pages: all.

12. **Every office and every phone number is covered.** PASS if each office and number is a tap-to-call link on the demo, and the strategy page notes anything wrong with any of them on the current site. FAIL if a second number or office is dropped. [DoD 2.12; Checklist 27] Pages: all.

13. **Numbers about equipment are right for the equipment.** PASS if lifespans and similar figures are stated per equipment type and source ("Furnaces commonly run 15 to 20 years and air conditioners 10 to 15"). FAIL on one blended figure. [#47 Cook's lifespan fix] Pages: service.

## B. Voice and wording

14. **The owner's voice, always.** PASS if every line reads as the owner would say it: the visitor is "you", the business is "we"/"our". FAIL on third-person or report style ("BBB lists ComfortTechs, Inc. … with an A+ rating"; "the crew … they …"). [DoD 2.9; CT note 2; #43; ff-architect working rules] Pages: all.

15. **Warm, plain, confident.** PASS if lines read like a person talking and promise something ("If something isn't right, call us and we'll make it right"). FAIL on a curt, grudging, hedged or marketing line ("you call us, and we deal with it"; "Judge us by the reviews"; "A company people haven't heard of can't lean on a reputation" tone). Active voice. [#42; #43; DoD 2.9] Pages: business pages.

16. **No hedging or notes to the owner on business pages.** PASS if no business page says "to be confirmed", addresses the owner, or mentions an onboarding call. FAIL on any. [Checklist 8a] Pages: home, service, contact.

17. **Never talk about the website itself.** PASS if no sentence is about the site or its pages ("each has its own page", "on this page", "our site lists", "check out our", "learn more on", "breaks down"). Services are linked inside a sentence about the customer's situation. FAIL on any sentence whose only job is to point at another page, and on filler ("X is all about", "when it comes to"). [CT note 3; Checklist 11a] Pages: home, service, contact.

18. **No forced metaphors.** PASS if no line leans on a made-up comparison ("Houses don't climb…"). [Nov 15 Josh] Pages: all.

19. **Lead with what the customer wants, not fees.** PASS if the homepage opens on what the customer gets, and no plan price appears before the plan is explained. FAIL on an opening about after-hours cost or a price before its plan. (Integrity's hero idea, after-hours price first, predates this rule; do not copy it.) [Nov 15 Josh; #58 context] Pages: home, service.

20. **No advice that ignores how the trade works.** PASS if every piece of advice is something a customer can do and a tradesperson would give. FAIL on advice such as "ask what the fix costs" before the company has looked, or landlord advice inside a renter section (dropped from Dream Makers). [Nov 15 Josh; #48] Pages: all.

21. **The paragraph covers what its heading promises.** PASS if the text under each heading covers every item the heading or the list above it names. FAIL on a furnace-only paragraph under "Heating, Cooling and Geothermal" (narrow the heading or cover all items). [Nov 15 Josh] Pages: all.

22. **Brand lists are complete and truthful.** PASS if every brand the business's own site shows it installs is named, and a list that says "any make" ends "and more". FAIL on one brand named from several. [CT note 4] Pages: home, service.

23. **One audience per section.** PASS if a section that says "home or business" ends in words that fit both ("your property", "your building"). FAIL on "your home's configuration" under a home-or-business heading. [CT note 5] Pages: all.

24. **Specific to this business.** PASS if each claim names something only this business does or has, so a competitor could not print it. FAIL on a claim any competitor could use. [Brief] Pages: business pages.

25. **State the benefit as the business's own claim.** PASS if business-page copy says what the customer gets in plain words ("Rooms hold their temperature.") and a review below proves it. FAIL on "Customers tell us…", "Most people notice…", "One customer said…" or "Your reviews say…" in business-page copy (the strategy page is the exception). [DoD 2.10] Pages: home, service, contact.

## C. Page structure and sections

26. **The page is built on one idea.** PASS if the homepage and service pages carry one named idea (a way of working, or the strongest scored claim), stated on the first screen and carried through. FAIL on a page of general sections with no idea. [#48 rebuilt from a way-of-working idea; #58; #61] Pages: home, service.

27. **The first lines say why to hire this company.** PASS if the hero and the first section answer "why this company" in plain words. FAIL if the first screen is generic. [Brief; Nov 15 Josh] Pages: home, service.

28. **Homepage H1 is the company type.** PASS if the H1 is `[Company Type] in [City, ST] — [Business Name]`. FAIL on a service or procedure as the H1. [DoD 2.11] Pages: home.

29. **Each service page owns one different keyword** in its H1, title and slug, and no two pages target the same phrase. [DoD 2.11] Pages: service.

30. **Length and section count.** PASS at: home 550+ words and 10 to 12 sections; service 700+ words and 10 to 12 sections; contact 250+ words and 5 to 7 sections. A page up to 15% under is logged as short, not padded. FAIL below that (add hedged trade knowledge: what usually fails and why, what to check, safety, repair-vs-replace, what a visit involves; only BUSINESS claims need a source), and FAIL for padding. Short headed blocks under 60 words are merged. [DoD 2.6; Gates] Pages: business pages.

31. **Say each point once.** PASS if no sentence of 8+ words appears on more than two business pages (trust bar, footer and call band excepted); the owner's backstory is on one page; per page "24 hours" is at most 2, "pressure/pushy" at most 3, "satisfaction" at most 1; and no explanation repeats a point already made. FAIL on any repeat. (The Integrity after-hours story was told in two sections, then merged into one.) [DoD 2.7; #47; #62; #63; Gates sameness lint] Pages: all.

32. **Never cover a service twice on one page.** PASS if no small section about a service sits above its own card in the services grid. FAIL on any (keep the card, fold or drop the section). [CT note 6] Pages: home.

33. **Every FAQ is a real FAQ section with a heading.** PASS if each FAQ is a heading plus question and answer items. FAIL on raw `###` markers showing or FAQ prose with no heading. [DoD 2.8; #46] Pages: service, home.

34. **No label headings or template feel.** PASS if no heading or sentence repeats within the demo, no stock label headings, and the eyebrow does not repeat the trust bar. [Gates sameness lint] Pages: all.

35. **Trust bar is real and supports the idea.** PASS if every trust-bar item is something the business offers and stands behind, and the item that carries the lead idea is in it (the demoted "Sam Answers Calls Himself" was replaced by "After-Hours Price by Phone"; Dream Makers' strip was shortened). One band, 3 lines or fewer at 390, no line starting with "·". [#48; #59; DoD 2.5; Checklist 36] Pages: home, service, contact.

36. **No filler and no leftover template text.** PASS if no intro paragraph can be deleted without loss, and no placeholder or mockup text remains. [Checklist 33, 37; DoD 2.6] Pages: all.

37. **The homepage has the model-site fundamentals.** PASS if the home page has a fact line, a stated method, a checkmark proof list, a problem-by-problem section, a services list and reviews. FAIL if one is missing. (Source: #49 commit message only.) [#49] Pages: home.

38. **Contact page does its job.** PASS if the contact page gives phone, hours, address or area, and a plain call to action in the owner's voice ("If it's urgent, please call"). FAIL on a thin page or a form note left in. [DoD 2.6; #43] Pages: contact.

39. **Scope is home, 2 service pages, contact and strategy**, and only real material from the business. [Nov 15 Josh] Pages: all.

40. **The reference test.** PASS if the reviewer places each page next to the closest of the 16 reference pages and answers yes to "Is this as good? Would Josh send this?", quoting one line from each. FAIL on WEAKER. [Nov 15 Josh; Brief; DoD 6.2] Pages: business pages.

## D. Service pages

41. **At least 2 service pages**, the business's two main money services, each with enough material: at least 5 reviews about that service, or the business's own site describing it in some depth. FAIL (mark TOO THIN, do not pad) if either page cannot stand on real material. [Nov 15 Josh; Gates service-page rule] Pages: service.

42. **Company-first.** PASS if the page opens with why to hire this company for this job (diagnosis first, then options, the decision is yours), and generic explainer sections are cut ("Why Systems Quit on the Worst Day", "Nobody wants to replace a furnace…" blog blocks were cut or folded). FAIL on a half-blog explainer page. [#47; Nov 15 Josh] Pages: service.

43. **Repair-or-replace advice is a rule the customer can check.** PASS if the page says which signs mean repair and which mean replace (capacitor, motor, cleaned coil: repair; old unit, repeated repairs, failed compressor: price a new one), and admits repair is often right. FAIL on advice that cannot be checked. [#47 "checkable repair rule"] Pages: service.

44. **The service list matches what is built.** PASS if a service with no page (`route: null`, e.g. New AC Installation, New Furnace Installation) is named in the strategy page's "A full build would also add" line. [#62] Pages: home, strategy.

## E. Reviews and quotes

45. **No review summaries.** PASS if every review appears only as an exact quote with the reviewer's name. FAIL on any summary such as "customers mention…", "customers describe…", "reviewers say…", "one customer said…", "That's how reviewers describe it". Quote a real review word for word, or leave it out. [Nov 15 Josh; DoD 2.10; Gates lint] Pages: home, service, contact (strategy may refer to reviews, never with counts).

46. **A review proves a claim; the copy does not retell it.** PASS if the copy names the benefit in general terms and the review gives the specifics once. FAIL on "We have replaced five basement windows in four hours" above a review that says it. [DoD 2.10; Checklist (factory check 8)] Pages: home, service.

47. **Each review on one page only, each reviewer at most twice, one story per customer.** FAIL if a review appears on two pages, the same review twice on a page, or a name more than twice in the demo. [DoD 2.7; Gates sameness lint; Checklist 18] Pages: all.

48. **Reviews are placed and matched.** PASS if the first review sits right under the hero and trust bar, then one every couple of sections, never two in one section, and each review fits its page's topic (the Integrity "responsiveness" review replaced a username review that did not fit). FAIL on an off-topic review. [Checklist 16, 17, 18; #54] Pages: home, service.

## F. Photos and images

49. **No stock or listing photos; no pretending.** PASS if no image is from the business's Google listing or site, and none is presented as their team, trucks or jobs, and none has their logo, name or address. Alt text never names the owner or staff. [DoD 5.1] Pages: all.

50. **People match who is speaking.** PASS if the person in a photo matches the speaker: same gender as the named person ("I'm Sam" gets a man), and the crew the reviews describe when the page says "we" (female technician photos on Cook's and Air Capital were swapped for men because reviews name Sheldon, Ricky, Derek, Juan). If we cannot tell, show the work (equipment, hands), not a face. Work it out from facts; do not ask Josh. [#50; DoD 5.2; ff-architect working rules] Pages: all.

51. **Desktop and phone heroes are one photo**, one scene cropped two ways. FAIL on two different renders. [#50; DoD 5.2] Pages: all.

52. **No blank props.** PASS if nobody holds a blank sheet, clipboard, tablet, screen or cardboard sign. FAIL on any (Cook's and Dream Makers' blank-clipboard photos were replaced). [#49; DoD 5.4; Nov 15 Josh] Pages: all.

53. **No banned or rejected photos.** PASS if no image is a slot on the banned list: HVAC `tech-at-door` (blank clipboard), HVAC `furnace-hero` (white-polo look rejected on Cook's and Dream Makers; empty furnace cabinet), the brick-condenser Air Capital hero (visible splice, rejected), and any photo Josh rejected before. Keep this list current in `docs/demo-gates.md`. [Nov 15 Josh; Gates; #57; #62] Pages: all.

54. **Nothing fake in the picture.** PASS if there is no visible splice or seam, no readable text (shirts, signs, labels, truck lettering), no hands holding fiddly tools, no fused tool, no doubled reflections, one focal point. Blank signs and unbranded equipment are fine. [DoD 5.4; #57] Pages: all.

55. **Heroes are readable.** PASS if white text is at least 4.5:1 in the brightest 10% of the area behind it at 390 and 1440, the text zone is calm and mid-dark (about 50 or below on 0 to 100, standard deviation 25 or less), daylight only. FAIL on a bright sky or light siding behind the words. [DoD 5.3; #48; #53] Pages: all.

56. **Photos are distinct.** PASS if no photo repeats within a page (a section photo no longer duplicates the hero), the first-section photos differ across pages, and no photo is shared across the demos sent to the same city (four roofers got four different sets). [#48; #50; #53; DoD 5.6] Pages: all.

57. **Photos support the words, with real alt text.** PASS if each photo matches its section (a hail-dented gutter beside the hail-claim section, a furnace for a furnace section), faces point toward the text, and alt text describes the scene and is updated when the photo is swapped. FAIL on alt text that no longer matches. [DoD 5.2, 5.5; #53; #62] Pages: all.

58. **Image counts and files.** PASS if business pages have a hero plus 1 or 2 section images, all loaded, with desktop and phone native crops, WebP, rendered width no more than 1.25x the file width. [DoD 2.1, 5.5, 5.6] Pages: business pages.

## G. Strategy page

59. **Everything in the spec is on the page, in order**: hero, "Why we built this site", page cards (each with red problem, green "What the demo fixes", orange "A full build would also add", "View page"), report card, four-group full-build list, closing block. One `<h1>`, 1,000 words or fewer. [DoD 1.1, 1.2, 1.6, 1.7; Checklist 11] Pages: strategy.

60. **No star ratings and no score table.** PASS if the strategy page has no star rating, no review count and no score table or score note; the "Why we led with" paragraph stays. [#53; #64] Pages: strategy.

61. **The "What we'd confirm with you" card names real conflicts.** PASS if the card has three questions, each stating a specific conflict found (two phone numbers, "since 1981" vs "30-plus years" vs "over 40", hours that disagree, a service area that disagrees with Google). FAIL on generic questions. The onboarding call is mentioned exactly once on the page. [#55; Checklist 8b] Pages: strategy.

62. **Bold and specific.** PASS if each problem says what it costs ("…and that line costs you the most calls"), attributes site facts to the site ("Your site says you've been roofing Wichita since 1981"), and uses accurate status labels ("Needs work", not "Missing", when something exists). FAIL on a vague or unfair claim. [#54; #55; Checklist 6] Pages: strategy.

63. **Competitor and audit claims are backed.** PASS if "We checked the top five Wichita roofers, and none describes…" is supported by audit.md, and every button and link on the current site was clicked before one is called broken. [#58; #61; DoD 2.12] Pages: strategy.

## H. Layout and mobile

64. **Hero and bars.** PASS if both hero buttons are on the first screen at 1440x900 and 390x844, the hero is at most 850px tall with at most 56px empty below the text, the text/book bar is mobile only, the header is one row at most 65px at 390, and the way-back bar is full width and at least 44px tall. [DoD 1.3 to 1.5, 2.2, 2.4] Pages: all.

65. **One content width and aligned columns.** PASS if every section shares the same left and right edges at 1440 (±2px) and the same 20px margins at 390; two-column sections start and end together; quote and name share a left edge; at least 12px under headings. [DoD 3.1 to 3.4] Pages: all.

66. **Split photos keep a 4:3 shape**, centered beside the text, never stretched to the text height. [#63] Pages: home, service.

67. **The footer reads evenly.** PASS if at 1440 it has 3 or 4 equal columns with headings; hours wrap inside their column and no phrase breaks mid-way ("5:00 pm" on one line); labels describe their content (a label "Office" over non-office lines became "Also"); links are real; at 390 linked and unlinked rows are spaced the same with no empty bands and no empty block under the copyright row. [DoD 4; #41; #56; CT note 7] Pages: all.

68. **Hero text links are readable on the photo** (white on the photo). [#41 template] Pages: all.

69. **Small interface rules.** PASS if every phone number is tap-to-call, no button text wraps, no heading ends on a lone word, hover effects appear only on real links, and the menu has no Home link and links to every business page. [DoD 2.3; Checklist 24 to 31] Pages: all.

70. **Word counts are honest.** PASS if no visible words are CSS-drawn or hidden to get under a limit (3 or fewer CSS-drawn words). [DoD 6.4] Pages: all.

71. **Proof before Josh sees it.** PASS if `qa/demo-check.mjs` and the demo gate show 0 FAIL, the output is pasted into the PR, the reviewer's side-by-side read is done, and Josh gets live pages, not a Google Doc. [DoD 6.1, 6.2, 6.2a; #44; Gates] Pages: all.

## I. Outreach message

72. **The link is plain.** PASS if the demo link has no `?utm_source=` or other tracking query. [ASSIGNMENT Demo outreach; Checklist 48] Pages: outreach.

73. **The customer detail is an exact quote** from a real review, not a summary. [Brief; Nov 15 Josh] Pages: outreach.

74. **It reads like Josh and ends with a one-line opt-out.** PASS if the message leads with the prospect (their customers' words, then their costliest problem, then the demo link, Josh's intro near the end), is honest and warm ("my daughter and I built"), and ends with a plain opt-out. The old "would have recognized this as a solicitation" line is gone. [Brief; ASSIGNMENT Demo outreach; Checklist 42, 43, 45] Pages: outreach.

75. **Call times are real and named.** PASS if times use day names (never "tomorrow") and come from Josh's "Book a Call with Josh" calendar. FAIL on a guessed time. [Checklist 44, 49; ASSIGNMENT] Pages: outreach.

76. **Sent the right way.** PASS if it goes through the business's own contact form with honest name and reply details and a confirmation screenshot, and any blocked send goes to Josh's hand-send list. [ASSIGNMENT Demo outreach] Pages: outreach.

77. **No two review quotes back to back.** PASS if copy sits between every pair of review quotes on every page (the models never stack them). [Nov 16 Josh] Pages: all.

78. **The Homepage card's full-build line is the standard one.** PASS if its "A full build would also add" line matches FULL_BUILD_LINES.md line 8 exactly. [Nov 16 Josh; FULL_BUILD_LINES.md] Pages: strategy.

79. **Business's own site claims used in their voice; none invented by us.** PASS if certs, licenses, financing, warranty and paperwork help from their site appear as their claim, and no license, cert, award, year or guarantee is invented. Conflicts sit in "What we'd confirm"; no top differentiator is dropped. [Nov 16 Josh] Pages: all.

80. **Trade jargon is explained or skipped.** PASS if terms like tear-off, decking, flashing, ACV, RTUs and brand product names have a plain phrase or one explanation. [Nov 16 Josh] Pages: home, services.

81. **Each idea once per page, varied across pages.** PASS if no idea or catchphrase repeats (e.g. the same staff-role line many times). [Nov 16 Josh] Pages: all.

82. **Trade knowledge is specific and tight.** PASS if it fits this business's services and area and is not filler; 700 words come from substance, never padding. [Nov 16 Josh] Pages: services.

83. **Review-inferred details are hedged and not repeated.** PASS if visit process and reply speed read "usually"/"often", never as policy, and appear once; absolute claims copied from their site are hedged. [Nov 16 Josh] Pages: all.

84. **Home sections are not thin.** PASS if no home section is a one-line body plus quotes; each has real content or is cut. [Nov 16 Josh] Pages: home.

85. **Logged conflicts do not leak into copy.** PASS if a search of the copy for every conflict logged in Notes finds none in the FAQ, hero line, or a quote under a contradicting heading. [Nov 16 Josh] Pages: all.

86. **Unbacked credentials are not asserted.** PASS if anything inventory marks as not on their site or contradicted is cut or in "What we'd confirm", never a flat assertion; their own-site claims said as theirs are fine. [Nov 16 Josh] Pages: all.

87. **One idea, one place across the doc.** PASS if no idea repeats anywhere (repair-or-replace line, insurer-decides line, same tech explainer). [Nov 16 Josh] Pages: all.

88. **Homeowner jargon is plain.** PASS if TPO, EPDM, curbs, coping, "soft metals", soffit, fascia and similar have a plain word or quick explanation. [Nov 16 Josh] Pages: home, services.

89. **No website talk on Contact.** PASS if Contact has no "the form asks…" or "send the form any hour" lines. [Nov 16 Josh] Pages: contact.

90. **Case studies and portfolio jobs are used or logged.** PASS if each one on their site appears in the copy or has a reason in Notes. [Nov 16 Josh] Pages: all.

91. **Trade knowledge is not a DIY manual.** PASS if step-by-step homeowner instructions are cut to essentials. [Nov 16 Josh] Pages: services.

92. **"What we'd confirm" is 3-4 single questions**, not bundles. [Nov 16 Josh] Pages: strategy.

93. **No thin sections or quote runs.** PASS if no section is two sentences plus a quote (real content or cut) and no three sections in a row each end in a quote. [Nov 16 Josh] Pages: all.

---

## Reviewer table (copy per demo)

Verdict line: **SEND-READY** or **NOT YET**. Any FAIL means NOT YET. One row per item per page it applies to. Evidence is a quote from the page (or the filename and reference line for photos); "none found" is only valid for a PASS on an absence test, with the search terms used.

| Item # | Page | PASS/FAIL | Evidence (quote) |
|---|---|---|---|
| 1 | home | | |
| 1 | service 1 | | |
| 1 | service 2 | | |
| 1 | contact | | |
| 1 | strategy | | |
| 45 | home | | |
| 50 | home hero | | |
| 72 | outreach | | |
| (continue for every item) | | | |
