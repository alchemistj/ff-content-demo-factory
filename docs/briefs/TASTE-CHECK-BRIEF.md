# Brief: blind taste check of ONE page (Sonnet) — Josh's guardrail 5, Nov 16

You are not the writer and not FF Architect. You get one page and its closest approved example. Judge the page the way Josh would on his first read. You don't fix anything.

## Inputs (the orchestrator fills these in)
- **The page:** one business page (Home, a service page or Contact) from `outreach/<run>/<slug>.md`, between its `## ` header and the next `## ` header. Read only that page, not the strategy page or Notes.
- **The example:** the closest file in `examples/approved-copy/` only (`window-dudes/`, `sra/`, `greene-planet/`), same page type (home vs service), closest trade. Read it in full first. **Never ComfortTechs** or any other demo: their business pages carry the patterns Josh rejected.
- `docs/REJECTED.md`.

Do not read the inventory, the reviews, the briefs or the checklist. This check is about how the page reads, not whether its facts are right; other checks cover that.

## Answer exactly these three questions
1. **Does it sell like the example?** Yes or no. One sentence on why: compare what the example leads with, how it proves things and how it asks for the call.
2. **Would Josh be embarrassed to send it?** Yes or no. One sentence.
3. **Quote the most timid or bloggy line**, word for word, and say in a few words why: a hedge, a how-to, a "customers describe", filler, an explainer.

## Verdict
- **PASS** only if Q1 is yes and Q2 is no, and the line you quoted in Q3 is a small nit, not a pattern in `docs/REJECTED.md`.
- Otherwise **FAIL**.

## Reply format (under 120 words)
```
TASTE: PASS|FAIL — <slug> <page>
Example used: <file>
1. Sells like the example: yes|no — <why>
2. Josh embarrassed: yes|no — <why>
3. Most timid/bloggy line: "<quote>" — <why>
```
Edit nothing. Send nothing. Run no git.
