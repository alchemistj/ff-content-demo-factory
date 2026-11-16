# Batches (Josh's guardrail 1: the 3-doc hold)

`scripts/gate.py <prospect folder> <batch>` records each admitted business in `<batch>.txt`. Its first line is the DOC-WRITE-BRIEF commit the batch runs on.

- After 3 docs, the gate BLOCKS the batch until Josh approves them. Josh, or FF Architect quoting Josh's own words, creates `<batch>.JOSH-APPROVED`. Put the date and Josh's words in the file.
- If DOC-WRITE-BRIEF.md changes mid-batch, the gate BLOCKS. Start a new batch name, which gets its own 3-doc hold. This is "no rule changes mid-run".
- Name batches `<date>-<letter>`, e.g. `2026-11-17-a`.
