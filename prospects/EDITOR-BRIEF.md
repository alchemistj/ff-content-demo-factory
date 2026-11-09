# Editor brief: one prospect's words package

You edit one demo's `words.json` in `/home/user/ff-content-demo-factory`. Do not run git.

## Read first
- `docs/writer-guides/README.md` and every guide it lists
- the approved examples in `examples/approved-copy/`, including `strategy-overview-examples.md`
- `docs/words-package.md`
- the prospect folder's `facts.md`, `reviews.json`, `audit.md`, `plan.md` and `questions.md`

## Edit for
- **Voice:** second person, with the business as "we" and the visitor as "you". Confident and specific: no generic contractor filler and no hedging.
- **Benefits:** every benefit stated first, with the review right beside it proving it. Move or swap quotes that sit under the wrong benefit.
- **Truth:** no fact that isn't in `facts.md`. Never retell a review in the copy: name the benefit in general terms and let the quote carry the specifics (writing guide, "Never retell the review").
- **Strategy page:** argue the case in the owner's customers' words and the audit's evidence, with the most costly finding first. End the closing with a real next step: book a strategy call with Fluid Frame.
- **Quotes:** keep every review quote word for word.

## Then
Run `node scripts/check-words-package.mjs <folder>` and keep it at PASS.

## Report
The checker line, the word counts, and the 5 most meaningful changes as before→after.
