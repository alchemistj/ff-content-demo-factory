# Guide gaps

Architects add a line here when a guide is missing something or contradicts itself: what, which guide, the example. The guide owner folds it in.

- **ARCHITECT-BRIEF.md steps 1 and 4 (scout and review pulls), wichita-cleaning, 2026-11-09:** `prospect-scout.yml` and `review-pull.yml` use one concurrency group each with `cancel-in-progress: false`, but GitHub still keeps only one *pending* run per group, so a newer dispatch cancels the older waiting one. With several Architects running, my first commercial-cleaning scout was cancelled silently. The brief could say: dispatch one run at a time and wait for its data to land before the next, or the workflows could use a per-slug group.

