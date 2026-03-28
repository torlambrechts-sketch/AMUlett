-- HSE/HMS: ROS risk matrix, deviations, inspections (Vernerunder), whistleblower reception, VO visibility, halt work metadata.

-- ---------------------------------------------------------------------------
-- Extend hse_records
-- ---------------------------------------------------------------------------
alter table public.hse_records drop constraint if exists hse_records_record_type_check;

alter table public.hse_records
  add constraint hse_records_record_type_check check (
    record_type in (
      'risk_assessment',
      'inspection',
      'incident',
      'deviation',
      'action',
      'halted_work',
      'other'
    )
  );

alter table public.hse_records
  add column if not exists deviation_category text;

alter table public.hse_records drop constraint if exists hse_records_deviation_category_check;
alter table public.hse_records
  add constraint hse_records_deviation_category_check check (
    deviation_category is null
    or deviation_category in ('physical', 'psychosocial', 'equipment')
  );

alter table public.hse_records
  add column if not exists proposed_solution jsonb not null default '{}'::jsonb;

alter table public.hse_records
  add column if not exists attachment_paths jsonb not null default '[]'::jsonb;

alter table public.hse_records
  add column if not exists probability int;

alter table public.hse_records
  add column if not exists consequence int;

alter table public.hse_records drop constraint if exists hse_records_probability_check;
alter table public.hse_records
  add constraint hse_records_probability_check check (probability is null or (probability between 1 and 5));

alter table public.hse_records drop constraint if exists hse_records_consequence_check;
alter table public.hse_records
  add constraint hse_records_consequence_check check (consequence is null or (consequence between 1 and 5));

alter table public.hse_records
  add column if not exists risk_score int;

alter table public.hse_records
  add column if not exists risk_band text;

alter table public.hse_records drop constraint if exists hse_records_risk_band_check;
alter table public.hse_records
  add constraint hse_records_risk_band_check check (
    risk_band is null or risk_band in ('low', 'medium', 'high')
  );

alter table public.hse_records
  add column if not exists action_plan_required boolean not null default false;

alter table public.hse_records
  add column if not exists action_plan_task_id uuid;

alter table public.hse_records
  add column if not exists equipment_area_lock jsonb not null default '{}'::jsonb;

alter table public.hse_records
  add column if not exists halt_released_at timestamptz;

alter table public.hse_records
  add column if not exists halt_alert_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- Tasks: link to HSE (ROS action plans). FK added after column exists.
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column if not exists source_hse_record_id uuid;

create index if not exists tasks_source_hse_idx on public.tasks (source_hse_record_id) where source_hse_record_id is not null;

-- Circular FK: hse_records -> tasks, tasks -> hse_records — add FKs without validation issues
alter table public.tasks drop constraint if exists tasks_source_hse_record_id_fkey;
alter table public.tasks
  add constraint tasks_source_hse_record_id_fkey
  foreign key (source_hse_record_id) references public.hse_records (id) on delete set null;

alter table public.hse_records drop constraint if exists hse_records_action_plan_task_id_fkey;
alter table public.hse_records
  add constraint hse_records_action_plan_task_id_fkey
  foreign key (action_plan_task_id) references public.tasks (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Risk trigger (5x5 matrix: low <=6, medium 7-12, high >=13)
-- ---------------------------------------------------------------------------
create or replace function public.hse_sync_risk_fields()
returns trigger
language plpgsql
as $$
begin
  if new.probability is not null and new.consequence is not null then
    new.risk_score := new.probability * new.consequence;
    if new.risk_score <= 6 then
      new.risk_band := 'low';
    elsif new.risk_score <= 12 then
      new.risk_band := 'medium';
    else
      new.risk_band := 'high';
    end if;
    if new.record_type = 'risk_assessment' then
      new.action_plan_required := (new.risk_band in ('medium', 'high'));
    end if;
  else
    new.risk_score := null;
    new.risk_band := null;
    if new.record_type = 'risk_assessment' then
      new.action_plan_required := false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists hse_trg_risk on public.hse_records;
create trigger hse_trg_risk
  before insert or update of probability, consequence, record_type on public.hse_records
  for each row execute function public.hse_sync_risk_fields();

-- ---------------------------------------------------------------------------
-- Inspection templates & runs
-- ---------------------------------------------------------------------------
create table if not exists public.hse_inspection_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  title jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists hse_inspection_templates_org_idx on public.hse_inspection_templates (organization_id);

create table if not exists public.hse_inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template_id uuid references public.hse_inspection_templates (id) on delete set null,
  title jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'completed', 'cancelled')),
  performed_at timestamptz,
  performed_by uuid references auth.users (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists hse_inspections_org_idx on public.hse_inspections (organization_id);

create table if not exists public.hse_inspection_responses (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.hse_inspections (id) on delete cascade,
  item_key text not null,
  result text not null check (result in ('pass', 'fail', 'na')),
  notes jsonb not null default '{}'::jsonb,
  linked_hse_record_id uuid references public.hse_records (id) on delete set null,
  unique (inspection_id, item_key)
);

create index if not exists hse_inspection_responses_inspection_idx on public.hse_inspection_responses (inspection_id);

-- ---------------------------------------------------------------------------
-- Whistleblower: anonymous + reception routing
-- ---------------------------------------------------------------------------
alter table public.whistleblower_reports
  add column if not exists is_anonymous boolean not null default false;

alter table public.whistleblower_reports
  add column if not exists reception_only boolean not null default true;

create table if not exists public.whistleblower_reception_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (organization_id, user_id)
);

