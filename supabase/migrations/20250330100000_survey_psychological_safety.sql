-- Employee surveys: pulse vs culture, departments, anonymous responses, aggregates, RLS, eNPS, psychological safety flags.

-- ---------------------------------------------------------------------------
-- Departments (hierarchical)
-- ---------------------------------------------------------------------------
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  parent_id uuid references public.departments (id) on delete set null,
  slug text not null,
  name jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists departments_org_idx on public.departments (organization_id);
create index if not exists departments_parent_idx on public.departments (parent_id);

-- Optional: which departments a user manages (for analytics RLS)
create table if not exists public.department_managers (
  department_id uuid not null references public.departments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (department_id, user_id)
);

create index if not exists department_managers_user_idx on public.department_managers (user_id);

-- Member home department (for default survey routing)
alter table public.organization_members
  add column if not exists department_id uuid references public.departments (id) on delete set null;

create index if not exists organization_members_department_idx on public.organization_members (department_id);

-- ---------------------------------------------------------------------------
-- Extend surveys
-- ---------------------------------------------------------------------------
alter table public.surveys drop constraint if exists surveys_status_check;
alter table public.surveys
  add constraint surveys_status_check check (status in ('draft', 'published', 'closed'));

alter table public.surveys
  add column if not exists survey_type text not null default 'culture';

alter table public.surveys drop constraint if exists surveys_survey_type_check;
alter table public.surveys
  add constraint surveys_survey_type_check check (survey_type in ('pulse', 'culture'));

alter table public.surveys
  add column if not exists closes_at timestamptz;

-- ---------------------------------------------------------------------------
-- Extend survey_questions
-- ---------------------------------------------------------------------------
alter table public.survey_questions
  add column if not exists question_category text;

alter table public.survey_questions
  add column if not exists is_enps boolean not null default false;

alter table public.survey_questions
  add column if not exists is_psychological_safety boolean not null default false;

alter table public.survey_questions
  add column if not exists options jsonb;

