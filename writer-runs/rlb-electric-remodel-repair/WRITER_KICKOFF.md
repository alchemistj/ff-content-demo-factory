# Writer kickoff

Work on branch:

`writer/rlb-electric-clean-room-v2`

Your assignment is fully specified in:

`writer-runs/rlb-electric-remodel-repair/WRITER_TASK.md`

Read that file first and follow it end to end.

Important:

- This is a clean-room rewrite from original evidence and the already-approved RLB page plan.
- Do not inspect PR #25, branch `claude/rlb-electric-writer-test`, commit `48e4db8b8de0f5006b922e9b7e6892b1165a17e9`, or any previously authored RLB copy.
- Materialize the approved immutable RLB inputs only by running:

```bash
node scripts/materialize-rlb-clean-room-inputs.mjs
```

- One writer owns the entire package in one run.
- Produce the complete canonical output at:

`writer-runs/rlb-electric-remodel-repair/output/writing-package.json`

- Do not redesign the factory or build the website.
- Commit your finished writing package and validation evidence to this same branch.
- Josh is the editorial quality gate; do not self-approve the prose.
