-- D2D intake durable state for the Vercel receiver.
-- Prepare/review only. Do NOT apply this migration to Production from this PR.

create table if not exists public.d2d_intake_receipts (
  correlation_id text primary key,
  source_business_id text not null,
  d2d_prospect_id text,
  factory_run_id text,
  receipt jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.d2d_intake_business_receipts (
  source_business_id text primary key,
  correlation_id text not null,
  receipt jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.d2d_intake_prospect_receipts (
  d2d_prospect_id text primary key,
  receipt jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.d2d_intake_run_receipts (
  factory_run_id text primary key,
  receipt jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.d2d_intake_workflow_state (
  run_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists d2d_intake_receipts_business_idx
  on public.d2d_intake_receipts (source_business_id);

alter table public.d2d_intake_receipts enable row level security;
alter table public.d2d_intake_business_receipts enable row level security;
alter table public.d2d_intake_prospect_receipts enable row level security;
alter table public.d2d_intake_run_receipts enable row level security;
alter table public.d2d_intake_workflow_state enable row level security;

revoke all on table public.d2d_intake_receipts from anon, authenticated;
revoke all on table public.d2d_intake_business_receipts from anon, authenticated;
revoke all on table public.d2d_intake_prospect_receipts from anon, authenticated;
revoke all on table public.d2d_intake_run_receipts from anon, authenticated;
revoke all on table public.d2d_intake_workflow_state from anon, authenticated;

grant all on table public.d2d_intake_receipts to service_role;
grant all on table public.d2d_intake_business_receipts to service_role;
grant all on table public.d2d_intake_prospect_receipts to service_role;
grant all on table public.d2d_intake_run_receipts to service_role;
grant all on table public.d2d_intake_workflow_state to service_role;
