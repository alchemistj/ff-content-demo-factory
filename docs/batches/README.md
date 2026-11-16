# The 3-doc hold (Josh's guardrail 1)

The hold is keyed to the **briefs version**, not the batch name, so splitting a run into many small batches can't dodge it. The version is the latest commit touching any of: DOC-WRITE-BRIEF, DOC-CHECK-BRIEF, TASTE-CHECK-BRIEF, REJECTED.md, FULL_BUILD_LINES.md (`python3 scripts/gate.py --version`).

- `brief-<sha>.txt`: every doc admitted under that version, with its batch name (written by gate.py).
- Under each version, the first 3 docs may proceed. After that, gate.py needs `brief-<sha>.JOSH-APPROVED`, holding:
  ```
  Josh said: "<his exact words>"
  Where: <session or channel>, <date and time>
  max_docs: <N>
  ```
  An empty or incomplete file is refused. Past `max_docs`, a new approval is needed.
- Any change to those files is a new version, with its own 3-doc hold ("no rule changes mid-run"). Uncommitted changes BLOCK.
