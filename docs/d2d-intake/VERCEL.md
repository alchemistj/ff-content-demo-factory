# Vercel production receiver (deployment wiring)

This document is **setup only**. This PR does not create a Vercel project, attach `factory.fluidframemarketing.com`, set secrets, apply Production migrations, or run live Apify/model work.

Content Factory is the HTTP receiver for D2D at:

```text
CONTENT_FACTORY_INTAKE_URL=https://factory.fluidframemarketing.com/d2d-factory-intake/v1
```

Public path is `/d2d-factory-intake/v1`. Vercel Node functions live under `/api/*`; `vercel.json` rewrites the public path onto `api/d2d-intake/[[...path]].ts`. The handler remaps `/api/d2d-intake` back to `/d2d-factory-intake/v1` and reuses `handleD2dIntakeRequest()` / `acceptD2dIntake()`.

There is **no cron or scheduler**. The service is request-driven only.

## Vercel project (Josh retains)

1. Create or select a Vercel project from this repository. Node **22**.
2. Attach custom domain `factory.fluidframemarketing.com`.
3. Set Production environment variables below. Do not commit values.
4. Apply `supabase/migrations/20260916120000_d2d_intake_durable_state.sql` to the Production Supabase project **only when Josh authorizes a migration**. This PR prepares the schema; it does not apply it.
5. Point D2D Production at the public URL above. Shared secret on D2D must equal the secret here.

## Environment variables

### Auth (required)

| Content Factory | D2D companion | Role |
| --- | --- | --- |
| `D2D_INTAKE_SHARED_SECRET` | `CONTENT_FACTORY_INTAKE_SECRET` | Same bearer secret. `Authorization: Bearer <secret>` |

If `D2D_INTAKE_SHARED_SECRET` is missing, intake returns `AUTH_NOT_CONFIGURED` (HTTP 503) and spends no qualifier/model work.

### Durable store (required on Vercel)

Vercel sets `VERCEL=1`. That runtime **must not** fall back to `.d2d-intake-state/` or in-memory maps.

| Name | Also accepted | Role |
| --- | --- | --- |
| `D2D_INTAKE_SUPABASE_URL` | `SUPABASE_URL` | Supabase project URL |
| `D2D_INTAKE_SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | Service role. Bypasses RLS. Never expose to D2D or the browser |

Missing durable-store config returns HTTP 503 `DURABLE_STORE_NOT_CONFIGURED` **before** qualification, research, or prescription.

Do not put the service role key in client-side D2D, `pull_request` jobs, or repository files. Tables have RLS enabled and **no anon/authenticated policies**.

Optional: `D2D_INTAKE_RUNTIME=production` forces the same fail-closed durable path outside Vercel.

### Research / prescription adapters (env, not a local file)

`D2D_INTAKE_ADAPTERS_MODULE` is a **local CLI** escape hatch. Vercel does not load a filesystem module path.

| Name | Role |
| --- | --- |
| `FACTORY_RESEARCH_PROVIDER` | Provider name recorded on the researcher |
| `FACTORY_RESEARCH_MODEL` | Model id for research JSON complete |
| `FACTORY_PRESCRIPTION_PROVIDER` | Optional; defaults to research provider |
| `FACTORY_PRESCRIPTION_MODEL` | Optional; defaults to research model |
| `FACTORY_MODEL_API_KEY` | Provider API key. Health checks presence only; it does not call the provider |
| `FACTORY_MODEL_BASE_URL` | Optional OpenAI-compatible base. Default `https://api.openai.com/v1` |

Held/rejected listings still do not invoke adapters. Advanced businesses require provider + model + key. Missing or literal `unconfigured` model is not ready and fails closed locally before any provider HTTP. Writer remains forbidden before Human Gate 1 (`WRITER_BEFORE_GATE_FORBIDDEN`).

Optional Google Docs publisher vars stay as documented in `docs/google-docs/OPERATOR_SETUP.md`. Intake still stops at Gate 1 even if Google is configured.

### Optional operator

| Name | Role |
| --- | --- |
| `D2D_INTAKE_MAX_BATCH` | Operator cohort ceiling. Default `40` |

## Health

Unauthenticated liveness:

```text
GET https://factory.fluidframemarketing.com/health
GET https://factory.fluidframemarketing.com/api/health
```

Returns HTTP 200 with `{ ok, service, path, domain, runtime, ready, requestDriven, scheduler }` when the function is alive. `ready` is booleans only (shared secret present, durable-store env present, research/prescription provider+model+key present). Prescription falls back to the research provider/model when its own vars are omitted. Missing model reports `researchAdapter`/`prescriptionAdapter` false. Health does **not** call providers, Apify, or Supabase.

## D2D Production setting

```bash
CONTENT_FACTORY_INTAKE_URL=https://factory.fluidframemarketing.com/d2d-factory-intake/v1
CONTENT_FACTORY_INTAKE_SECRET=<same value as D2D_INTAKE_SHARED_SECRET>
```

## Local CLI (unchanged)

Local operators still use `npm run d2d-intake` with a file registry (`.d2d-intake-state/`) unless `D2D_INTAKE_RUNTIME=production`. See `OPERATOR_SETUP.md`.
