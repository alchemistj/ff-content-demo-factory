# D2D intake operator setup

Secret-bearing work already runs as trusted local CLI plus GitHub Actions on `main` (see Google Docs). Raw D2D geographic intake uses the smallest production-sensible boundary that still fails closed:

1. **Library** — `acceptD2dIntake()` is the canonical implementation.
2. **Authenticated HTTP handler** — `POST /d2d-factory-intake/v1` with `Authorization: Bearer <token>`. Local bind `127.0.0.1`. Production Vercel public URL is `https://factory.fluidframemarketing.com/d2d-factory-intake/v1` (see [`VERCEL.md`](VERCEL.md)).
3. **CLI** — `npm run d2d-intake` for operators and trusted local automation.

This PR does **not** deploy Production, attach the custom domain, set provider secrets, apply Production migrations, or run live D2D/Apify batches.

D2D delivers a **raw/normalized Google Business / Apify cohort** (`version: d2d-factory-intake/v1`, companion PR #5 head `fe5b74f5f1059af2808e61a0b13755ead55999a5`). Content Factory owns qualification via candidate-bench + website/opportunity evidence. Do not configure D2D to prequalify a 4–7 demo shortlist for this path.

## Environment variables

| Name | Required | Role |
| --- | --- | --- |
| `D2D_INTAKE_SHARED_SECRET` | yes | Shared secret. Same value as D2D `CONTENT_FACTORY_INTAKE_SECRET`. If unset/blank, ingress fails closed (`AUTH_NOT_CONFIGURED`, HTTP 503) before mapping, qualification, or adapters |
| `D2D_INTAKE_TOKEN` | CLI | Presented token; must match the shared secret. HTTP clients send `Authorization: Bearer` |
| `D2D_INTAKE_STATE_DIR` | CLI / local | File-backed receipt + workflow state. Default `.d2d-intake-state/` (gitignored). **Not used on Vercel** |
| `D2D_INTAKE_HOST` | serve | Bind host. Default `127.0.0.1` |
| `D2D_INTAKE_PORT` | serve | Bind port. Default `8787` |
| `D2D_INTAKE_MAX_BATCH` | no | Operator cohort ceiling. Default `40`. Not a historical 7-item cap |
| `D2D_INTAKE_ADAPTERS_MODULE` | local advanced runs | Module exporting `createFactoryAdapters()`. **Not used on Vercel**; production uses `FACTORY_*` env vars |
| `D2D_INTAKE_SUPABASE_URL` / `SUPABASE_URL` | Vercel | Durable store URL. Missing on Vercel → `DURABLE_STORE_NOT_CONFIGURED` before qualifier/model spend |
| `D2D_INTAKE_SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Vercel | Durable store service role |
| `FACTORY_RESEARCH_PROVIDER` / `FACTORY_RESEARCH_MODEL` | advanced on Vercel | Env-driven research provider and model. Both required for research readiness |
| `FACTORY_PRESCRIPTION_PROVIDER` / `FACTORY_PRESCRIPTION_MODEL` | optional | Defaults to research provider/model. Readiness still requires an effective provider, model, and key |
| `FACTORY_MODEL_API_KEY` | advanced on Vercel | Provider key. Health checks presence only; it does not call the provider |
| `FACTORY_MODEL_BASE_URL` | optional | OpenAI-compatible base. Default `https://api.openai.com/v1` |

Production Vercel setup, custom domain, and D2D `CONTENT_FACTORY_INTAKE_URL` are in [`VERCEL.md`](VERCEL.md).

Do not put the shared secret in repository files, workflow `pull_request` jobs, or client-side D2D UI.

## Fail closed

- Missing server secret → no qualification, no model calls, HTTP 503
- Vercel/production missing Supabase URL/service role → `DURABLE_STORE_NOT_CONFIGURED`, HTTP 503, no filesystem/memory fallback, no qualifier/model spend
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
