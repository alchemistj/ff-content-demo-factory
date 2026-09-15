# D2D intake operator setup

This repository has no always-on HTTP service, queue, or Kubernetes runtime. Secret-bearing work already runs as trusted local CLI plus GitHub Actions on `main` (see Google Docs). D2D intake uses the smallest production-sensible boundary that still fails closed:

1. **Library** — `acceptD2dIntake()` is the canonical implementation. Tests and any future adapter call it.
2. **Authenticated native HTTP handler** — `POST /d2d-factory-intake/v1` with `Authorization: Bearer <token>`. No Express. Bind defaults to `127.0.0.1`.
3. **CLI** — `npm run d2d-intake` for operators and trusted automation that already hold the shared secret.

A GitHub Actions webhook was not chosen as the D2D request/response surface. Actions here are batch/human jobs (Google Docs publish/approve), not a synchronous per-prospect receipt API. A new queue or public anonymous endpoint would spend model resources without the existing auth pattern.

This PR does **not** deploy Production, set provider secrets, or run live D2D/Apify batches.

## Environment variables

| Name | Required | Role |
| --- | --- | --- |
| `D2D_INTAKE_SHARED_SECRET` | yes | Shared secret. If unset/blank, ingress fails closed (`AUTH_NOT_CONFIGURED`, HTTP 503) before mapping or adapters |
| `D2D_INTAKE_TOKEN` | CLI | Presented token; must match the shared secret. HTTP clients send `Authorization: Bearer` |
| `D2D_INTAKE_STATE_DIR` | CLI | Durable receipt + workflow state directory. Default `.d2d-intake-state/` (gitignored) |
| `D2D_INTAKE_HOST` | serve | Bind host. Default `127.0.0.1` |
| `D2D_INTAKE_PORT` | serve | Bind port. Default `8787` |
| `D2D_INTAKE_ADAPTERS_MODULE` | accepted runs | Module exporting `createFactoryAdapters()`. If unset, held mapping still works; accepted prospects return `retryable` until research/prescription adapters are wired |

Do not put the shared secret in repository files, workflow `pull_request` jobs, or client-side D2D UI.

## Fail closed

- Missing server secret → no mapping, no model calls, HTTP 503
- Missing/invalid bearer token → HTTP 401, no model calls
- Missing/partial NAP or identity → `held` with a specific `reasonCode`; no invented website/phone/address/trade/service area
- Writer and website-copy publication are forbidden inside intake even if a caller later tries to pass prescription approval through this entrypoint

## CLI

```bash
export D2D_INTAKE_SHARED_SECRET="..."   # not committed
export D2D_INTAKE_TOKEN="$D2D_INTAKE_SHARED_SECRET"
export D2D_INTAKE_ADAPTERS_MODULE="/absolute/path/to/factory-adapters.mjs"

npm run d2d-intake -- --payload ./d2d-export.json --receipt-out ./receipt.json
npm run d2d-intake -- --status --prospect-id prospect-northline
npm run d2d-intake -- serve
```

`createFactoryAdapters()` must return the existing `FactoryAdapters` shape (`researcher`, `prescriber`, `writer`). Intake will not start the writer.

## After Gate 1

Human prescription approval, Google Docs retry, writing, and copy QA stay on the existing factory:

```ts
import { runFactory, retryPublication } from "ff-content-demo-factory/workflow";
```

Intake records `sourceCorrelation` on workflow state so D2D campaign/run/export/prospect IDs remain available for reconciliation.
