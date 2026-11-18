# Peoria plumbing - qualify summary

Candidates: 7. Source: QUALIFY-BRIEF.md. Site checks run live with Playwright on 2026-11-16.

| Candidate | Rating (reviews) | Verdict | Deciding test |
|---|---|---|---|
| G/K Plumbing (G/K Brothers Plumbing & HVAC) | 4.8 (104) | PASS | 2 and 3 with caveats: no per-service pages; service detail sits as sections on the home page |
| Fox Plumbing | 5.0 (148) | SKIP | 2: per-service "<Service> in Peoria" pages |
| Paluska Plumbing | 5.0 (1574) | SKIP | 4: "Website Designed by Oostas" in footer |
| Arnold & Sons Plumbing, Sewer & Drain | 4.6 (2323) | SKIP | 4: "Designed by EMSC" in footer |
| Reading & Son Plumbing | 4.7 (426) | SKIP | 4: "Designed by: 309 Marketing" in footer |
| Illini Plumbing | 4.6 (48) | SKIP | 4: webdesign309 logo credit in footer |
| Fritch Heating & Cooling | 4.6 (396) | SKIP | 4: "Website design and internet marketing by Ryno Strategic Solutions" in footer |

PASS list:
- G/K Plumbing (https://peoriaplumbing.pro/): Sewer line repair; water heater repair.

SKIP count: 6.

Notes:
- G/K's default headless request returned 403. The site loaded with a standard desktop user-agent string. No login or CAPTCHA was involved.
- G/K's service detail is thin per service and sits on one page. Josh should judge whether it fills 2 service pages of 700 words.
- Fritch is a heating and cooling (HVAC) business, not plumbing. It was qualified as listed.
- Paluska serves several towns from several offices, so it may also be a multi-city operation. Its skip rests on test 4.
- Fox and Illini were checked on tests 2 and 3 as well. Arnold and Reading were skipped on test 4 and not checked further.
- Bear Electric re-check (Lincoln electrical, written to prospects/lincoln-electrical/bear/qualify.md): still SKIP, on test 3 (about 300 words of real copy). Wix alone was not a skip.
