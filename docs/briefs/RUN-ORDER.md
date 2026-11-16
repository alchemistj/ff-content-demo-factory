# Run order for every demo doc (Josh's demo guardrails, Nov 16)

The orchestrator (FF Architect or the content factory session) runs these steps in order for each business. A step that fails stops that business. Nobody skips or overrides a step.

1. **Gate.** `python3 scripts/gate.py prospects/<folder> <batch>`. Spawn the writer only on GO. The writer runs it again as its own first step (DOC-WRITE-BRIEF.md), so a writer started without the gate still stops.
2. **Write.** Sonnet, `DOC-WRITE-BRIEF.md`. Notes line 1: `Written from DOC-WRITE-BRIEF @ <sha>`.
3. **Mechanical checks.** `python3 scripts/check-rejected.py <file>` and `python3 scripts/check-repeats.py <file>`. Both must show no FAIL.
4. **Check.** A separate Sonnet, `DOC-CHECK-BRIEF.md`.
5. **Taste check.** Another separate Sonnet, `TASTE-CHECK-BRIEF.md`, once per business page (Home, both service pages). Any FAIL goes back to step 2 for that page.
6. **Strategy pass.** `STRATEGY-PASS-BRIEF.md` (strategy page only).
7. **Google Doc.** Only after 3–6 pass. Re-run steps 3 and 5 after any edit.

No count targets and no deadlines by number (guardrail 6). If a rule looks wrong mid-run, stop and ask Josh. Never send writers a new instruction that isn't committed to the brief (guardrail 3). Only FF Architect reports status to Josh (guardrail 7).
