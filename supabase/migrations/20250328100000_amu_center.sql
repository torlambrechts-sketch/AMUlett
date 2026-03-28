-- AMU Center: roster, elections, resolutions, meeting extensions, HSE escalation.

-- ---------------------------------------------------------------------------
-- Organization AMU settings (chair rotation side, VO sync hint)
-- ---------------------------------------------------------------------------
create table if not exists public.amu_org_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  chair_side text not null default 'employer' check (chair_side in ('employer', 'employee')),
  last_chair_rotation_year int,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AMU roster: employer vs employee representatives; VO row is system-protected
-- ---------------------------------------------------------------------------
create table if not exists public.amu_roster (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  side text not null check (side in ('employer', 'employee')),
  is_chair boolean not null default false,
  is_verneombud_slot boolean not null default false,
  position_label jsonb not null default '{}'::jsonb,
  term_start date,
  term_end date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists amu_roster_org_idx on public.amu_roster (organization_id);

create unique index if not exists amu_roster_one_vo_per_org
  on public.amu_roster (organization_id)
  where is_verneombud_slot = true;

-- ---------------------------------------------------------------------------
-- Digital elections (nomination + voting phases, protocol JSON)
-- ---------------------------------------------------------------------------
create table if not exists public.amu_elections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title jsonb not null default '{}'::jsonb,
  election_type text not null default 'amu_employee_rep'
    check (election_type in ('amu_employee_rep', 'vo', 'other')),
  phase text not null default 'draft'
    check (phase in ('draft', 'nomination', 'voting', 'closed')),
  nomination_ends_at timestamptz,
  voting_ends_at timestamptz,
  term_label jsonb not null default '{}'::jsonb,
  protocol jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists amu_elections_org_idx on public.amu_elections (organization_id);

create table if not exists public.amu_election_nominees (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.amu_elections (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (election_id, user_id)
);

create index if not exists amu_nominees_election_idx on public.amu_election_nominees (election_id);

create table if not exists public.amu_election_votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.amu_elections (id) on delete cascade,
  voter_user_id uuid not null references auth.users (id) on delete cascade,
  nominee_id uuid not null references public.amu_election_nominees (id) on delete cascade,
  cast_at timestamptz not null default now(),
  unique (election_id, voter_user_id)
);

create index if not exists amu_votes_election_idx on public.amu_election_votes (election_id);

-- ---------------------------------------------------------------------------
-- Binding resolutions (Kanban)
-- ---------------------------------------------------------------------------
create table if not exists public.amu_resolutions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  meeting_id uuid references public.work_council_meetings (id) on delete set null,
  title jsonb not null default '{}'::jsonb,
  assignee_user_id uuid references auth.users (id) on delete set null,
  deadline date,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  sort_order int not null default 0,
  source_hse_record_id uuid references public.hse_records (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists amu_resolutions_org_idx on public.amu_resolutions (organization_id);
create index if not exists amu_resolutions_status_idx on public.amu_resolutions (organization_id, status);

-- ---------------------------------------------------------------------------
-- Annual AMU report snapshots
-- ---------------------------------------------------------------------------
create table if not exists public.amu_annual_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  report_year int not null,
  content jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users (id),
  unique (organization_id, report_year)
);

-- ---------------------------------------------------------------------------
-- Extend work council meetings / agenda for AMU workflows
-- ---------------------------------------------------------------------------
alter table public.work_council_meetings
  add column if not exists minutes_document jsonb not null default '{}'::jsonb;

alter table public.work_council_meetings
  add column if not exists adjourned_at timestamptz;

alter table public.work_council_meetings
  add column if not exists protocol_storage_path text;

alter table public.work_council_meetings
  add column if not exists protocol_locked_at timestamptz;

alter table public.work_council_agenda_items
  add column if not exists item_kind text not null default 'custom'
  check (item_kind in ('custom', 'statutory', 'escalation', 'resolution'));

alter table public.work_council_agenda_items
  add column if not exists source_hse_record_id uuid references public.hse_records (id) on delete set null;

alter table public.work_council_agenda_items
  add column if not exists priority text not null default 'normal'
  check (priority in ('low', 'normal', 'high', 'critical'));

-- HSE escalation flag
alter table public.hse_records
  add column if not exists escalated_to_amu boolean not null default false;

alter table public.hse_records
  add column if not exists escalated_at timestamptz;

alter table public.hse_records
  add column if not exists escalation_target_meeting_id uuid references public.work_council_meetings (id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.amu_org_settings enable row level security;
alter table public.amu_roster enable row level security;
alter table public.amu_elections enable row level security;
alter table public.amu_election_nominees enable row level security;
alter table public.amu_election_votes enable row level security;
alter table public.amu_resolutions enable row level security;
alter table public.amu_annual_reports enable row level security;

-- Org settings: members read; work_council.write update
create policy amu_settings_select on public.amu_org_settings
  for select to authenticated using (public.is_org_member(organization_id));

create policy amu_settings_write on public.amu_org_settings
  for all to authenticated
  using (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  );

-- Roster
create policy amu_roster_select on public.amu_roster
  for select to authenticated using (public.is_org_member(organization_id));

create policy amu_roster_write on public.amu_roster
  for all to authenticated
  using (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  );

-- Elections
create policy amu_elections_select on public.amu_elections
  for select to authenticated using (public.is_org_member(organization_id));

create policy amu_elections_write on public.amu_elections
  for all to authenticated
  using (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy amu_nominees_select on public.amu_election_nominees
  for select to authenticated using (
    exists (
      select 1 from public.amu_elections e
      where e.id = election_id and public.is_org_member(e.organization_id)
    )
  );

create policy amu_nominees_insert on public.amu_election_nominees
  for insert to authenticated
  with check (
    exists (
      select 1 from public.amu_elections e
      where e.id = election_id
        and public.is_org_member(e.organization_id)
        and e.phase = 'nomination'
    )
    and user_id = (select auth.uid())
  );

create policy amu_nominees_write_admin on public.amu_election_nominees
  for all to authenticated
  using (
    exists (
      select 1 from public.amu_elections e
      where e.id = election_id
        and (
          public.has_capability(e.organization_id, 'work_council.write')
          or public.has_capability(e.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.amu_elections e
      where e.id = election_id
        and (
          public.has_capability(e.organization_id, 'work_council.write')
          or public.has_capability(e.organization_id, 'org.admin')
        )
    )
  );

-- Votes: own row insert during voting; select own; admins see all
create policy amu_votes_select on public.amu_election_votes
  for select to authenticated using (
    voter_user_id = (select auth.uid())
    or exists (
      select 1 from public.amu_elections e
      where e.id = election_id
        and (
          public.has_capability(e.organization_id, 'work_council.write')
          or public.has_capability(e.organization_id, 'org.admin')
        )
    )
  );

create policy amu_votes_insert on public.amu_election_votes
  for insert to authenticated
  with check (
    voter_user_id = (select auth.uid())
    and exists (
      select 1 from public.amu_elections e
      where e.id = election_id
        and public.is_org_member(e.organization_id)
        and e.phase = 'voting'
    )
  );

create policy amu_votes_update_own on public.amu_election_votes
  for update to authenticated
  using (voter_user_id = (select auth.uid()))
  with check (
    voter_user_id = (select auth.uid())
    and exists (
      select 1 from public.amu_elections e
      where e.id = election_id
        and public.is_org_member(e.organization_id)
        and e.phase = 'voting'
    )
  );

-- Resolutions
create policy amu_resolutions_select on public.amu_resolutions
  for select to authenticated using (public.is_org_member(organization_id));

create policy amu_resolutions_write on public.amu_resolutions
  for all to authenticated
  using (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  );

-- Annual reports
create policy amu_reports_select on public.amu_annual_reports
  for select to authenticated using (public.is_org_member(organization_id));

create policy amu_reports_write on public.amu_annual_reports
  for all to authenticated
  using (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  );

grant select, insert, update, delete on public.amu_org_settings to authenticated;
grant select, insert, update, delete on public.amu_roster to authenticated;
grant select, insert, update, delete on public.amu_elections to authenticated;
grant select, insert, update, delete on public.amu_election_nominees to authenticated;
grant select, insert, update, delete on public.amu_election_votes to authenticated;
grant select, insert, update, delete on public.amu_resolutions to authenticated;
grant select, insert, update, delete on public.amu_annual_reports to authenticated;

-- ---------------------------------------------------------------------------
-- HSE: allow verneombud to escalate (update escalation flags only)
-- ---------------------------------------------------------------------------
drop policy if exists hse_escalate_vo on public.hse_records;
create policy hse_escalate_vo on public.hse_records
  for update to authenticated
  using (
    public.is_org_member(organization_id)
    and exists (
      select 1 from public.organization_members om
      join public.roles r on r.id = om.role_id
      where om.organization_id = hse_records.organization_id
        and om.user_id = (select auth.uid())
        and r.code = 'safety_rep'
    )
  )
  with check (
    public.is_org_member(organization_id)
    and exists (
      select 1 from public.organization_members om
      join public.roles r on r.id = om.role_id
      where om.organization_id = hse_records.organization_id
        and om.user_id = (select auth.uid())
        and r.code = 'safety_rep'
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: sync VO row on AMU roster from role safety_rep
-- ---------------------------------------------------------------------------
create or replace function public.sync_amu_verneombud_roster(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_rid uuid;
begin
  if auth.uid() is null or not public.is_org_member(p_organization_id) then
    raise exception 'Not allowed';
  end if;
  select id into v_rid from public.roles where code = 'safety_rep' limit 1;
  if v_rid is null then
    return;
  end if;
  select om.user_id into v_uid
  from public.organization_members om
  where om.organization_id = p_organization_id and om.role_id = v_rid
  order by om.joined_at asc
  limit 1;
  delete from public.amu_roster
  where organization_id = p_organization_id
    and is_verneombud_slot = true
    and (v_uid is null or user_id is distinct from v_uid);
  if v_uid is not null then
    insert into public.amu_roster (organization_id, user_id, side, is_verneombud_slot, position_label)
    values (
      p_organization_id,
      v_uid,
      'employee',
      true,
      '{"en":"Safety representative (VO)","nb":"Verneombud (VO)"}'::jsonb
    )
    on conflict (organization_id, user_id) do update set
      is_verneombud_slot = true,
      side = 'employee',
      position_label = excluded.position_label;
  end if;
end;
$$;

grant execute on function public.sync_amu_verneombud_roster(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: VO escalates HSE deviation to next AMU meeting agenda
-- ---------------------------------------------------------------------------
create or replace function public.escalate_hse_to_amu_agenda(p_hse_record_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_mid uuid;
  v_pos int;
  v_title jsonb;
  v_agenda uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select organization_id, title into v_org, v_title
  from public.hse_records where id = p_hse_record_id;
  if v_org is null then
    raise exception 'HSE record not found';
  end if;
  if not exists (
    select 1 from public.organization_members om
    join public.roles r on r.id = om.role_id
    where om.organization_id = v_org and om.user_id = auth.uid() and r.code = 'safety_rep'
  ) then
    raise exception 'Only the safety representative (VO) can escalate';
  end if;
  select m.id into v_mid
  from public.work_council_meetings m
  where m.organization_id = v_org
    and m.status in ('planned', 'live')
    and (m.scheduled_at is null or m.scheduled_at >= now())
  order by m.scheduled_at nulls last, m.created_at asc
  limit 1;
  if v_mid is null then
    update public.hse_records
    set escalated_to_amu = true,
        escalated_at = now(),
        escalation_target_meeting_id = null
    where id = p_hse_record_id;
    return null;
  end if;
  select coalesce(max(position), 0) + 1 into v_pos
  from public.work_council_agenda_items where meeting_id = v_mid;
  insert into public.work_council_agenda_items (
    meeting_id, position, title, notes, item_kind, source_hse_record_id, priority
  )
  values (
    v_mid,
    v_pos,
    coalesce(v_title, '{"en":"Escalated HSE item","nb":"Eskalert HMS-sak"}'::jsonb),
    '{}'::jsonb,
    'escalation',
    p_hse_record_id,
    'high'
  )
  returning id into v_agenda;
  update public.hse_records
  set escalated_to_amu = true,
      escalated_at = now(),
      escalation_target_meeting_id = v_mid
  where id = p_hse_record_id;
  return v_agenda;
end;
$$;

grant execute on function public.escalate_hse_to_amu_agenda(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: statutory agenda items (minimum AMU topics)
-- ---------------------------------------------------------------------------
create or replace function public.generate_statutory_amu_agenda(p_meeting_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_base int;
  n int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select organization_id into v_org from public.work_council_meetings where id = p_meeting_id;
  if v_org is null then
    raise exception 'Meeting not found';
  end if;
  if not (
    public.has_capability(v_org, 'work_council.write') or public.has_capability(v_org, 'org.admin')
  ) then
    raise exception 'Not allowed';
  end if;
  select coalesce(max(position), 0) into v_base from public.work_council_agenda_items where meeting_id = p_meeting_id;
  insert into public.work_council_agenda_items (meeting_id, position, title, notes, item_kind, priority)
  values
    (p_meeting_id, v_base + 1, '{"en":"Sick leave review (sykefravær)","nb":"Gjennomgang av sykefravær"}'::jsonb, '{}'::jsonb, 'statutory', 'normal'),
    (p_meeting_id, v_base + 2, '{"en":"Review of deviations and incidents","nb":"Gjennomgang av avvik og hendelser"}'::jsonb, '{}'::jsonb, 'statutory', 'normal'),
    (p_meeting_id, v_base + 3, '{"en":"Active risk assessments (ROS)","nb":"Aktive risikovurderinger (ROS)"}'::jsonb, '{}'::jsonb, 'statutory', 'normal'),
    (p_meeting_id, v_base + 4, '{"en":"Psychosocial environment follow-up","nb":"Oppfølging av psykososialt miljø"}'::jsonb, '{}'::jsonb, 'statutory', 'normal');
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.generate_statutory_amu_agenda(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: close election and write protocol JSON (turnout, winner placeholder)
-- ---------------------------------------------------------------------------
create or replace function public.close_amu_election(p_election_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_winner uuid;
  v_nominees int;
  v_votes int;
  v_distinct int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select organization_id into v_org from public.amu_elections where id = p_election_id;
  if v_org is null then
    raise exception 'Election not found';
  end if;
  if not (
    public.has_capability(v_org, 'work_council.write') or public.has_capability(v_org, 'org.admin')
  ) then
    raise exception 'Not allowed';
  end if;
  select count(*) into v_nominees from public.amu_election_nominees where election_id = p_election_id and status <> 'withdrawn';
  select count(*) into v_votes from public.amu_election_votes where election_id = p_election_id;
  select count(distinct voter_user_id) into v_distinct from public.amu_election_votes where election_id = p_election_id;
  select n.nominee_id into v_winner
  from (
    select nominee_id, count(*) as c
    from public.amu_election_votes
    where election_id = p_election_id
    group by nominee_id
    order by c desc
    limit 1
  ) n;
  update public.amu_elections
  set phase = 'closed',
      protocol = jsonb_build_object(
        'generated_at', now(),
        'eligible_nominees', v_nominees,
        'votes_cast', v_votes,
        'unique_voters', v_distinct,
        'winner_nominee_id', v_winner
      )
  where id = p_election_id;
end;
$$;

grant execute on function public.close_amu_election(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: annual AMU report (aggregated JSON for board review)
-- ---------------------------------------------------------------------------
create or replace function public.generate_amu_annual_report(p_organization_id uuid, p_year int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_meetings int;
  v_deviations int;
  v_res_done int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not (
    public.has_capability(p_organization_id, 'work_council.write')
    or public.has_capability(p_organization_id, 'org.admin')
  ) then
    raise exception 'Not allowed';
  end if;
  select count(*) into v_meetings
  from public.work_council_meetings
  where organization_id = p_organization_id
    and status = 'completed'
    and extract(year from coalesce(scheduled_at, created_at)) = p_year;
  select count(*) into v_deviations
  from public.hse_records
  where organization_id = p_organization_id
    and extract(year from coalesce(occurred_at, created_at::date)) = p_year;
  select count(*) into v_res_done
  from public.amu_resolutions
  where organization_id = p_organization_id
    and status = 'completed'
    and extract(year from updated_at) = p_year;
  insert into public.amu_annual_reports (organization_id, report_year, content, generated_by)
  values (
    p_organization_id,
    p_year,
    jsonb_build_object(
      'year', p_year,
      'meetings_completed', v_meetings,
      'hse_records_in_year', v_deviations,
      'resolutions_completed', v_res_done,
      'generated_at', now()
    ),
    auth.uid()
  )
  on conflict (organization_id, report_year) do update set
    content = excluded.content,
    generated_at = now(),
    generated_by = excluded.generated_by
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.generate_amu_annual_report(uuid, int) to authenticated;
