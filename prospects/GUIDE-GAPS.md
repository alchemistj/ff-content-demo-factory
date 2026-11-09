# Guide gaps

Architects add a line here when a guide is missing something or contradicts itself: what, which guide, the example. The guide owner folds it in.

- **Storm/hail damage as a service page (roofing).** KEYWORD_GUIDE.md section 5 (Roofing) says avoid "Storm Damage Repair" as a service page (too narrow), but `prospects/wichita-roofing/BRIEF.md` step 5 offers "roof repair or storm and hail damage repair" as the second page. Wichita roofers lean heavily on hail claims. Example: ICT Roofing & Exteriors has an Insurance page and leads with claims. For now the Wichita roofing plans use Roof Replacement + Roof Repair and cover hail/insurance inside them. (Wichita roofing Architect, 2026-11-09)
- **Review pull workflow reports failure after success.** `.github/workflows/review-pull.yml`: the pull step ends with `PIPESTATUS[1]: unbound variable`, so the run shows red, yet the reviews are committed to `review-data`. Also, queuing several pulls at once cancels all but the newest pending run (concurrency group), so pulls must be queued one at a time. Example: runs 67 to 70 on 2026-11-09. Not a writer guide, but Architects trip on it. (Wichita roofing Architect, 2026-11-09)

