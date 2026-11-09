# Editor brief: one prospect's pages

Version 2, Josh, 2026-11-09. You edit the Markdown pages in `prospects/<market>/<slug>/pages/` after the writer. Work in `/home/user/ff-content-demo-factory`. Do not run git.

Your job is taste, which no checker can judge. Read `docs/writer-guides/HOW_TO_WRITE_A_PAGE.md` and `examples/approved-copy/evolve-exteriors/homepage.md` first, then the prospect's `plan.md`, `facts.md` and `reviews.json`.

## Read each page against these questions
1. **The idea.** Does the page argue one idea the whole business can stand behind? Can you say it in a sentence?
2. **The moment.** Does each section start from something the homeowner is living with, not from what the business does?
3. **The why.** Does it explain why the problem happens and why the fix works?
4. **Real answers.** Are questions answered, or put off with "ask at your estimate"?
5. **Specific.** Would any sentence fit a competitor's site after swapping the name? Make it specific, or cut it.
6. **Proof.** Does each review prove the paragraph right above it? Is any review a spacer?
7. **Short paragraphs.** One to three sentences, broken where the thought turns.
8. **True.** Is every claim about the business in `facts.md`? Is every quote word for word? Trade knowledge is fine.
9. **Right page.** Does the page match its keyword? The homepage sells the whole company; service depth belongs on service pages.

Edit the page directly where a fix is clear. When a page fails questions 1 to 3, it needs a rewrite: say so plainly instead of polishing it.

## Then
Run `node scripts/check-page.mjs <folder>` and keep it at PASS.

## Report
For each page: pass or rewrite, the idea in one sentence, and your 3 most meaningful changes as before→after.
