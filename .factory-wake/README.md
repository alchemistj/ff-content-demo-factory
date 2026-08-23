# Architect wake controls

Josh never operates GitHub Actions. Architect automation wakes the factory by
committing only the control files below to `main`; the trusted workflow runs one
capacity-one cycle, uploads a verified checkpoint, and stops for Architect or
Human Gate 1 review.

The wake commit must be authored by the repository owner and may change only:

- `.factory-wake/control.json`
- `.factory-wake/request.json`
- `.factory-wake/decision.json`

Fresh Stage 1 control:

```json
{
  "wakeId": "unique-architect-id",
  "mode": "stage1",
  "requestFile": ".factory-wake/request.json",
  "requestedBy": "architect"
}
```

Selection or QA control:

```json
{
  "wakeId": "unique-architect-id",
  "mode": "selection",
  "restoreFromRunId": "123456789",
  "decisionFile": ".factory-wake/decision.json",
  "requestedBy": "architect"
}
```

Architect automation must inspect each uploaded artifact and supply the exact
`restoreFromRunId`; the workflow never selects the latest run or chains another
wake automatically.
