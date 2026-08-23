# Acceptance matrix

Run with `node --test test/acceptance-matrix.test.js` (or `node --test` for
the complete suite). Each row maps one packet condition to an executable test;
the tests call the integrated control-plane, orchestrator, evidence, and Gate 1
contracts rather than reimplementing production logic.

| ID | Condition | Executable test |
| --- | --- | --- |
| AC01 | Capacity exactly 1 | `AC01 production capacity is exactly one` |
| AC02 | Architect can initiate run | `AC02 Architect can initiate run-one without Actions` |
| AC03 | No Actions trigger | `AC03 production path has no GitHub Actions trigger` |
| AC04 | Small bench, one finalist | `AC04 cheap candidate bench is audited and requires one explicit finalist` |
| AC05 | Only finalist gets paid enrichment | `AC05 only selected finalist receives paid deep enrichment` |
| AC06 | Up to 50, no date window | `AC06 finalist enrichment asks for at most 50 reviews with no date window` |
| AC07 | Sample-only prescription refused | `AC07 page prescriber rejects discovery-sample-only inventory` |
| AC08 | RLB anchors non-zero | `AC08 RLB 44-review fixture produces authoritative anchors` |
| AC09 | Direct anchors reach comparison | `AC09 direct completed-service anchors reach page comparison` |
| AC10 | Valid first-review recommendations | `AC10 every eligible evidence-backed sales page gets a valid first-review recommendation` |
| AC11 | Collision validation | `AC11 URL, keyword, title, and H1 collisions are rejected` |
| AC11b | Unsupported affirmative guarantees | `AC11b unsupported affirmative guarantees are rejected while warning traps remain allowed` |
| AC12 | Compact Gate 1 artifact | `AC12 Gate 1 produces compact boss-readable Markdown` |
| AC13 | No copy generation | `AC13 no copy generation starts` |
| AC14 | No client build | `AC14 no client build starts` |
| AC15 | Stops at Gate 1 | `AC15 completed cycle stops at awaiting-human-gate-1` |
| AC16 | Gate 1 repeat is locked/idempotent | `AC16 repeat wake at Gate 1 does not claim another run` |
| AC17 | Interruption resumes without duplicate paid work | `AC17 interruption resumes without repeating valid paid enrichment` |
| AC18 | Mold blocked | `AC18 mold prospect cannot advance to paid work` |
| AC19 | No historical provider defaults | `AC19 checked-in environment excludes historical provider defaults` |
| AC20 | Exact Cursor alias/Fast off | `AC20 Cursor alias is exact and Fast is off` |

Negative boundaries are intentional: Actions/workflow presence, sample-only
input, duplicate finalist enrichment, collisions, Gate 1 re-entry, mold
advance, unsupported guarantees, wrong env defaults, and wrong model settings
must fail or stop closed.

The matrix is offline contract QA. It does not prove a paid vendor call. Only a
controlled live canary with configured Apify/Cursor credentials, real finalist
enrichment, real review judgment, and Architect inspection proves vendor
execution; that canary must still stop at Human Gate 1.
