-- Data-driven mapping to Working Environment Act (Arbeidsmiljøloven) topics.
-- UI and workflows read these rows; do not hard-code statutory copy in the app.

create table public.compliance_functions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.compliance_functions (id) on delete set null,
  code text not null unique,
  title jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  module text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index compliance_functions_parent_idx on public.compliance_functions (parent_id);
create index compliance_functions_module_idx on public.compliance_functions (module);