create index if not exists wb_reception_org_idx on public.whistleblower_reception_members (organization_id);

insert into public.capabilities (code, label, module)
values (
  'whistleblower.reception',
  '{"nb":"Varslingsmottak","en":"Whistleblowing reception"}'::jsonb,
  'reports'
)
on conflict (code) do nothing;

insert into public.role_capabilities (role_id, capability_id)
select r.id, c.id
from public.roles r
cross join public.capabilities c
where r.code = 'org_admin' and c.code = 'whistleblower.reception'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Storage: HSE attachments
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hse-attachments', 'hse-attachments', false, 20971520, null)
on conflict (id) do nothing;

drop policy if exists hse_files_select on storage.objects;
drop policy if exists hse_files_insert on storage.objects;
drop policy if exists hse_files_delete on storage.objects;

create policy hse_files_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'hse-attachments'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
    )
  );

create policy hse_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'hse-attachments'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
        and (
          public.has_capability(m.organization_id, 'hse.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  );

create policy hse_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'hse-attachments'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
        and (
          public.has_capability(m.organization_id, 'hse.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  );

-- ---------------------------------------------------------------------------
-- RLS new tables
-- ---------------------------------------------------------------------------
alter table public.hse_inspection_templates enable row level security;
alter table public.hse_inspections enable row level security;
alter table public.hse_inspection_responses enable row level security;
alter table public.whistleblower_reception_members enable row level security;

drop policy if exists hit_select on public.hse_inspection_templates;
drop policy if exists hit_write on public.hse_inspection_templates;
create policy hit_select on public.hse_inspection_templates
  for select to authenticated using (public.is_org_member(organization_id));
create policy hit_write on public.hse_inspection_templates
  for all to authenticated
  using (public.has_capability(organization_id, 'hse.write') or public.has_capability(organization_id, 'org.admin'))
  with check (public.has_capability(organization_id, 'hse.write') or public.has_capability(organization_id, 'org.admin'));

drop policy if exists hi_select on public.hse_inspections;
drop policy if exists hi_write on public.hse_inspections;
create policy hi_select on public.hse_inspections
  for select to authenticated using (public.is_org_member(organization_id));
create policy hi_write on public.hse_inspections
  for all to authenticated
  using (public.has_capability(organization_id, 'hse.write') or public.has_capability(organization_id, 'org.admin'))
  with check (public.has_capability(organization_id, 'hse.write') or public.has_capability(organization_id, 'org.admin'));

drop policy if exists hir_select on public.hse_inspection_responses;
drop policy if exists hir_write on public.hse_inspection_responses;
create policy hir_select on public.hse_inspection_responses
  for select to authenticated using (
    exists (select 1 from public.hse_inspections i where i.id = inspection_id and public.is_org_member(i.organization_id))
  );
create policy hir_write on public.hse_inspection_responses
  for all to authenticated
  using (
    exists (
      select 1 from public.hse_inspections i
      where i.id = inspection_id
        and (public.has_capability(i.organization_id, 'hse.write') or public.has_capability(i.organization_id, 'org.admin'))
    )
  )
  with check (
    exists (
      select 1 from public.hse_inspections i
      where i.id = inspection_id
        and (public.has_capability(i.organization_id, 'hse.write') or public.has_capability(i.organization_id, 'org.admin'))
    )
  );

drop policy if exists wbr_select on public.whistleblower_reception_members;
drop policy if exists wbr_write on public.whistleblower_reception_members;
create policy wbr_select on public.whistleblower_reception_members
  for select to authenticated using (
    public.is_org_member(organization_id)
    and (user_id = (select auth.uid()) or public.has_capability(organization_id, 'org.admin'))
  );
create policy wbr_write on public.whistleblower_reception_members
  for all to authenticated
  using (public.has_capability(organization_id, 'org.admin'))
  with check (public.has_capability(organization_id, 'org.admin'));

grant select, insert, update, delete on public.hse_inspection_templates to authenticated;
grant select, insert, update, delete on public.hse_inspections to authenticated;
grant select, insert, update, delete on public.hse_inspection_responses to authenticated;
grant select, insert, update, delete on public.whistleblower_reception_members to authenticated;

-- Default inspection templates per organization (idempotent per org+slug)
insert into public.hse_inspection_templates (organization_id, slug, title, description, items)
select o.id,
  'office-ergonomics',
  '{"en":"Office ergonomics","nb":"Kontorergonomi"}'::jsonb,
  '{"en":"Periodic workplace inspection — office","nb":"Periodisk vernerunde — kontor"}'::jsonb,
  '[
    {"key":"desk","label":{"en":"Workstation adjustable","nb":"Arbeidsplass justerbar"}},
    {"key":"lighting","label":{"en":"Adequate lighting","nb":"Tilstrekkelig belysning"}},
    {"key":"screen","label":{"en":"Screen breaks / eye strain","nb":"Pauser fra skjerm"}}
  ]'::jsonb
from public.organizations o
on conflict (organization_id, slug) do nothing;

insert into public.hse_inspection_templates (organization_id, slug, title, description, items)
select o.id,
  'construction-safety',
  '{"en":"Construction site safety","nb":"Byggeplass sikkerhet"}'::jsonb,
  '{"en":"High-risk area checklist","nb":"Sjekkliste høyrisiko"}'::jsonb,
  '[
    {"key":"ppe","label":{"en":"PPE in use","nb":"Verneutstyr i bruk"}},
    {"key":"barriers","label":{"en":"Barriers / signage","nb":"Avsperring / skilting"}}
  ]'::jsonb
from public.organizations o
on conflict (organization_id, slug) do nothing;

insert into public.hse_inspection_templates (organization_id, slug, title, description, items)
select o.id,
  'psychosocial',
  '{"en":"Psychosocial environment","nb":"Psykososialt miljø"}'::jsonb,
  '{"en":"MAP-style walkthrough","nb":"Kartlegging av psykososialt miljø"}'::jsonb,
  '[
    {"key":"dialogue","label":{"en":"Dialogue with employees","nb":"Dialog med ansatte"}},
    {"key":"workload","label":{"en":"Workload / deadlines","nb":"Arbeidsmengde / frister"}}
  ]'::jsonb
from public.organizations o
on conflict (organization_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Whistleblower SELECT: reception group, reviewers, admin, or non-anonymous reporter
-- ---------------------------------------------------------------------------
drop policy if exists wb_select on public.whistleblower_reports;
create policy wb_select on public.whistleblower_reports
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'org.admin')
      or public.has_capability(organization_id, 'whistleblower.review')
      or public.has_capability(organization_id, 'whistleblower.reception')
      or exists (
        select 1 from public.whistleblower_reception_members w
        where w.organization_id = whistleblower_reports.organization_id
          and w.user_id = (select auth.uid())
      )
      or (
        coalesce(is_anonymous, false) = false
        and reporter_user_id = (select auth.uid())
      )
    )
  );

