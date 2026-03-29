-- HMS: org halt alert targets, escalation status on deviations, close-guard for ROS, whistleblower RBAC, halt notify RPC.

-- ---------------------------------------------------------------------------
-- Per-org contacts for halt-work alerts (CEO email, optional extra emails)
-- ---------------------------------------------------------------------------
create table if not exists public.hse_org_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  ceo_user_id uuid references auth.users (id) on delete set null,
  halt_alert_emails text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

create index if not exists hse_org_settings_ceo_idx on public.hse_org_settings (ceo_user_id);

alter table public.hse_org_settings enable row level security;

drop policy if exists hse_org_settings_select on public.hse_org_settings;
create policy hse_org_settings_select on public.hse_org_settings
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists hse_org_settings_write on public.hse_org_settings;
create policy hse_org_settings_write on public.hse_org_settings
  for all to authenticated
  using (public.has_capability(organization_id, 'org.admin'))
  with check (public.has_capability(organization_id, 'org.admin'));

grant select, insert, update, delete on public.hse_org_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Deviations: explicit AMU escalation status (RPC sets this + status)
-- ---------------------------------------------------------------------------
alter table public.hse_records
  add column if not exists amu_escalation_status text not null default 'none';

alter table public.hse_records drop constraint if exists hse_records_amu_escalation_status_check;
alter table public.hse_records
  add constraint hse_records_amu_escalation_status_check check (
    amu_escalation_status in ('none', 'escalated')
  );

-- ---------------------------------------------------------------------------
-- Outbox for halt alerts (SMS/email workers read this; optional)
-- ---------------------------------------------------------------------------
create table if not exists public.hse_halt_alert_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  hse_record_id uuid not null references public.hse_records (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists hse_halt_outbox_org_idx on public.hse_halt_alert_outbox (organization_id);

alter table public.hse_halt_alert_outbox enable row level security;

drop policy if exists hse_halt_outbox_select on public.hse_halt_alert_outbox;
create policy hse_halt_outbox_select on public.hse_halt_alert_outbox
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'org.admin')
      or public.has_capability(organization_id, 'hse.write')
      or exists (
        select 1 from public.organization_members om
        join public.roles r on r.id = om.role_id
        where om.organization_id = hse_halt_alert_outbox.organization_id
          and om.user_id = (select auth.uid())
          and r.code = 'safety_rep'
      )
    )
  );

drop policy if exists hse_halt_outbox_insert on public.hse_halt_alert_outbox;
-- Inserts only via RPC (service) — block direct client inserts
create policy hse_halt_outbox_insert on public.hse_halt_alert_outbox
  for insert to authenticated
  with check (false);

grant select on public.hse_halt_alert_outbox to authenticated;

-- ---------------------------------------------------------------------------
-- Block closing ROS when medium/high action plan is required but missing
-- ---------------------------------------------------------------------------
create or replace function public.hse_block_close_without_action_plan()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.record_type = 'risk_assessment'
     and coalesce(new.status, '') = 'closed'
     and coalesce(new.action_plan_required, false) = true
     and new.action_plan_task_id is null then
    raise exception 'ACTION_PLAN_REQUIRED: Close blocked until an action plan task is linked.';
  end if;
  return new;
end;
$$;

drop trigger if exists hse_trg_block_close_ros on public.hse_records;
create trigger hse_trg_block_close_ros
  before update of status, action_plan_task_id, action_plan_required on public.hse_records
  for each row execute function public.hse_block_close_without_action_plan();

