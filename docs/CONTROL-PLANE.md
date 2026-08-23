# Content Demo Factory control plane

`run-one` is an Architect-invoked, queue-first entry point. It persists one
capacity slot (`productionCapacity: 1`) and claims at most one prospect. The
state model already has a queue and run collection so capacity can later grow
to 2 or 4 without changing stage identity.

The durable run stages are:

`candidate-qualification` → `finalist-enrichment` → `review-intelligence` →
`page-prescription` → `architect-qa` → `awaiting-human-gate-1`.

Stage transitions are monotonic. Paid boundaries carry receipts in `paidWork`,
and an interrupted run retains its stage and receipts for resumption. The
process lock prevents two `run-one` invocations from mutating state together;
the persisted lease identifies which Architect worker owns the next action.

The production path has no GitHub Actions dependency, and it intentionally has
no copy generation, client build, hosting, deploy, outreach, or later human
gates. These are explicit scope boundaries for this first release and must not
be introduced into the control plane.

Integration contract for later lanes:

- use `src/factory/control-plane.js` for queue/claim/transition/interrupt;
- persist paid work only after the external result has a stable receipt;
- never call finalist enrichment for a queued non-finalist;
- stop at `awaiting-human-gate-1` and treat a repeat wake as idempotent;
- keep `CURSOR_MODEL=cursor-grok-4.6-high` and Fast off;
- enforce mold exclusion before paid work.
