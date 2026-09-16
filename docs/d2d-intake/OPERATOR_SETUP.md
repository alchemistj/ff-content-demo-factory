# D2D intake operator setup

This repository has no always-on HTTP service, queue, or Kubernetes runtime. Secret-bearing work already runs as trusted local CLI plus GitHub Actions on `main` (see Google Docs). Raw D2D geographic intake uses the smallest production-sensible boundary that still fails closed:

1. **Library** — `acceptD2dIntake()` is the canonical implementation.
2. **Authenticated native HTTP handler** — `POST /d2d-factory-intake/v1` with `Authorization: Bearer <token>`. Default bind `127.0.0.1`.
3. **CLI** — `npm run d2d-intake` for operators and trusted automation.

D2D delivers a **raw/normalized Google Business / Apify cohort** (`schema: d2d-factory-raw-export/v1`). Content Factory owns qualification via candidate-bench + website/opportunity evidence. Do not configure D2D to prequalify a 4–7 demo shortlist for this path.

This PR does **not** deploy Production, set provider secrets, or run live D2D/Apify batches.

## Environment variables

| Name | Required | Role |
| --- | --- | --- |
| `D2D_INTAKE_SHARED_SECRET` | yes | Shared secret. If unset/blank, ingress fails closed (`AUTH_NOT_CONFIGURED`, HTTP 503) before mapping, qualification, or adapters |
| `D2D_INTAKE_TOKEN` | CLI | Presented token; must match the shared secret. HTTP clients send `Authorization: Bearer` |
| `D2D_INTAKE_STATE_DIR` | CLI | Durable receipt + workflow state directory. Default `.d2d-intake-state/` (gitignored) |
| `D2D_INTAKE_HOST` | serve | Bind host. Default `127.0.0.1` |
| `D2D_INTAKE_PORT` | serve | Bind port. Default `8787` |
| `D2D_INTAKE_MAX_BATCH` | no | Operator cohort ceiling. Default `40`. Not a historical 7-item cap |
| `D2D_INTAKE_ADAPTERS_MODULE` | advanced runs | Module exporting `createFactoryAdapters()`. Held/rejected records do not need it; advanced businesses require research/prescription adapters |

Do not put the shared secret in repository files, workflow `pull_request` jobs, or client-side D2D UI.

## Fail closed

- Missing server secret → no qualification, no model calls, HTTP 503
- Missing/invalid bearer token → HTTP 401, no model calls
- Inherited D2D qualification conclusions → `invalid` / `INHERITED_CONCLUSION`; they cannot advance a business
- Missing optional listing fields stay empty; factory may `held` them. No invented website/phone/address
- Writer and website-copy publication are forbidden inside intake

## CLI

```bash
export D2D_INTAKE_SHARED_SECRET="..."   # not committed
export D2D_INTAKE_TOKEN="$D2D_INTAKE_SHARED_SECRET"
export D2D_INTAKE_ADAPTERS_MODULE="/absolute/path/to/factory-adapters.mjs"

npm run d2d-intake -- --payload ./d2d-export.json --receipt-out ./receipt.json
npm run d2d-intake -- --status --prospect-id d2d-prospect-northline
npm run d2d-intake -- --status --business-id src-northline
npm run d2d-intake -- serve
```

After Gate 1, human prescription approval, Google Docs retry, writing, and copy QA stay on the existing factory:

```ts
import { runFactory, retryPublication } from "ff-content-demo-factory/workflow";
```
