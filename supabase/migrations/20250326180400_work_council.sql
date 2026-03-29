create table public.work_council_meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  status text not null default 'planned' check (status in ('planned', 'live', 'completed', 'cancelled')),
  strict_agenda boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index work_council_meetings_org_idx on public.work_council_meetings (organization_id);

create table public.work_council_agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.work_council_meetings (id) on delete cascade,
  position int not null,
  title jsonb not null default '{}'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  timebox_minutes int,
  unique (meeting_id, position)
);

create table public.work_council_participants (
  meeting_id uuid not null references public.work_council_meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role_label jsonb not null default '{}'::jsonb,
  attended boolean,
  primary key (meeting_id, user_id)
);

create table public.work_council_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  meeting_id uuid references public.work_council_meetings (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index work_council_audit_org_idx on public.work_council_audit_events (organization_id);

create or replace function public.prevent_work_council_audit_update_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'work_council_audit_events is append-only';
end;
$$;

create trigger work_council_audit_no_update
  before update on public.work_council_audit_events
  for each row execute function public.prevent_work_council_audit_update_delete();

create trigger work_council_audit_no_delete
  before delete on public.work_council_audit_events
  for each row execute function public.prevent_work_council_audit_update_delete();

create table public.work_council_ballots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  meeting_id uuid references public.work_council_meetings (id) on delete set null,
  title jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  secret_ballot boolean not null default false,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.work_council_ballot_options (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references public.work_council_ballots (id) on delete cascade,
  label jsonb not null default '{}'::jsonb,
  sort_order int not null default 0
);

create table public.work_council_votes (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references public.work_council_ballots (id) on delete cascade,
  voter_user_id uuid references auth.users (id) on delete set null,
  option_id uuid not null references public.work_council_ballot_options (id) on delete cascade,
  cast_at timestamptz not null default now(),
  unique (ballot_id, voter_user_id)
);

create index work_council_votes_ballot_idx on public.work_council_votes (ballot_id);