-- ---------------------------------------------------------------------------
-- Whistleblower SELECT: stricter — anonymous cases not visible to org.admin alone
-- ---------------------------------------------------------------------------
drop policy if exists wb_select on public.whistleblower_reports;
create policy wb_select on public.whistleblower_reports
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      (
        coalesce(is_anonymous, false) = true
        and (
          public.has_capability(organization_id, 'whistleblower.review')
          or public.has_capability(organization_id, 'whistleblower.reception')
          or exists (
            select 1 from public.whistleblower_reception_members w
            where w.organization_id = whistleblower_reports.organization_id
              and w.user_id = (select auth.uid())
          )
        )
      )
      or (
        coalesce(is_anonymous, false) = false
        and (
          public.has_capability(organization_id, 'org.admin')
          or public.has_capability(organization_id, 'whistleblower.review')
          or public.has_capability(organization_id, 'whistleblower.reception')
          or exists (
            select 1 from public.whistleblower_reception_members w
            where w.organization_id = whistleblower_reports.organization_id
              and w.user_id = (select auth.uid())
          )
          or reporter_user_id = (select auth.uid())
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: escalate — set deviation status + amu_escalation_status
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
        escalation_target_meeting_id = null,
        amu_escalation_status = 'escalated',
        status = case when record_type = 'deviation' then 'escalated_to_amu' else status end
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
      escalation_target_meeting_id = v_mid,
      amu_escalation_status = 'escalated',
      status = case when record_type = 'deviation' then 'escalated_to_amu' else status end
  where id = p_hse_record_id;
  return v_agenda;
end;
$$;

grant execute on function public.escalate_hse_to_amu_agenda(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: VO submits halt work — record alert outbox row (for email/SMS workers)
-- ---------------------------------------------------------------------------
create or replace function public.notify_hse_halt_work_submitted(p_hse_record_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_type text;
  v_lock jsonb;
  v_s jsonb;
  v_emails text[] := '{}'::text[];
  v_ceo uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select organization_id, record_type, equipment_area_lock into v_org, v_type, v_lock
  from public.hse_records where id = p_hse_record_id;
  if v_org is null then
    raise exception 'HSE record not found';
  end if;
  if v_type <> 'halted_work' then
    raise exception 'Record is not a halt work entry';
  end if;
  if not exists (
    select 1 from public.organization_members om
    join public.roles r on r.id = om.role_id
    where om.organization_id = v_org and om.user_id = auth.uid() and r.code = 'safety_rep'
  ) then
    raise exception 'Only the safety representative (VO) can submit halt alerts';
  end if;

  select halt_alert_emails, ceo_user_id into v_emails, v_ceo
  from public.hse_org_settings where organization_id = v_org;
  if not found then
    v_emails := '{}'::text[];
    v_ceo := null;
  elsif v_emails is null then
    v_emails := '{}'::text[];
  end if;

  v_s := jsonb_build_object(
    'organization_id', v_org,
    'hse_record_id', p_hse_record_id,
    'submitted_by', auth.uid(),
    'ceo_user_id', v_ceo,
    'emails', coalesce(to_jsonb(v_emails), '[]'::jsonb),
    'equipment_area_lock', coalesce(v_lock, '{}'::jsonb)
  );

  insert into public.hse_halt_alert_outbox (organization_id, hse_record_id, payload)
  values (v_org, p_hse_record_id, v_s);

  update public.hse_records
  set halt_alert_sent_at = now()
  where id = p_hse_record_id;

  return v_s;
end;
$$;

grant execute on function public.notify_hse_halt_work_submitted(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Whistleblower UPDATE: anonymous cases — reception / review only
-- ---------------------------------------------------------------------------
drop policy if exists wb_update on public.whistleblower_reports;
create policy wb_update on public.whistleblower_reports
  for update to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      (
        coalesce(is_anonymous, false) = true
        and (
          public.has_capability(organization_id, 'whistleblower.review')
          or public.has_capability(organization_id, 'whistleblower.reception')
          or exists (
            select 1 from public.whistleblower_reception_members w
            where w.organization_id = whistleblower_reports.organization_id
              and w.user_id = (select auth.uid())
          )
        )
      )
      or (
        coalesce(is_anonymous, false) = false
        and (
          public.has_capability(organization_id, 'whistleblower.review')
          or public.has_capability(organization_id, 'org.admin')
        )
      )
    )
  )
  with check (
    public.is_org_member(organization_id)
    and (
      (
        coalesce(is_anonymous, false) = true
        and (
          public.has_capability(organization_id, 'whistleblower.review')
          or public.has_capability(organization_id, 'whistleblower.reception')
          or exists (
            select 1 from public.whistleblower_reception_members w
            where w.organization_id = whistleblower_reports.organization_id
              and w.user_id = (select auth.uid())
          )
        )
      )
      or (
        coalesce(is_anonymous, false) = false
        and (
          public.has_capability(organization_id, 'whistleblower.review')
          or public.has_capability(organization_id, 'org.admin')
        )
      )
    )
  );