-- ---------------------------------------------------------------------------
-- Anonymous participation tracking (not exposed to managers)
-- ---------------------------------------------------------------------------
create table if not exists public.survey_participation (
  survey_id uuid not null references public.surveys (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  primary key (survey_id, user_id)
);

create index if not exists survey_participation_user_idx on public.survey_participation (user_id);

alter table public.survey_participation enable row level security;

drop policy if exists survey_participation_own on public.survey_participation;
create policy survey_participation_own on public.survey_participation
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists survey_participation_insert on public.survey_participation;
create policy survey_participation_insert on public.survey_participation
  for insert to authenticated
  with check (user_id = (select auth.uid()));

grant select, insert on public.survey_participation to authenticated;

-- ---------------------------------------------------------------------------
-- survey_responses: department + no user id for anonymous pipeline (legacy rows may keep user)
-- ---------------------------------------------------------------------------
alter table public.survey_responses
  add column if not exists department_id uuid references public.departments (id) on delete set null;

alter table public.survey_responses
  add column if not exists response_token uuid default gen_random_uuid();

create unique index if not exists survey_responses_token_uq on public.survey_responses (response_token);

-- ---------------------------------------------------------------------------
-- Tasks: link survey-driven action plans
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column if not exists source_survey_id uuid references public.surveys (id) on delete set null;

alter table public.tasks
  add column if not exists source_department_id uuid references public.departments (id) on delete set null;

create index if not exists tasks_source_survey_idx on public.tasks (source_survey_id) where source_survey_id is not null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.user_manages_department(p_department_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.department_managers dm
    where dm.department_id = p_department_id and dm.user_id = p_user_id
  )
  or exists (
    select 1 from public.organization_members om
    join public.roles r on r.id = om.role_id
    join public.departments d on d.id = p_department_id and d.organization_id = om.organization_id
    where om.user_id = p_user_id and r.code = 'org_admin'
  );
$$;

create or replace function public.user_is_org_admin_or_survey_admin(p_org uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_capability(p_org, 'org.admin')
    or public.has_capability(p_org, 'surveys.admin');
$$;

-- ---------------------------------------------------------------------------
-- RPC: submit survey — no user id stored on response row (anonymity)
-- ---------------------------------------------------------------------------
create or replace function public.submit_survey_response(
  p_survey_id uuid,
  p_department_id uuid,
  p_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_status text;
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select organization_id, status into v_org, v_status
  from public.surveys where id = p_survey_id;
  if v_org is null then
    raise exception 'Survey not found';
  end if;
  if v_status <> 'published' then
    raise exception 'Survey is not open';
  end if;
  if not public.is_org_member(v_org) then
    raise exception 'Not a member of this organization';
  end if;
  if not (
    public.has_capability(v_org, 'surveys.respond')
    or public.has_capability(v_org, 'org.admin')
  ) then
    raise exception 'Cannot respond to surveys';
  end if;
  if p_department_id is not null then
    if not exists (
      select 1 from public.departments d
      where d.id = p_department_id and d.organization_id = v_org
    ) then
      raise exception 'Invalid department';
    end if;
  end if;

  if exists (select 1 from public.survey_participation where survey_id = p_survey_id and user_id = v_uid) then
    raise exception 'Already submitted';
  end if;

  insert into public.survey_responses (survey_id, respondent_user_id, answers, department_id)
  values (p_survey_id, null, coalesce(p_answers, '{}'::jsonb), p_department_id)
  returning id into v_id;

  insert into public.survey_participation (survey_id, user_id) values (p_survey_id, v_uid);

  return v_id;
end;
$$;

grant execute on function public.submit_survey_response(uuid, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Internal: extract likert numeric from answers jsonb { "question-uuid": 4 }
-- ---------------------------------------------------------------------------
create or replace function public._survey_numeric_answer(p_val jsonb)
returns numeric
language sql
immutable
as $$
  select case jsonb_typeof(p_val)
    when 'number' then (p_val)::text::numeric
    when 'string' then nullif(trim(p_val #>> '{}'), '')::numeric
    else null
  end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: department aggregate (enforces k-anonymity >= 5 for non-admins)
-- ---------------------------------------------------------------------------
create or replace function public.survey_department_aggregate(
  p_survey_id uuid,
  p_department_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_uid uuid := auth.uid();
  v_n int;
  v_min int := 5;
  v_parent uuid;
  v_enps_score int;
  v_enps_qid uuid;
  v_promoters numeric;
  v_detractors numeric;
  v_has_enps int;
  r record;
  cat_avg jsonb := '{}'::jsonb;
  v_ps_avg numeric;
  v_ps_risk boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select organization_id into v_org from public.surveys where id = p_survey_id;
  if v_org is null then
    raise exception 'Survey not found';
  end if;
  if not public.is_org_member(v_org) then
    raise exception 'Not a member';
  end if;

  -- Permission: org-wide for admin; else must manage this department
  if not (
    public.has_capability(v_org, 'org.admin')
    or public.has_capability(v_org, 'surveys.admin')
  ) then
    if not public.user_manages_department(p_department_id, v_uid) then
      raise exception 'Not allowed to view this department';
    end if;
  end if;

  select count(*)::int into v_n
  from public.survey_responses
  where survey_id = p_survey_id
    and department_id = p_department_id
    and respondent_user_id is null;

  if v_n < v_min then
    select parent_id into v_parent from public.departments where id = p_department_id;
    if v_parent is not null then
      select count(*)::int into v_parent_n
      from public.survey_responses
      where survey_id = p_survey_id
        and department_id = v_parent
        and respondent_user_id is null;
    end if;

    return jsonb_build_object(
      'hidden', true,
      'reason', 'anonymity_threshold',
      'respondent_count', v_n,
      'minimum_required', v_min,
      'suggest_parent_id', v_parent
    );
  end if;

  -- eNPS (first eNPS question; 0–10 scale)
  select count(*)::int into v_has_enps
  from public.survey_questions q
  where q.survey_id = p_survey_id and q.is_enps = true;
  if v_has_enps > 0 then
    select eq.id into v_enps_qid from public.survey_questions eq
    where eq.survey_id = p_survey_id and eq.is_enps = true
    order by eq.position asc limit 1;
    select
      (count(*) filter (where public._survey_numeric_answer(r.answers->(v_enps_qid::text)) >= 9)::numeric / v_n * 100),
      (count(*) filter (where public._survey_numeric_answer(r.answers->(v_enps_qid::text)) <= 6)::numeric / v_n * 100)
    into v_promoters, v_detractors
    from public.survey_responses r
    where r.survey_id = p_survey_id and r.department_id = p_department_id and r.respondent_user_id is null;
    v_enps_score := round(coalesce(v_promoters, 0) - coalesce(v_detractors, 0))::int;
  else
    v_enps_score := null;
  end if;

  -- Category averages (likert 1–5)
  for r in
    select sq.question_category as cat,
           avg(public._survey_numeric_answer(sr.answers->(sq.id::text)))::numeric as avg_score
    from public.survey_questions sq
    join public.survey_responses sr on sr.survey_id = sq.survey_id and sr.survey_id = p_survey_id
    where sq.survey_id = p_survey_id
      and sr.department_id = p_department_id
      and sr.respondent_user_id is null
      and sq.question_category is not null
      and sq.response_type = 'likert_5'
    group by sq.question_category
  loop
    if r.cat is not null and r.avg_score is not null then
      cat_avg := cat_avg || jsonb_build_object(r.cat, round(r.avg_score::numeric, 2));
      if r.cat = 'psychological_safety' and r.avg_score < 3.0 then
        v_ps_risk := true;
      end if;
    end if;
  end loop;

  select avg(public._survey_numeric_answer(sr.answers->(sq.id::text)))::numeric
  into v_ps_avg
  from public.survey_questions sq
  join public.survey_responses sr on sr.survey_id = sq.survey_id
  where sq.survey_id = p_survey_id
    and sr.department_id = p_department_id
    and sr.respondent_user_id is null
    and sq.is_psychological_safety = true
    and sq.response_type = 'likert_5';

  if v_ps_avg is not null and v_ps_avg < 3.0 then
    v_ps_risk := true;
  end if;

  return jsonb_build_object(
    'hidden', false,
    'respondent_count', v_n,
    'enps', v_enps_score,
    'category_averages', cat_avg,
    'psychological_safety_avg', case when v_ps_avg is null then null else round(v_ps_avg::numeric, 2) end,
    'psychological_safety_risk', v_ps_risk
  );
end;
$$;

grant execute on function public.survey_department_aggregate(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: org-wide aggregate for admins (same k-anonymity per department in UI; this returns summary)
-- ---------------------------------------------------------------------------
create or replace function public.survey_org_summary(p_survey_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_uid uuid := auth.uid();
  v_total int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select organization_id into v_org from public.surveys where id = p_survey_id;
  if v_org is null then
    raise exception 'Survey not found';
  end if;
  if not (
    public.has_capability(v_org, 'org.admin')
    or public.has_capability(v_org, 'surveys.admin')
  ) then
    raise exception 'Admin only';
  end if;

  select count(*)::int into v_total
  from public.survey_responses r
  where r.survey_id = p_survey_id and r.respondent_user_id is null;

  return jsonb_build_object(
    'total_anonymous_responses', v_total,
    'survey_id', p_survey_id
  );
end;
$$;

grant execute on function public.survey_org_summary(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: departments
-- ---------------------------------------------------------------------------
alter table public.departments enable row level security;

drop policy if exists dept_select on public.departments;
create policy dept_select on public.departments
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists dept_write on public.departments;
create policy dept_write on public.departments
  for all to authenticated
  using (public.has_capability(organization_id, 'org.admin'))
  with check (public.has_capability(organization_id, 'org.admin'));

grant select, insert, update, delete on public.departments to authenticated;

alter table public.department_managers enable row level security;

drop policy if exists dm_select on public.department_managers;
create policy dm_select on public.department_managers
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.departments d
      where d.id = department_managers.department_id
        and public.has_capability(d.organization_id, 'org.admin')
    )
  );

drop policy if exists dm_write on public.department_managers;
create policy dm_write on public.department_managers
  for all to authenticated
  using (
    exists (
      select 1 from public.departments d
      where d.id = department_managers.department_id
        and public.has_capability(d.organization_id, 'org.admin')
    )
  )
  with check (
    exists (
      select 1 from public.departments d
      where d.id = department_managers.department_id
        and public.has_capability(d.organization_id, 'org.admin')
    )
  );

grant select, insert, update, delete on public.department_managers to authenticated;

-- ---------------------------------------------------------------------------
-- Tighten survey_responses: block direct SELECT of raw rows for managers (admins only)
-- ---------------------------------------------------------------------------
drop policy if exists survey_responses_select on public.survey_responses;
create policy survey_responses_select on public.survey_responses
  for select to authenticated
  using (
    exists (
      select 1 from public.surveys s
      where s.id = survey_responses.survey_id
        and public.is_org_member(s.organization_id)
        and (
          public.has_capability(s.organization_id, 'org.admin')
          or public.has_capability(s.organization_id, 'surveys.admin')
        )
    )
  );

-- Allow users to see own legacy rows if any
drop policy if exists survey_responses_select_own on public.survey_responses;
create policy survey_responses_select_own on public.survey_responses
  for select to authenticated
  using (
    respondent_user_id is not null
    and respondent_user_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Tasks: survey action plans from managers
-- ---------------------------------------------------------------------------
drop policy if exists tasks_insert_survey_action on public.tasks;
create policy tasks_insert_survey_action on public.tasks
  for insert to authenticated
  with check (
    source_survey_id is not null
    and source_department_id is not null
    and public.is_org_member(organization_id)
    and public.user_manages_department(source_department_id, (select auth.uid()))
    and exists (
      select 1 from public.surveys s
      where s.id = source_survey_id
        and s.organization_id = tasks.organization_id
    )
  );

drop policy if exists tasks_update_survey_action on public.tasks;
create policy tasks_update_survey_action on public.tasks
  for update to authenticated
  using (
    source_survey_id is not null
    and source_department_id is not null
    and public.user_manages_department(source_department_id, (select auth.uid()))
  )
  with check (
    source_survey_id is not null
    and source_department_id is not null
    and public.user_manages_department(source_department_id, (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Tasks SELECT: merge HSE-linked rules with general org tasks + survey action tasks
-- ---------------------------------------------------------------------------
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      (
        source_hse_record_id is null
        and source_survey_id is null
      )
      or (
        source_hse_record_id is not null
        and exists (
          select 1 from public.hse_records h
          where h.id = tasks.source_hse_record_id
            and h.organization_id = tasks.organization_id
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
      or (
        source_survey_id is not null
        and source_department_id is not null
        and (
          public.has_capability(organization_id, 'org.admin')
          or public.has_capability(organization_id, 'surveys.admin')
          or public.user_manages_department(source_department_id, (select auth.uid()))
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- survey_responses INSERT: anonymous surveys must not store user id on the row
-- ---------------------------------------------------------------------------
drop policy if exists survey_responses_insert on public.survey_responses;
create policy survey_responses_insert on public.survey_responses
  for insert to authenticated
  with check (
    exists (
      select 1 from public.surveys s
      where s.id = survey_responses.survey_id
        and s.status = 'published'
        and public.is_org_member(s.organization_id)
        and (
          public.has_capability(s.organization_id, 'surveys.respond')
          or public.has_capability(s.organization_id, 'org.admin')
        )
        and (
          (s.anonymous = true and respondent_user_id is null)
          or (coalesce(s.anonymous, false) = false and respondent_user_id = (select auth.uid()))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Default department per org (for member assignment)
-- ---------------------------------------------------------------------------
insert into public.departments (organization_id, slug, name, sort_order)
select o.id, 'whole-organization', '{"en":"Whole organization","nb":"Hele virksomheten"}'::jsonb, 0
from public.organizations o
on conflict (organization_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Seed template surveys (draft — admin must publish)
-- ---------------------------------------------------------------------------
insert into public.surveys (organization_id, title, description, anonymous, status, survey_type)
select o.id,
  '{"en":"Pulse check","nb":"Pulsmåling"}'::jsonb,
  '{"en":"Short weekly pulse","nb":"Kort ukentlig pulsmåling"}'::jsonb,
  true,
  'draft',
  'pulse'
from public.organizations o
where not exists (
  select 1 from public.surveys s
  where s.organization_id = o.id and s.survey_type = 'pulse' and s.status = 'draft'
);

insert into public.surveys (organization_id, title, description, anonymous, status, survey_type)
select o.id,
  '{"en":"Psychosocial work environment (AML 4-3)","nb":"Psykososialt arbeidsmiljø (AML 4-3)"}'::jsonb,
  '{"en":"Annual culture and safety survey","nb":"Årlig kultur- og sikkerhetsundersøkelse"}'::jsonb,
  true,
  'draft',
  'culture'
from public.organizations o
where not exists (
  select 1 from public.surveys s
  where s.organization_id = o.id and s.survey_type = 'culture' and s.status = 'draft'
);

-- Pulse questions (positions 1–4)
insert into public.survey_questions (survey_id, position, question, response_type, question_category, is_enps, is_psychological_safety, options)
select s.id, 1,
  '{"en":"How is your mood at work this week?","nb":"Hvordan er humøret på jobb denne uken?"}'::jsonb,
  'likert_5', 'wellbeing', false, false, null
from public.surveys s
join public.organizations o on o.id = s.organization_id
where s.survey_type = 'pulse' and s.status = 'draft'
  and not exists (select 1 from public.survey_questions q where q.survey_id = s.id and q.position = 1);

insert into public.survey_questions (survey_id, position, question, response_type, question_category, is_enps, is_psychological_safety, options)
select s.id, 2,
  '{"en":"How manageable is your workload right now?","nb":"Hvor håndterbar er arbeidsmengden nå?"}'::jsonb,
  'likert_5', 'workload', false, false, null
from public.surveys s
where s.survey_type = 'pulse' and s.status = 'draft'
  and not exists (select 1 from public.survey_questions q where q.survey_id = s.id and q.position = 2);

insert into public.survey_questions (survey_id, position, question, response_type, question_category, is_enps, is_psychological_safety, options)
select s.id, 3,
  '{"en":"How likely are you to recommend working here to a friend or colleague? (0 = not at all, 10 = extremely likely)","nb":"Hvor sannsynlig er det at du anbefaler å jobbe her til en venn eller kollega? (0 = ikke i det hele tatt, 10 = svært sannsynlig)"}'::jsonb,
  'single_choice', null, true, false,
  '{"en":["0","1","2","3","4","5","6","7","8","9","10"],"nb":["0","1","2","3","4","5","6","7","8","9","10"]}'::jsonb
from public.surveys s
where s.survey_type = 'pulse' and s.status = 'draft'
  and not exists (select 1 from public.survey_questions q where q.survey_id = s.id and q.position = 3);

insert into public.survey_questions (survey_id, position, question, response_type, question_category, is_enps, is_psychological_safety, options)
select s.id, 4,
  '{"en":"Anything you want to add? (optional)","nb":"Noe du vil legge til? (valgfritt)"}'::jsonb,
  'text', null, false, false, null
from public.surveys s
where s.survey_type = 'pulse' and s.status = 'draft'
  and not exists (select 1 from public.survey_questions q where q.survey_id = s.id and q.position = 4);

-- Culture: psychological safety (Likert) + role clarity sample
insert into public.survey_questions (survey_id, position, question, response_type, question_category, is_enps, is_psychological_safety, options)
select s.id, 1,
  '{"en":"If I make a mistake on this team, it is not held against me.","nb":"Hvis jeg gjør en feil i dette teamet, blir det ikke holdt mot meg."}'::jsonb,
  'likert_5', 'psychological_safety', false, true, null
from public.surveys s
where s.survey_type = 'culture' and s.status = 'draft'
  and not exists (select 1 from public.survey_questions q where q.survey_id = s.id and q.position = 1);

insert into public.survey_questions (survey_id, position, question, response_type, question_category, is_enps, is_psychological_safety, options)
select s.id, 2,
  '{"en":"It is safe to take a risk on this team.","nb":"Det er trygt å ta en risiko i dette teamet."}'::jsonb,
  'likert_5', 'psychological_safety', false, true, null
from public.surveys s
where s.survey_type = 'culture' and s.status = 'draft'
  and not exists (select 1 from public.survey_questions q where q.survey_id = s.id and q.position = 2);

insert into public.survey_questions (survey_id, position, question, response_type, question_category, is_enps, is_psychological_safety, options)
select s.id, 3,
  '{"en":"My role and responsibilities are clear.","nb":"Rollen og ansvarsområdene mine er klare."}'::jsonb,
  'likert_5', 'role_clarity', false, false, null
from public.surveys s
where s.survey_type = 'culture' and s.status = 'draft'
  and not exists (select 1 from public.survey_questions q where q.survey_id = s.id and q.position = 3);

insert into public.survey_questions (survey_id, position, question, response_type, question_category, is_enps, is_psychological_safety, options)
select s.id, 4,
  '{"en":"How likely are you to recommend working here? (0–10)","nb":"Hvor sannsynlig er det at du anbefaler å jobbe her? (0–10)"}'::jsonb,
  'single_choice', null, true, false,
  '{"en":["0","1","2","3","4","5","6","7","8","9","10"],"nb":["0","1","2","3","4","5","6","7","8","9","10"]}'::jsonb
from public.surveys s
where s.survey_type = 'culture' and s.status = 'draft'
  and not exists (select 1 from public.survey_questions q where q.survey_id = s.id and q.position = 4);
