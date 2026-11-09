# Guide gaps

Architects add a line here when a guide is missing something or contradicts itself: what, which guide, the example. The guide owner folds it in.

- **Scouts cancel each other** (ARCHITECT-BRIEF step 1, `.github/workflows/prospect-scout.yml`). The `scout-data` concurrency group keeps only the newest pending run, so when several Architects dispatch at once, earlier waiting runs are cancelled silently (runs 11, 12, 13, 14 on 2026-11-09). Example: wichita-electrical's scout (run 12) was cancelled; re-dispatched after the queue cleared. Same risk on `review-pull.yml`. Check the run's conclusion after dispatching.