drop policy if exists wb_insert on public.whistleblower_reports;
create policy wb_insert on public.whistleblower_reports
  for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'whistleblower.submit')
      or public.has_capability(organization_id, 'org.admin')
    )
    and (
      (is_anonymous = true and reporter_user_id is null)
      or (coalesce(is_anonymous, false) = false and reporter_user_id = (select auth.uid()))
    )
  );

-- ---------------------------------------------------------------------------
-- HSE records SELECT: VO sees all org HSE; others see own rows or hse.write/admin
-- ---------------------------------------------------------------------------
drop policy if exists hse_select on public.hse_records;
create policy hse_select on public.hse_records
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'hse.write')
      or public.has_capability(organization_id, 'org.admin')
      or exists (
        select 1 from public.organization_members om
        join public.roles r on r.id = om.role_id
        where om.organization_id = hse_records.organization_id
          and om.user_id = (select auth.uid())
          and r.code = 'safety_rep'
      )
      or created_by = (select auth.uid())
    )
  );

-- Tasks SELECT: HSE-linked tasks visible under same rules as parent HSE record
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      source_hse_record_id is null
      or exists (
        select 1 from public.hse_records h
        where h.id = tasks.source_hse_record_id
          and public.is_org_member(h.organization_id)
          and (
            public.has_capability(h.organization_id, 'hse.write')
            or public.has_capability(h.organization_id, 'org.admin')
            or exists (
              select 1 from public.organization_members om
              join public.roles r on r.id = om.role_id
              where om.organization_id = h.organization_id
                and om.user_id = (select auth.uid())
                and r.code = 'safety_rep'
            )
            or h.created_by = (select auth.uid())
          )
      )
    )
  );

-- Any org member may register a new HSE record they author (deviations, ROS drafts)
drop policy if exists hse_insert_own on public.hse_records;
create policy hse_insert_own on public.hse_records
  for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and created_by = (select auth.uid())
  );

-- VO + hse.write can create ROS action tasks linked to HSE
drop policy if exists tasks_insert_hse_action on public.tasks;
create policy tasks_insert_hse_action on public.tasks
  for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and source_hse_record_id is not null
    and (
      public.has_capability(organization_id, 'hse.write')
      or public.has_capability(organization_id, 'org.admin')
      or exists (
        select 1 from public.organization_members om
        join public.roles r on r.id = om.role_id
        where om.organization_id = tasks.organization_id
          and om.user_id = (select auth.uid())
          and r.code = 'safety_rep'
      )
    )
  );

-- VO may update halted-work release fields (and other HSE rows for follow-up)
drop policy if exists hse_update_vo on public.hse_records;
create policy hse_update_vo on public.hse_records
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