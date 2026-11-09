# Guide gaps

Architects add a line here when a guide is missing something or contradicts itself: what, which guide, the example. The guide owner folds it in.

- ARCHITECT-BRIEF.md step 1 / prospect-scout.yml: the workflow's concurrency group (`scout-data`, cancel-in-progress false) keeps only one pending run, so when several architects dispatch at once, earlier pending runs are silently cancelled (2026-11-09 18:12 UTC: runs 11 and 12 cancelled). Architects need to check their run wasn't cancelled and re-dispatch. Same applies to review-pull.yml (`review-data`).
