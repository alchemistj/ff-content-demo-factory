# RLB input provenance

This folder is a clean-room writer input packet assembled for the Claude writer test.

## Imported upstream authority

### Exact-place review inventory

Source repository: `alchemistj/ff-2-demos`  
Source PR: `#161`  
Source head: `a389a9c428df199b9cb203a356f84292b36bf044`  
Source path: `factory-runs/rlb-electric-remodel-repair/review-inventory.json`

The upstream inventory records Google Place ID `ChIJt4A_O26JxYcRFWiYP7cPk-U`, 68 listing reviews, 44 retrieved written reviews, and a 4.9 listing rating. Its review classifications remain exactly as upstream; this import does not promote or rewrite them.

### Approved prescription and facts

Source repository: `alchemistj/ff-2-demos`  
Approval/copy-lineage PR: `#167`  
Exact source head: `252d36fd886ed17067ea0800c84e4981db5ab2b5`

Imported paths only:

- `factory-runs/rlb-electric-remodel-repair/strategy-recipe.json`
- `factory-runs/rlb-electric-remodel-repair/confirmed-facts.json`
- `factory-runs/rlb-electric-remodel-repair/prescription-approval.json`

`prescription-approval.json` records `authorized: true`, `recordedJoshApproval: true`, and the approval method `architect-recording-josh`.

There was no separate standalone RLB `current-site-audit.json` in this imported lineage. Current-site evidence needed by the writer is embedded in the approved `strategy-recipe.json` and sourced facts. Do not invent a replacement audit artifact.

## Intentionally excluded contamination

No authored copy from FF2 PR #167 was imported. In particular, this branch intentionally excludes:

- `copy-artifact.json`
- `copy-blueprint.json`
- `copy-evidence.json`
- `copy-pages/**`
- `copy-review.md`
- `copy-sitewide/**`
- copy quality / render-binding artifacts

Those are historical writer outputs, not evidence for this clean-room experiment.

The canonical writing authority for this test is the repo-native Markdown guide set under `docs/writer-guides/` on this branch.
