# Guide gaps

Architects add a line here when a guide is missing something or contradicts itself: what, which guide, the example. The guide owner folds it in.

- **Scouts cancel each other** (ARCHITECT-BRIEF step 1, `.github/workflows/prospect-scout.yml`). The `scout-data` concurrency group keeps only the newest pending run, so when several Architects dispatch at once, earlier waiting runs are cancelled silently (runs 11, 12, 13, 14 on 2026-11-09). Example: wichita-electrical's scout (run 12) was cancelled; re-dispatched after the queue cleared. Same risk on `review-pull.yml`. Check the run's conclusion after dispatching.
- **Apify credit runs out mid-batch** (ARCHITECT-BRIEF step 4, `review-pull.yml`). On 2026-11-09 the 4th review pull for wichita-electrical (Linnebur) failed with Apify HTTP 402 ("remaining usage of $0.435205 this billing cycle isn't enough"). The brief has no fallback for a pick with no reviews.json; check-page needs the file. Example: run 42676627406.
