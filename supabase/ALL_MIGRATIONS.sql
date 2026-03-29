-- === 20250326180000_extensions.sql ===
-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- === 20250326180100_core_organization.sql ===
-- Core multi-tenant model: every business row references organization_id.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name jsonb not null default '{}'::jsonb,
  default_locale text not null default 'nb' check (default_locale in ('nb', 'en')),
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb
);

create table public.capabilities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label jsonb not null default '{}'::jsonb,
  module text not null
);

create table public.role_capabilities (
  role_id uuid not null references public.roles (id) on delete cascade,
  capability_id uuid not null references public.capabilities (id) on delete cascade,
  primary key (role_id, capability_id)
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id),
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role_id uuid not null references public.roles (id),
  invited_by uuid references auth.users (id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index organization_invitations_org_idx on public.organization_invitations (organization_id);

create table public.organization_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- === 20250326180200_compliance_functions.sql ===
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

-- === 20250326180300_tasks.sql ===
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'cancelled')),
  due_at timestamptz,
  assignee_user_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_org_idx on public.tasks (organization_id);

create table public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  label jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete set null
);

create index task_checklist_items_task_idx on public.task_checklist_items (task_id);

-- === 20250326180400_work_council.sql ===
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

-- === 20250326180500_hse_documents_surveys_reports_learning.sql ===
-- HSE
create table public.hse_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  record_type text not null check (record_type in ('risk_assessment', 'inspection', 'incident', 'action', 'other')),
  title jsonb not null default '{}'::jsonb,
  body jsonb not null default '{}'::jsonb,
  occurred_at date,
  status text not null default 'open',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index hse_records_org_idx on public.hse_records (organization_id);

-- Documents / wiki
create table public.wiki_spaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  name jsonb not null default '{}'::jsonb,
  unique (organization_id, slug)
);

create table public.wiki_pages (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.wiki_spaces (id) on delete cascade,
  parent_id uuid references public.wiki_pages (id) on delete set null,
  slug text not null,
  title jsonb not null default '{}'::jsonb,
  current_revision_id uuid,
  unique (space_id, slug)
);

create table public.wiki_page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.wiki_pages (id) on delete cascade,
  version int not null,
  editor_document jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (page_id, version)
);

alter table public.wiki_pages
  add constraint wiki_pages_current_revision_fk
  foreign key (current_revision_id) references public.wiki_page_revisions (id) on delete set null;

-- Surveys (psychosocial / MAP-style)
create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  anonymous boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now()
);

create table public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  position int not null,
  question jsonb not null default '{}'::jsonb,
  response_type text not null default 'likert_5' check (response_type in ('likert_5', 'text', 'single_choice')),
  unique (survey_id, position)
);

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  respondent_user_id uuid references auth.users (id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create index survey_responses_survey_idx on public.survey_responses (survey_id);

-- Whistleblowing / alerts
create table public.whistleblower_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  reference_code text not null unique,
  subject jsonb not null default '{}'::jsonb,
  body jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received', 'in_review', 'closed')),
  reporter_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index whistleblower_reports_org_idx on public.whistleblower_reports (organization_id);

-- E-learning (JSON-friendly blocks; import/export at application layer)
create table public.learning_courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  title jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  import_export jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.learning_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.learning_courses (id) on delete cascade,
  position int not null,
  module_type text not null check (
    module_type in ('rich_text', 'flash_cards', 'short_message', 'quiz', 'video', 'image_gallery')
  ),
  content jsonb not null default '{}'::jsonb,
  unique (course_id, position)
);

create table public.learning_enrollments (
  course_id uuid not null references public.learning_courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (course_id, user_id)
);

create table public.learning_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.learning_courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  module_id uuid not null references public.learning_modules (id) on delete cascade,
  score numeric,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- === 20250326180600_user_preferences.sql ===
create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_organization_id uuid references public.organizations (id) on delete set null,
  ui_locale text check (ui_locale in ('nb', 'en')),
  updated_at timestamptz not null default now()
);

-- === 20250326180700_rls_helpers_and_policies.sql ===
-- Row level security: organization isolation + capability checks.

alter table public.organizations enable row level security;
alter table public.roles enable row level security;
alter table public.capabilities enable row level security;
alter table public.role_capabilities enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.compliance_functions enable row level security;
alter table public.user_preferences enable row level security;
alter table public.tasks enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.work_council_meetings enable row level security;
alter table public.work_council_agenda_items enable row level security;
alter table public.work_council_participants enable row level security;
alter table public.work_council_audit_events enable row level security;
alter table public.work_council_ballots enable row level security;
alter table public.work_council_ballot_options enable row level security;
alter table public.work_council_votes enable row level security;
alter table public.hse_records enable row level security;
alter table public.wiki_spaces enable row level security;
alter table public.wiki_pages enable row level security;
alter table public.wiki_page_revisions enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_questions enable row level security;
alter table public.survey_responses enable row level security;
alter table public.whistleblower_reports enable row level security;
alter table public.learning_courses enable row level security;
alter table public.learning_modules enable row level security;
alter table public.learning_enrollments enable row level security;
alter table public.learning_quiz_attempts enable row level security;

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_capability(p_org uuid, p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.role_capabilities rc on rc.role_id = m.role_id
    join public.capabilities c on c.id = rc.capability_id
    where m.organization_id = p_org
      and m.user_id = (select auth.uid())
      and c.code = p_code
  );
$$;

grant usage on schema public to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_capability(uuid, text) to authenticated;

-- Global read catalogues
create policy roles_read on public.roles
  for select to authenticated using (true);

create policy capabilities_read on public.capabilities
  for select to authenticated using (true);

create policy role_capabilities_read on public.role_capabilities
  for select to authenticated using (true);

create policy compliance_functions_read on public.compliance_functions
  for select to authenticated using (true);

-- Organizations
create policy organizations_select on public.organizations
  for select to authenticated using (public.is_org_member(id));

create policy organizations_update on public.organizations
  for update to authenticated
  using (public.has_capability(id, 'org.admin'))
  with check (public.has_capability(id, 'org.admin'));

-- Members: everyone in the org can see membership; only org admins mutate.
create policy organization_members_select on public.organization_members
  for select to authenticated using (public.is_org_member(organization_id));

create policy organization_members_insert on public.organization_members
  for insert to authenticated
  with check (public.has_capability(organization_id, 'org.admin'));

create policy organization_members_update on public.organization_members
  for update to authenticated
  using (public.has_capability(organization_id, 'org.admin'))
  with check (public.has_capability(organization_id, 'org.admin'));

create policy organization_members_delete on public.organization_members
  for delete to authenticated
  using (public.has_capability(organization_id, 'org.admin'));

-- Invitations
create policy organization_invitations_select on public.organization_invitations
  for select to authenticated using (public.has_capability(organization_id, 'org.admin'));

create policy organization_invitations_write on public.organization_invitations
  for insert to authenticated
  with check (public.has_capability(organization_id, 'org.admin'));

create policy organization_invitations_update on public.organization_invitations
  for update to authenticated
  using (public.has_capability(organization_id, 'org.admin'))
  with check (public.has_capability(organization_id, 'org.admin'));

-- Settings
create policy organization_settings_select on public.organization_settings
  for select to authenticated using (public.is_org_member(organization_id));

create policy organization_settings_write on public.organization_settings
  for all to authenticated
  using (public.has_capability(organization_id, 'org.admin'))
  with check (public.has_capability(organization_id, 'org.admin'));

-- User preferences
create policy user_preferences_own on public.user_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Tasks
create policy tasks_select on public.tasks
  for select to authenticated using (public.is_org_member(organization_id));

create policy tasks_write on public.tasks
  for insert to authenticated
  with check (
    public.has_capability(organization_id, 'tasks.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy tasks_update on public.tasks
  for update to authenticated
  using (
    public.has_capability(organization_id, 'tasks.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'tasks.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (
    public.has_capability(organization_id, 'tasks.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy task_checklist_select on public.task_checklist_items
  for select to authenticated using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_org_member(t.organization_id)
    )
  );

create policy task_checklist_write on public.task_checklist_items
  for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          public.has_capability(t.organization_id, 'tasks.write')
          or public.has_capability(t.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          public.has_capability(t.organization_id, 'tasks.write')
          or public.has_capability(t.organization_id, 'org.admin')
        )
    )
  );

-- Work council
create policy wc_meetings_select on public.work_council_meetings
  for select to authenticated using (public.is_org_member(organization_id));

create policy wc_meetings_write on public.work_council_meetings
  for all to authenticated
  using (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy wc_agenda_select on public.work_council_agenda_items
  for select to authenticated using (
    exists (
      select 1 from public.work_council_meetings m
      where m.id = meeting_id and public.is_org_member(m.organization_id)
    )
  );

create policy wc_agenda_write on public.work_council_agenda_items
  for all to authenticated
  using (
    exists (
      select 1 from public.work_council_meetings m
      where m.id = meeting_id
        and (
          public.has_capability(m.organization_id, 'work_council.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.work_council_meetings m
      where m.id = meeting_id
        and (
          public.has_capability(m.organization_id, 'work_council.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  );

create policy wc_participants_select on public.work_council_participants
  for select to authenticated using (
    exists (
      select 1 from public.work_council_meetings m
      where m.id = meeting_id and public.is_org_member(m.organization_id)
    )
  );

create policy wc_participants_write on public.work_council_participants
  for all to authenticated
  using (
    exists (
      select 1 from public.work_council_meetings m
      where m.id = meeting_id
        and (
          public.has_capability(m.organization_id, 'work_council.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.work_council_meetings m
      where m.id = meeting_id
        and (
          public.has_capability(m.organization_id, 'work_council.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  );

create policy wc_audit_select on public.work_council_audit_events
  for select to authenticated using (public.is_org_member(organization_id));

create policy wc_audit_insert on public.work_council_audit_events
  for insert to authenticated
  with check (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy wc_ballots_select on public.work_council_ballots
  for select to authenticated using (public.is_org_member(organization_id));

create policy wc_ballots_write on public.work_council_ballots
  for all to authenticated
  using (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy wc_ballot_options_select on public.work_council_ballot_options
  for select to authenticated using (
    exists (
      select 1 from public.work_council_ballots b
      where b.id = ballot_id and public.is_org_member(b.organization_id)
    )
  );

create policy wc_ballot_options_write on public.work_council_ballot_options
  for all to authenticated
  using (
    exists (
      select 1 from public.work_council_ballots b
      where b.id = ballot_id
        and (
          public.has_capability(b.organization_id, 'work_council.write')
          or public.has_capability(b.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.work_council_ballots b
      where b.id = ballot_id
        and (
          public.has_capability(b.organization_id, 'work_council.write')
          or public.has_capability(b.organization_id, 'org.admin')
        )
    )
  );

create policy wc_votes_select on public.work_council_votes
  for select to authenticated using (
    exists (
      select 1 from public.work_council_ballots b
      where b.id = ballot_id and public.is_org_member(b.organization_id)
    )
  );

create policy wc_votes_insert on public.work_council_votes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.work_council_ballots b
      where b.id = ballot_id
        and b.status = 'open'
        and (
          public.has_capability(b.organization_id, 'work_council.vote')
          or public.has_capability(b.organization_id, 'org.admin')
        )
    )
  );

-- HSE
create policy hse_select on public.hse_records
  for select to authenticated using (public.is_org_member(organization_id));

create policy hse_write on public.hse_records
  for all to authenticated
  using (
    public.has_capability(organization_id, 'hse.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'hse.write')
    or public.has_capability(organization_id, 'org.admin')
  );

-- Wiki
create policy wiki_spaces_select on public.wiki_spaces
  for select to authenticated using (public.is_org_member(organization_id));

create policy wiki_spaces_write on public.wiki_spaces
  for all to authenticated
  using (
    public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy wiki_pages_select on public.wiki_pages
  for select to authenticated using (
    exists (
      select 1 from public.wiki_spaces s
      where s.id = space_id and public.is_org_member(s.organization_id)
    )
  );

create policy wiki_pages_write on public.wiki_pages
  for all to authenticated
  using (
    exists (
      select 1 from public.wiki_spaces s
      where s.id = space_id
        and (
          public.has_capability(s.organization_id, 'wiki.write')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.wiki_spaces s
      where s.id = space_id
        and (
          public.has_capability(s.organization_id, 'wiki.write')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

create policy wiki_revisions_select on public.wiki_page_revisions
  for select to authenticated using (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id and public.is_org_member(s.organization_id)
    )
  );

create policy wiki_revisions_write on public.wiki_page_revisions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id
        and (
          public.has_capability(s.organization_id, 'wiki.write')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

-- Surveys
create policy surveys_select on public.surveys
  for select to authenticated using (
    public.is_org_member(organization_id)
    and (
      status = 'published'
      or public.has_capability(organization_id, 'surveys.admin')
      or public.has_capability(organization_id, 'org.admin')
    )
  );

create policy surveys_admin on public.surveys
  for all to authenticated
  using (
    public.has_capability(organization_id, 'surveys.admin')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'surveys.admin')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy survey_questions_select on public.survey_questions
  for select to authenticated using (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id
        and public.is_org_member(s.organization_id)
        and (
          s.status = 'published'
          or public.has_capability(s.organization_id, 'surveys.admin')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

create policy survey_questions_write on public.survey_questions
  for all to authenticated
  using (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id
        and (
          public.has_capability(s.organization_id, 'surveys.admin')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id
        and (
          public.has_capability(s.organization_id, 'surveys.admin')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

create policy survey_responses_insert on public.survey_responses
  for insert to authenticated
  with check (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id
        and s.status = 'published'
        and public.is_org_member(s.organization_id)
        and (
          public.has_capability(s.organization_id, 'surveys.respond')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

create policy survey_responses_select on public.survey_responses
  for select to authenticated using (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id
        and public.is_org_member(s.organization_id)
        and (
          public.has_capability(s.organization_id, 'surveys.admin')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

-- Whistleblowing
create policy wb_insert on public.whistleblower_reports
  for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'whistleblower.submit')
      or public.has_capability(organization_id, 'org.admin')
    )
  );

create policy wb_select on public.whistleblower_reports
  for select to authenticated using (
    public.is_org_member(organization_id)
    and (
      reporter_user_id = (select auth.uid())
      or public.has_capability(organization_id, 'whistleblower.review')
      or public.has_capability(organization_id, 'org.admin')
    )
  );

create policy wb_update on public.whistleblower_reports
  for update to authenticated
  using (
    public.has_capability(organization_id, 'whistleblower.review')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'whistleblower.review')
    or public.has_capability(organization_id, 'org.admin')
  );

-- Learning
create policy learning_courses_select on public.learning_courses
  for select to authenticated using (
    public.is_org_member(organization_id)
    and (
      published = true
      or public.has_capability(organization_id, 'learning.author')
      or public.has_capability(organization_id, 'org.admin')
    )
  );

create policy learning_courses_write on public.learning_courses
  for all to authenticated
  using (
    public.has_capability(organization_id, 'learning.author')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'learning.author')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy learning_modules_select on public.learning_modules
  for select to authenticated using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and public.is_org_member(c.organization_id)
        and (
          c.published = true
          or public.has_capability(c.organization_id, 'learning.author')
          or public.has_capability(c.organization_id, 'org.admin')
        )
    )
  );

create policy learning_modules_write on public.learning_modules
  for all to authenticated
  using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          public.has_capability(c.organization_id, 'learning.author')
          or public.has_capability(c.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          public.has_capability(c.organization_id, 'learning.author')
          or public.has_capability(c.organization_id, 'org.admin')
        )
    )
  );

create policy learning_enrollments_select on public.learning_enrollments
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and public.is_org_member(c.organization_id)
    )
  );

create policy learning_enrollments_insert on public.learning_enrollments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and public.is_org_member(c.organization_id)
        and (
          public.has_capability(c.organization_id, 'learning.enroll')
          or public.has_capability(c.organization_id, 'org.admin')
        )
    )
  );

create policy learning_enrollments_update on public.learning_enrollments
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and public.is_org_member(c.organization_id)
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and public.is_org_member(c.organization_id)
    )
  );

create policy learning_quiz_attempts_own on public.learning_quiz_attempts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- === 20250326180800_grants_seed_bootstrap.sql ===
-- Grants: Supabase uses the authenticated role for JWT-backed clients.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Roles (labour-law aligned names; labels are localized JSON)
insert into public.roles (code, label, description) values
  ('org_admin', '{"nb":"Organisasjonsadministrator","en":"Organization administrator"}', '{"nb":"Full tilgang til organisasjonen","en":"Full access within the organization"}'),
  ('employer_rep', '{"nb":"Arbeidsgiverrepresentant","en":"Employer representative"}', '{"nb":"Lederansvar etter AML","en":"Employer duties under the WEA"}'),
  ('safety_rep', '{"nb":"Verneombud","en":"Elected safety representative"}', '{"nb":"Verneombudsroller etter AML","en":"Safety representative under the WEA"}'),
  ('work_council_chair', '{"nb":"AMU-leder","en":"Work environment committee chair"}', '{"nb":"Møteledelse og protokoll","en":"Meeting leadership and minutes"}'),
  ('employee', '{"nb":"Ansatt","en":"Employee"}', '{"nb":"Grunnleggende tilgang","en":"Baseline access"}')
on conflict (code) do nothing;

-- Capabilities (fine-grained; assign via roles in role_capabilities)
insert into public.capabilities (code, label, module) values
  ('org.admin', '{"nb":"Organisasjonsadministrasjon","en":"Organization administration"}', 'settings'),
  ('tasks.write', '{"nb":"Oppgaver og sjekklister","en":"Tasks and checklists"}', 'tasks'),
  ('work_council.write', '{"nb":"AMU / verneråd (redigere)","en":"Work council (edit)"}', 'work_council'),
  ('work_council.vote', '{"nb":"Stemme i valg","en":"Vote in ballots"}', 'work_council'),
  ('hse.write', '{"nb":"HMS-registre","en":"HSE registers"}', 'hse'),
  ('wiki.write', '{"nb":"Wiki og dokumenter","en":"Wiki and documents"}', 'documents'),
  ('surveys.admin', '{"nb":"Undersøkelser (admin)","en":"Surveys (admin)"}', 'surveys'),
  ('surveys.respond', '{"nb":"Besvare undersøkelser","en":"Respond to surveys"}', 'surveys'),
  ('whistleblower.submit', '{"nb":"Sende varsel","en":"Submit whistleblowing report"}', 'reports'),
  ('whistleblower.review', '{"nb":"Behandle varsler","en":"Review whistleblowing"}', 'reports'),
  ('learning.author', '{"nb":"E-læring (forfatter)","en":"E-learning (author)"}', 'learning'),
  ('learning.enroll', '{"nb":"E-læring (påmelding)","en":"E-learning (enroll)"}', 'learning')
on conflict (code) do nothing;

insert into public.role_capabilities (role_id, capability_id)
select r.id, c.id
from public.roles r
cross join public.capabilities c
where r.code = 'org_admin'
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_id)
select r.id, c.id from public.roles r join public.capabilities c on c.code in (
  'tasks.write','work_council.write','work_council.vote','hse.write','wiki.write',
  'surveys.admin','surveys.respond','whistleblower.submit','learning.author','learning.enroll'
) where r.code = 'employer_rep'
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_id)
select r.id, c.id from public.roles r join public.capabilities c on c.code in (
  'tasks.write','work_council.write','work_council.vote','hse.write','wiki.write',
  'surveys.admin','surveys.respond','whistleblower.submit','learning.enroll'
) where r.code = 'safety_rep'
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_id)
select r.id, c.id from public.roles r join public.capabilities c on c.code in (
  'tasks.write','work_council.write','work_council.vote','wiki.write','surveys.respond','whistleblower.submit','learning.enroll'
) where r.code = 'work_council_chair'
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_id)
select r.id, c.id from public.roles r join public.capabilities c on c.code in (
  'surveys.respond','whistleblower.submit','learning.enroll'
) where r.code = 'employee'
on conflict do nothing;

-- High-level mapping to the Working Environment Act (Arbeidsmiljøloven) structure.
-- Expand or refine via admin tooling; the product reads from this table.
insert into public.compliance_functions (code, title, summary, module, sort_order) values
  ('aml_ch2', '{"nb":"Kapittel 2 — Retten til et fullverdig arbeidsmiljø","en":"Chapter 2 — Right to a fully satisfactory working environment"}', '{"nb":"Overordnede krav og samarbeid","en":"Overarching requirements and cooperation"}', 'dashboard', 10),
  ('aml_ch3', '{"nb":"Kapittel 3 — Det ytre arbeidsmiljø","en":"Chapter 3 — External environment"}', '{"nb":"Bygninger, arbeidsutstyr, ergonomi","en":"Premises, work equipment, ergonomics"}', 'hse', 20),
  ('aml_ch4', '{"nb":"Kapittel 4 — Det psykiske arbeidsmiljø","en":"Chapter 4 — Psychosocial environment"}', '{"nb":"Kartlegging, undersøkelser og tiltak","en":"Assessment, surveys, and measures"}', 'surveys', 30),
  ('aml_ch5', '{"nb":"Kapittel 5 — Verneombud og arbeidsmiljøutvalg","en":"Chapter 5 — Safety reps and work environment committees"}', '{"nb":"Møter, valg og medvirkning","en":"Meetings, elections, and participation"}', 'work_council', 40),
  ('aml_ch6', '{"nb":"Kapittel 6 — Arbeidstakers plikter og rettigheter","en":"Chapter 6 — Employee duties and rights"}', '{"nb":"Opplæring, medvirkning, varsel","en":"Training, participation, reporting"}', 'learning', 50),
  ('aml_ch9', '{"nb":"Kapittel 9 — Systematisk HMS-arbeid","en":"Chapter 9 — Systematic HSE work"}', '{"nb":"Internkontroll og dokumentasjon","en":"Internal control and documentation"}', 'documents', 60),
  ('aml_ch10', '{"nb":"Kapittel 10 — Tilsyn og sanksjoner","en":"Chapter 10 — Supervision and sanctions"}', '{"nb":"Oppfølging fra myndigheter","en":"Authority follow-up"}', 'tasks', 70)
on conflict (code) do nothing;

-- Bootstrap: first organization for a newly registered user (adjust in production if you use invites-only).
create or replace function public.bootstrap_user_organization(
  p_slug text,
  p_name jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_role uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.organization_members where user_id = v_uid) then
    raise exception 'User already belongs to an organization';
  end if;

  insert into public.organizations (slug, name)
  values (p_slug, coalesce(p_name, '{}'::jsonb))
  returning id into v_org;

  select id into v_role from public.roles where code = 'org_admin' limit 1;

  insert into public.organization_members (organization_id, user_id, role_id)
  values (v_org, v_uid, v_role);

  insert into public.organization_settings (organization_id)
  values (v_org)
  on conflict (organization_id) do nothing;

  insert into public.user_preferences (user_id, active_organization_id)
  values (v_uid, v_org)
  on conflict (user_id) do update set active_organization_id = excluded.active_organization_id, updated_at = now();

  return v_org;
end;
$$;

grant execute on function public.bootstrap_user_organization(text, jsonb) to authenticated;

-- === 20250326210000_invitation_rpcs.sql ===
-- Invitation create/accept via security definer RPCs (plain token never stored).
-- Direct INSERT/UPDATE on organization_invitations removed for authenticated;
-- only definer functions mutate invites.

drop policy if exists organization_invitations_write on public.organization_invitations;
drop policy if exists organization_invitations_update on public.organization_invitations;

create unique index if not exists organization_invitations_pending_email_idx
  on public.organization_invitations (organization_id, lower(email))
  where accepted_at is null;

-- Preview for invite landing page (anyone with the link).
create or replace function public.get_invitation_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_slug text;
  v_name jsonb;
  v_exp timestamptz;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return null;
  end if;

  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  select o.slug, o.name, i.expires_at
  into v_slug, v_name, v_exp
  from public.organization_invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token_hash = v_hash
    and i.accepted_at is null
    and i.expires_at > now();

  if v_slug is null then
    return null;
  end if;

  return jsonb_build_object(
    'organization_slug', v_slug,
    'organization_name', coalesce(v_name, '{}'::jsonb),
    'expires_at', v_exp
  );
end;
$$;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;

create or replace function public.create_organization_invitation(
  p_organization_id uuid,
  p_email text,
  p_role_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_hash text;
  v_invite_id uuid;
  v_norm text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_capability(p_organization_id, 'org.admin') then
    raise exception 'Forbidden';
  end if;

  v_norm := lower(trim(p_email));
  if v_norm !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid email';
  end if;

  if not exists (
    select 1 from public.roles r where r.id = p_role_id
  ) then
    raise exception 'Invalid role';
  end if;

  if exists (
    select 1
    from public.organization_invitations i
    where i.organization_id = p_organization_id
      and lower(i.email) = v_norm
      and i.accepted_at is null
      and i.expires_at > now()
  ) then
    raise exception 'An active invitation already exists for this email';
  end if;

  if exists (
    select 1
    from auth.users u
    join public.organization_members m on m.user_id = u.id and m.organization_id = p_organization_id
    where lower(u.email) = v_norm
  ) then
    raise exception 'This user is already a member of the organization';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.organization_invitations (
    organization_id, email, role_id, invited_by, token_hash, expires_at
  )
  values (
    p_organization_id, v_norm, p_role_id, auth.uid(), v_hash, now() + interval '14 days'
  )
  returning id into v_invite_id;

  return jsonb_build_object('id', v_invite_id, 'token', v_token);
end;
$$;

grant execute on function public.create_organization_invitation(uuid, text, uuid) to authenticated;

create or replace function public.accept_organization_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_inv public.organization_invitations%rowtype;
  v_user_email text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select lower(trim(email)) into v_user_email from auth.users where id = v_uid;
  if v_user_email is null or v_user_email = '' then
    raise exception 'Your account has no email address';
  end if;

  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  select * into v_inv
  from public.organization_invitations
  where token_hash = v_hash
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invalid or expired invitation';
  end if;

  if lower(trim(v_inv.email)) <> v_user_email then
    raise exception 'Sign in with the email address that received the invitation';
  end if;

  if exists (
    select 1 from public.organization_members where user_id = v_uid
  ) then
    if exists (
      select 1 from public.organization_members
      where user_id = v_uid and organization_id = v_inv.organization_id
    ) then
      update public.organization_invitations
      set accepted_at = coalesce(accepted_at, now())
      where id = v_inv.id;
      return v_inv.organization_id;
    end if;
    raise exception 'You already belong to another organization';
  end if;

  insert into public.organization_members (organization_id, user_id, role_id)
  values (v_inv.organization_id, v_uid, v_inv.role_id);

  update public.organization_invitations
  set accepted_at = now()
  where id = v_inv.id;

  insert into public.organization_settings (organization_id)
  values (v_inv.organization_id)
  on conflict (organization_id) do nothing;

  insert into public.user_preferences (user_id, active_organization_id)
  values (v_uid, v_inv.organization_id)
  on conflict (user_id) do update
  set active_organization_id = excluded.active_organization_id,
      updated_at = now();

  return v_inv.organization_id;
end;
$$;

grant execute on function public.accept_organization_invitation(text) to authenticated;

create or replace function public.revoke_organization_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select organization_id into v_org
  from public.organization_invitations
  where id = p_invitation_id
    and accepted_at is null;

  if v_org is null then
    raise exception 'Invitation not found or already used';
  end if;

  if not public.has_capability(v_org, 'org.admin') then
    raise exception 'Forbidden';
  end if;

  delete from public.organization_invitations where id = p_invitation_id;
end;
$$;

grant execute on function public.revoke_organization_invitation(uuid) to authenticated;

-- === 20250326220000_learning_lms.sql ===
-- LMS: system-default catalog (all orgs) vs organization courses, platform admins, progress, expanded block types.

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- No direct reads for clients; access via has_platform_admin() only.
revoke all on public.platform_admins from authenticated;
revoke all on public.platform_admins from anon;

create or replace function public.has_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins p
    where p.user_id = (select auth.uid())
  );
$$;

grant execute on function public.has_platform_admin() to authenticated;

-- Courses: scope system_default (organization_id null) or organization (organization_id set)
alter table public.learning_courses
  add column if not exists scope text not null default 'organization';

alter table public.learning_courses
  alter column organization_id drop not null;

alter table public.learning_courses
  drop constraint if exists learning_courses_organization_id_slug_key;

create unique index if not exists learning_courses_org_slug_idx
  on public.learning_courses (organization_id, slug)
  where organization_id is not null;

create unique index if not exists learning_courses_system_slug_idx
  on public.learning_courses (slug)
  where scope = 'system_default';

alter table public.learning_courses
  add constraint learning_courses_scope_org_check check (
    (scope = 'organization' and organization_id is not null)
    or (scope = 'system_default' and organization_id is null)
  );

update public.learning_courses set scope = 'organization' where organization_id is not null;

-- Widen block types for modular LMS content
alter table public.learning_modules drop constraint if exists learning_modules_module_type_check;

alter table public.learning_modules add constraint learning_modules_module_type_check check (
  module_type in (
    'rich_text',
    'flash_cards',
    'short_message',
    'quiz',
    'video',
    'image_gallery',
    'micro_lesson',
    'executive_summary',
    'on_the_job',
    'reflection',
    'checklist'
  )
);

create table public.learning_module_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  module_id uuid not null references public.learning_modules (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id, organization_id)
);

create index learning_module_progress_user_org_idx on public.learning_module_progress (user_id, organization_id);

alter table public.learning_module_progress enable row level security;

-- Replace learning RLS policies
drop policy if exists learning_courses_select on public.learning_courses;
drop policy if exists learning_courses_write on public.learning_courses;
drop policy if exists learning_modules_select on public.learning_modules;
drop policy if exists learning_modules_write on public.learning_modules;
drop policy if exists learning_enrollments_select on public.learning_enrollments;
drop policy if exists learning_enrollments_insert on public.learning_enrollments;
drop policy if exists learning_enrollments_update on public.learning_enrollments;
drop policy if exists learning_quiz_attempts_own on public.learning_quiz_attempts;

create policy learning_courses_select on public.learning_courses
  for select to authenticated using (
    (
      scope = 'organization'
      and organization_id is not null
      and public.is_org_member(organization_id)
      and (
        published = true
        or public.has_capability(organization_id, 'learning.author')
        or public.has_capability(organization_id, 'org.admin')
      )
    )
    or (
      scope = 'system_default'
      and published = true
      and exists (select 1 from public.organization_members m where m.user_id = (select auth.uid()))
    )
    or (
      scope = 'system_default'
      and published = false
      and public.has_platform_admin()
    )
  );

create policy learning_courses_insert on public.learning_courses
  for insert to authenticated
  with check (
    (
      scope = 'organization'
      and organization_id is not null
      and public.is_org_member(organization_id)
      and (
        public.has_capability(organization_id, 'learning.author')
        or public.has_capability(organization_id, 'org.admin')
      )
    )
    or (
      scope = 'system_default'
      and organization_id is null
      and public.has_platform_admin()
    )
  );

create policy learning_courses_update on public.learning_courses
  for update to authenticated
  using (
    (
      scope = 'organization'
      and organization_id is not null
      and (
        public.has_capability(organization_id, 'learning.author')
        or public.has_capability(organization_id, 'org.admin')
      )
    )
    or (
      scope = 'system_default'
      and public.has_platform_admin()
    )
  )
  with check (
    (
      scope = 'organization'
      and organization_id is not null
      and (
        public.has_capability(organization_id, 'learning.author')
        or public.has_capability(organization_id, 'org.admin')
      )
    )
    or (
      scope = 'system_default'
      and organization_id is null
      and public.has_platform_admin()
    )
  );

create policy learning_courses_delete on public.learning_courses
  for delete to authenticated
  using (
    (
      scope = 'organization'
      and organization_id is not null
      and (
        public.has_capability(organization_id, 'learning.author')
        or public.has_capability(organization_id, 'org.admin')
      )
    )
    or (
      scope = 'system_default'
      and public.has_platform_admin()
    )
  );

create policy learning_modules_select on public.learning_modules
  for select to authenticated
  using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and public.is_org_member(c.organization_id)
            and (
              c.published = true
              or public.has_capability(c.organization_id, 'learning.author')
              or public.has_capability(c.organization_id, 'org.admin')
            )
          )
          or (
            c.scope = 'system_default'
            and c.published = true
            and exists (select 1 from public.organization_members m where m.user_id = (select auth.uid()))
          )
          or (
            c.scope = 'system_default'
            and c.published = false
            and public.has_platform_admin()
          )
        )
    )
  );

create policy learning_modules_insert on public.learning_modules
  for insert to authenticated
  with check (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and (
              public.has_capability(c.organization_id, 'learning.author')
              or public.has_capability(c.organization_id, 'org.admin')
            )
          )
          or (c.scope = 'system_default' and public.has_platform_admin())
        )
    )
  );

create policy learning_modules_update on public.learning_modules
  for update to authenticated
  using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and (
              public.has_capability(c.organization_id, 'learning.author')
              or public.has_capability(c.organization_id, 'org.admin')
            )
          )
          or (c.scope = 'system_default' and public.has_platform_admin())
        )
    )
  )
  with check (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and (
              public.has_capability(c.organization_id, 'learning.author')
              or public.has_capability(c.organization_id, 'org.admin')
            )
          )
          or (c.scope = 'system_default' and public.has_platform_admin())
        )
    )
  );

create policy learning_modules_delete on public.learning_modules
  for delete to authenticated
  using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and (
              public.has_capability(c.organization_id, 'learning.author')
              or public.has_capability(c.organization_id, 'org.admin')
            )
          )
          or (c.scope = 'system_default' and public.has_platform_admin())
        )
    )
  );

create policy learning_enrollments_select on public.learning_enrollments
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and public.is_org_member(c.organization_id)
          )
          or (
            c.scope = 'system_default'
            and exists (select 1 from public.organization_members m where m.user_id = (select auth.uid()))
          )
        )
    )
  );

create policy learning_enrollments_insert on public.learning_enrollments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and c.published = true
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and public.is_org_member(c.organization_id)
            and (
              public.has_capability(c.organization_id, 'learning.enroll')
              or public.has_capability(c.organization_id, 'org.admin')
            )
          )
          or (
            c.scope = 'system_default'
            and exists (select 1 from public.organization_members m where m.user_id = (select auth.uid()))
          )
        )
    )
  );

create policy learning_enrollments_update on public.learning_enrollments
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and public.is_org_member(c.organization_id)
          )
          or (c.scope = 'system_default')
        )
    )
  )
  with check (user_id = (select auth.uid()));

create policy learning_quiz_attempts_own on public.learning_quiz_attempts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.learning_module_progress to authenticated;

create policy learning_module_progress_select on public.learning_module_progress
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

create policy learning_module_progress_write on public.learning_module_progress
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

create policy learning_module_progress_update on public.learning_module_progress
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  )
  with check (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

create policy learning_module_progress_delete on public.learning_module_progress
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

-- === 20250326230000_lms_enhancements.sql ===
-- LMS enhancements: prerequisites, drip scheduling, resource library, extended content types,
-- course completion, assignments, gamification, certificates, forums.

-- Module release: drip after enrollment or fixed calendar time
alter table public.learning_modules
  add column if not exists release_rule jsonb not null default '{}'::jsonb;

comment on column public.learning_modules.release_rule is
  'Empty {} = visible immediately. {"after_enroll_days": N} = N days after enrollment. {"available_at": "ISO-8601"} = not before timestamp. If both set, later of the two applies.';

-- Course-level settings (gamification toggle, cert template id, etc.)
alter table public.learning_courses
  add column if not exists course_settings jsonb not null default '{}'::jsonb;

-- Prerequisite: must complete prerequisite_course before starting course_id (same org scope for org courses)
create table if not exists public.learning_course_prerequisites (
  course_id uuid not null references public.learning_courses (id) on delete cascade,
  prerequisite_course_id uuid not null references public.learning_courses (id) on delete cascade,
  primary key (course_id, prerequisite_course_id),
  check (course_id <> prerequisite_course_id)
);

create or replace function public.learning_prerequisite_same_org()
returns trigger
language plpgsql
as $$
declare
  o1 uuid;
  o2 uuid;
  s1 text;
  s2 text;
begin
  select organization_id, scope into o1, s1 from public.learning_courses where id = new.course_id;
  select organization_id, scope into o2, s2 from public.learning_courses where id = new.prerequisite_course_id;
  if s1 <> 'organization' or s2 <> 'organization' or o1 is null or o2 is null or o1 <> o2 then
    raise exception 'Prerequisites must be two organization courses in the same organization';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_prerequisite_same_org_trg on public.learning_course_prerequisites;
create trigger learning_prerequisite_same_org_trg
  before insert or update on public.learning_course_prerequisites
  for each row execute function public.learning_prerequisite_same_org();

create index if not exists learning_course_prerequisites_prereq_idx
  on public.learning_course_prerequisites (prerequisite_course_id);

-- Shared media / documents (org-scoped; system resources use org null + platform admin only — skip for now, org only)
create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  title jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  asset_type text not null check (asset_type in ('video', 'pdf', 'scorm', 'xapi', 'h5p', 'audio', 'image', 'other')),
  storage_path text,
  external_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists learning_resources_org_idx on public.learning_resources (organization_id);

create table if not exists public.learning_module_resources (
  module_id uuid not null references public.learning_modules (id) on delete cascade,
  resource_id uuid not null references public.learning_resources (id) on delete cascade,
  primary key (module_id, resource_id)
);

-- Course completion (for prerequisites & certificates)
create table if not exists public.learning_course_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.learning_courses (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, course_id, organization_id)
);

create index if not exists learning_course_completions_course_idx
  on public.learning_course_completions (course_id, organization_id);

-- Assignments
create table if not exists public.learning_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.learning_courses (id) on delete cascade,
  module_id uuid references public.learning_modules (id) on delete set null,
  title jsonb not null default '{}'::jsonb,
  instructions jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists learning_assignments_course_idx on public.learning_assignments (course_id);

create table if not exists public.learning_assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.learning_assignments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  storage_path text,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'graded', 'returned')),
  grade jsonb,
  feedback jsonb,
  submitted_at timestamptz not null default now(),
  unique (assignment_id, user_id)
);

create index if not exists learning_assignment_submissions_assign_idx
  on public.learning_assignment_submissions (assignment_id);

-- Gamification
create table if not exists public.learning_user_stats (
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  points int not null default 0,
  badges jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);

-- Certificates (PDF path filled by future job; metadata for recert)
create table if not exists public.learning_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.learning_courses (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  pdf_storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, course_id, organization_id)
);

create index if not exists learning_certificates_user_idx on public.learning_certificates (user_id, organization_id);

-- Forums
create table if not exists public.learning_forum_topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.learning_courses (id) on delete cascade,
  module_id uuid references public.learning_modules (id) on delete set null,
  title jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists learning_forum_topics_course_idx on public.learning_forum_topics (course_id);

create table if not exists public.learning_forum_posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.learning_forum_topics (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists learning_forum_posts_topic_idx on public.learning_forum_posts (topic_id);

-- Widen module types
alter table public.learning_modules drop constraint if exists learning_modules_module_type_check;

alter table public.learning_modules add constraint learning_modules_module_type_check check (
  module_type in (
    'rich_text',
    'flash_cards',
    'short_message',
    'quiz',
    'video',
    'image_gallery',
    'micro_lesson',
    'executive_summary',
    'on_the_job',
    'reflection',
    'checklist',
    'pdf',
    'scorm_xapi',
    'h5p',
    'assignment',
    'forum'
  )
);

-- RLS
alter table public.learning_course_prerequisites enable row level security;
alter table public.learning_resources enable row level security;
alter table public.learning_module_resources enable row level security;
alter table public.learning_course_completions enable row level security;
alter table public.learning_assignments enable row level security;
alter table public.learning_assignment_submissions enable row level security;
alter table public.learning_user_stats enable row level security;
alter table public.learning_certificates enable row level security;
alter table public.learning_forum_topics enable row level security;
alter table public.learning_forum_posts enable row level security;

-- Prerequisites: readable if can read both courses; write if can edit target course
create policy lcp_select on public.learning_course_prerequisites
  for select to authenticated using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (c.scope = 'system_default' and c.published and exists (select 1 from public.organization_members m where m.user_id = auth.uid()))
          or (c.scope = 'organization' and c.organization_id is not null and public.is_org_member(c.organization_id)
              and (c.published or public.has_capability(c.organization_id, 'learning.author') or public.has_capability(c.organization_id, 'org.admin')))
        )
    )
  );

create policy lcp_write on public.learning_course_prerequisites
  for all to authenticated
  using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and c.scope = 'organization'
        and c.organization_id is not null
        and (public.has_capability(c.organization_id, 'learning.author') or public.has_capability(c.organization_id, 'org.admin'))
    )
  )
  with check (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and c.scope = 'organization'
        and c.organization_id is not null
        and (public.has_capability(c.organization_id, 'learning.author') or public.has_capability(c.organization_id, 'org.admin'))
    )
  );

-- Resources
create policy lr_select on public.learning_resources
  for select to authenticated using (public.is_org_member(organization_id));

create policy lr_write on public.learning_resources
  for all to authenticated
  using (
    public.has_capability(organization_id, 'learning.author')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'learning.author')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy lmr_select on public.learning_module_resources
  for select to authenticated using (
    exists (
      select 1 from public.learning_modules m
      join public.learning_courses c on c.id = m.course_id
      where m.id = module_id
        and (
          (c.scope = 'system_default' and c.published and exists (select 1 from public.organization_members om where om.user_id = auth.uid()))
          or (c.scope = 'organization' and c.organization_id is not null and public.is_org_member(c.organization_id))
        )
    )
  );

create policy lmr_write on public.learning_module_resources
  for all to authenticated
  using (
    exists (
      select 1 from public.learning_modules m
      join public.learning_courses c on c.id = m.course_id
      where m.id = module_id
        and c.scope = 'organization'
        and c.organization_id is not null
        and (public.has_capability(c.organization_id, 'learning.author') or public.has_capability(c.organization_id, 'org.admin'))
    )
  )
  with check (
    exists (
      select 1 from public.learning_modules m
      join public.learning_courses c on c.id = m.course_id
      where m.id = module_id
        and c.scope = 'organization'
        and c.organization_id is not null
        and (public.has_capability(c.organization_id, 'learning.author') or public.has_capability(c.organization_id, 'org.admin'))
    )
  );

-- Completions
create policy lcc_select on public.learning_course_completions
  for select to authenticated using (
    user_id = auth.uid()
    or public.has_capability(organization_id, 'learning.author')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy lcc_insert on public.learning_course_completions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_org_member(organization_id)
  );

-- Assignments
create policy la_select on public.learning_assignments
  for select to authenticated using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (c.scope = 'system_default' and c.published and exists (select 1 from public.organization_members m where m.user_id = auth.uid()))
          or (c.scope = 'organization' and c.organization_id is not null and public.is_org_member(c.organization_id))
        )
    )
  );

create policy la_write on public.learning_assignments
  for all to authenticated
  using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and c.scope = 'organization'
        and c.organization_id is not null
        and (public.has_capability(c.organization_id, 'learning.author') or public.has_capability(c.organization_id, 'org.admin'))
    )
  )
  with check (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and c.scope = 'organization'
        and c.organization_id is not null
        and (public.has_capability(c.organization_id, 'learning.author') or public.has_capability(c.organization_id, 'org.admin'))
    )
  );

create policy las_select on public.learning_assignment_submissions
  for select to authenticated using (
    user_id = auth.uid()
    or public.has_capability(organization_id, 'learning.author')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy las_insert on public.learning_assignment_submissions
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_org_member(organization_id));

create policy las_update on public.learning_assignment_submissions
  for update to authenticated
  using (
    (user_id = auth.uid() and status = 'draft')
    or public.has_capability(organization_id, 'learning.author')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    (user_id = auth.uid() and status in ('draft', 'submitted'))
    or public.has_capability(organization_id, 'learning.author')
    or public.has_capability(organization_id, 'org.admin')
  );

-- Stats
create policy lus_select on public.learning_user_stats
  for select to authenticated using (public.is_org_member(organization_id));

create policy lus_own on public.learning_user_stats
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_org_member(organization_id));

create policy lus_update_own on public.learning_user_stats
  for update to authenticated
  using (user_id = auth.uid() and public.is_org_member(organization_id))
  with check (user_id = auth.uid() and public.is_org_member(organization_id));

-- Certificates
create policy lcert_select on public.learning_certificates
  for select to authenticated using (
    user_id = auth.uid()
    or public.has_capability(organization_id, 'learning.author')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy lcert_insert on public.learning_certificates
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_org_member(organization_id)
  );

-- Forum topics
create policy lft_select on public.learning_forum_topics
  for select to authenticated using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (c.scope = 'system_default' and c.published and exists (select 1 from public.organization_members m where m.user_id = auth.uid()))
          or (c.scope = 'organization' and c.organization_id is not null and public.is_org_member(c.organization_id))
        )
    )
  );

create policy lft_insert on public.learning_forum_topics
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (c.scope = 'system_default' and c.published and exists (select 1 from public.organization_members m where m.user_id = auth.uid()))
          or (c.scope = 'organization' and c.organization_id is not null and public.is_org_member(c.organization_id))
        )
    )
  );

-- Forum posts
create policy lfp_select on public.learning_forum_posts
  for select to authenticated using (
    exists (
      select 1 from public.learning_forum_topics t
      join public.learning_courses c on c.id = t.course_id
      where t.id = topic_id
        and (
          (c.scope = 'system_default' and c.published and exists (select 1 from public.organization_members m where m.user_id = auth.uid()))
          or (c.scope = 'organization' and c.organization_id is not null and public.is_org_member(c.organization_id))
        )
    )
  );

create policy lfp_insert on public.learning_forum_posts
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.learning_forum_topics t
      join public.learning_courses c on c.id = t.course_id
      where t.id = topic_id
        and (
          (c.scope = 'system_default' and c.published and exists (select 1 from public.organization_members m where m.user_id = auth.uid()))
          or (c.scope = 'organization' and c.organization_id is not null and public.is_org_member(c.organization_id))
        )
    )
  );

grant select, insert, update, delete on public.learning_course_prerequisites to authenticated;
grant select, insert, update, delete on public.learning_resources to authenticated;
grant select, insert, update, delete on public.learning_module_resources to authenticated;
grant select, insert, update, delete on public.learning_course_completions to authenticated;
grant select, insert, update, delete on public.learning_assignments to authenticated;
grant select, insert, update, delete on public.learning_assignment_submissions to authenticated;
grant select, insert, update, delete on public.learning_user_stats to authenticated;
grant select, insert, update, delete on public.learning_certificates to authenticated;
grant select, insert, update, delete on public.learning_forum_topics to authenticated;
grant select, insert, update, delete on public.learning_forum_posts to authenticated;

-- === 20250326240000_wiki_document_center.sql ===
-- Document center / wiki: publishing, approval, tags, favorites, search, presence, review reminders.

-- Page lifecycle and metadata
alter table public.wiki_pages
  add column if not exists publish_status text not null default 'published'
    check (publish_status in ('draft', 'pending_approval', 'published'));

alter table public.wiki_pages
  add column if not exists requires_approval boolean not null default false;

alter table public.wiki_pages
  add column if not exists review_reminder_months int check (review_reminder_months is null or review_reminder_months >= 1);

alter table public.wiki_pages
  add column if not exists next_review_at timestamptz;

alter table public.wiki_pages
  add column if not exists owner_user_id uuid references auth.users (id) on delete set null;

alter table public.wiki_pages
  add column if not exists template_key text;

alter table public.wiki_pages
  add column if not exists search_vector tsvector;

create index if not exists wiki_pages_search_idx on public.wiki_pages using gin (search_vector);

-- Plain text for full-text search (filled by app from blocks / markdown)
alter table public.wiki_page_revisions
  add column if not exists body_plain text not null default '';

alter table public.wiki_page_revisions
  add column if not exists revision_summary text;

-- Tags (org-scoped)
create table if not exists public.wiki_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  label jsonb not null default '{}'::jsonb,
  unique (organization_id, slug)
);

create index if not exists wiki_tags_org_idx on public.wiki_tags (organization_id);

create table if not exists public.wiki_page_tags (
  page_id uuid not null references public.wiki_pages (id) on delete cascade,
  tag_id uuid not null references public.wiki_tags (id) on delete cascade,
  primary key (page_id, tag_id)
);

-- Favorites / pins
create table if not exists public.wiki_page_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  page_id uuid not null references public.wiki_pages (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, page_id)
);

create index if not exists wiki_page_favorites_org_idx on public.wiki_page_favorites (organization_id);

-- Presence / collaboration (Realtime-friendly)
create table if not exists public.wiki_page_presence (
  page_id uuid not null references public.wiki_pages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  is_typing boolean not null default false,
  primary key (page_id, user_id)
);

create index if not exists wiki_page_presence_page_idx on public.wiki_page_presence (page_id, last_seen_at desc);

-- Replace wiki page SELECT: drafts visible to owner, wiki writers, and org admins only
drop policy if exists wiki_pages_select on public.wiki_pages;

create policy wiki_pages_select on public.wiki_pages
  for select to authenticated using (
    exists (
      select 1 from public.wiki_spaces s
      where s.id = wiki_pages.space_id
        and public.is_org_member(s.organization_id)
    )
    and (
      wiki_pages.publish_status = 'published'
      or wiki_pages.owner_user_id = (select auth.uid())
      or exists (
        select 1 from public.wiki_spaces s2
        where s2.id = wiki_pages.space_id
          and (
            public.has_capability(s2.organization_id, 'wiki.write')
            or public.has_capability(s2.organization_id, 'org.admin')
          )
      )
    )
  );

-- Tags RLS
alter table public.wiki_tags enable row level security;

create policy wiki_tags_select on public.wiki_tags
  for select to authenticated using (public.is_org_member(organization_id));

create policy wiki_tags_write on public.wiki_tags
  for all to authenticated
  using (
    public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  );

alter table public.wiki_page_tags enable row level security;

create policy wiki_page_tags_select on public.wiki_page_tags
  for select to authenticated using (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id and public.is_org_member(s.organization_id)
    )
  );

create policy wiki_page_tags_write on public.wiki_page_tags
  for all to authenticated
  using (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id
        and (
          public.has_capability(s.organization_id, 'wiki.write')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id
        and (
          public.has_capability(s.organization_id, 'wiki.write')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

-- Favorites RLS
alter table public.wiki_page_favorites enable row level security;

create policy wiki_fav_select on public.wiki_page_favorites
  for select to authenticated using (
    user_id = (select auth.uid())
    or public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy wiki_fav_own on public.wiki_page_favorites
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

create policy wiki_fav_own_update on public.wiki_page_favorites
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy wiki_fav_own_delete on public.wiki_page_favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Presence RLS
alter table public.wiki_page_presence enable row level security;

create policy wiki_presence_select on public.wiki_page_presence
  for select to authenticated using (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id and public.is_org_member(s.organization_id)
    )
  );

create policy wiki_presence_upsert on public.wiki_page_presence
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
    and exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id and s.organization_id = wiki_page_presence.organization_id
    )
  );

create policy wiki_presence_update_own on public.wiki_page_presence
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy wiki_presence_delete_own on public.wiki_page_presence
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.wiki_tags to authenticated;
grant select, insert, update, delete on public.wiki_page_tags to authenticated;
grant select, insert, update, delete on public.wiki_page_favorites to authenticated;
grant select, insert, update, delete on public.wiki_page_presence to authenticated;

-- Revisions: same visibility as parent page (avoid leaking draft bodies via revision id)
drop policy if exists wiki_revisions_select on public.wiki_page_revisions;

create policy wiki_revisions_select on public.wiki_page_revisions
  for select to authenticated using (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id
        and public.is_org_member(s.organization_id)
        and (
          p.publish_status = 'published'
          or p.owner_user_id = (select auth.uid())
          or exists (
            select 1 from public.wiki_spaces s2
            where s2.id = p.space_id
              and (
                public.has_capability(s2.organization_id, 'wiki.write')
                or public.has_capability(s2.organization_id, 'org.admin')
              )
          )
        )
    )
  );

-- Refresh search_vector from title jsonb + current revision body_plain
create or replace function public.wiki_recompute_search_vector(p_page_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t jsonb;
  bp text;
  cur_rev uuid;
begin
  select title, current_revision_id into t, cur_rev from public.wiki_pages where id = p_page_id;
  if cur_rev is null then
    update public.wiki_pages set search_vector = null where id = p_page_id;
    return;
  end if;
  select body_plain into bp from public.wiki_page_revisions where id = cur_rev;
  update public.wiki_pages
  set search_vector =
    setweight(
      to_tsvector(
        'simple',
        coalesce(
          (select string_agg(value, ' ') from jsonb_each_text(coalesce(t, '{}'::jsonb))),
          ''
        )
      ),
      'A'
    )
    || setweight(to_tsvector('simple', coalesce(bp, '')), 'B')
  where id = p_page_id;
end;
$$;

grant execute on function public.wiki_recompute_search_vector(uuid) to authenticated;

-- Default space per org (callable after membership check)
create or replace function public.ensure_wiki_default_space(p_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'not an organization member';
  end if;
  select id into sid from public.wiki_spaces
  where organization_id = p_organization_id and slug = 'main'
  limit 1;
  if found then
    return sid;
  end if;
  if not (
    public.has_capability(p_organization_id, 'wiki.write')
    or public.has_capability(p_organization_id, 'org.admin')
  ) then
    raise exception 'wiki.write or org.admin required to create the default space';
  end if;
  insert into public.wiki_spaces (organization_id, slug, name)
  values (
    p_organization_id,
    'main',
    '{"en":"Document center","nb":"Dokumentsenter"}'::jsonb
  )
  returning id into sid;
  return sid;
end;
$$;

grant execute on function public.ensure_wiki_default_space(uuid) to authenticated;

create or replace function public.wiki_trg_page_search()
returns trigger
language plpgsql
as $$
begin
  perform public.wiki_recompute_search_vector(new.id);
  return new;
end;
$$;

drop trigger if exists wiki_pages_search_title_trg on public.wiki_pages;
create trigger wiki_pages_search_title_trg
  after insert or update of title, current_revision_id on public.wiki_pages
  for each row execute function public.wiki_trg_page_search();

create or replace function public.wiki_trg_revision_search()
returns trigger
language plpgsql
as $$
declare
  cur uuid;
begin
  select current_revision_id into cur from public.wiki_pages where id = new.page_id;
  if cur = new.id then
    perform public.wiki_recompute_search_vector(new.page_id);
  end if;
  return new;
end;
$$;

drop trigger if exists wiki_revisions_search_trg on public.wiki_page_revisions;
create trigger wiki_revisions_search_trg
  after insert or update of body_plain on public.wiki_page_revisions
  for each row execute function public.wiki_trg_revision_search();

-- Backfill search for existing pages
do $$
declare r record;
begin
  for r in select id from public.wiki_pages loop
    perform public.wiki_recompute_search_vector(r.id);
  end loop;
end $$;

-- Allow authors to fix body_plain / summary on revisions they can write
create policy wiki_revisions_update on public.wiki_page_revisions
  for update to authenticated
  using (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id
        and (
          public.has_capability(s.organization_id, 'wiki.write')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id
        and (
          public.has_capability(s.organization_id, 'wiki.write')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );


-- === 20250327120000_document_library.sql ===
-- Document center: unified library files (Supabase Storage + metadata) with org RLS.
-- Wiki pages: optional category for library grouping (same enum as file items).

alter table public.wiki_pages
  add column if not exists library_category text not null default 'general'
  check (
    library_category in (
      'general',
      'policies',
      'procedures',
      'legal',
      'hse',
      'training',
      'contracts',
      'other'
    )
  );

alter table public.wiki_pages
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.wiki_pages_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wiki_pages_updated_at_trg on public.wiki_pages;
create trigger wiki_pages_updated_at_trg
  before update on public.wiki_pages
  for each row execute function public.wiki_pages_set_updated_at();

create table if not exists public.document_library_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  category text not null default 'general'
    check (category in ('general', 'policies', 'procedures', 'legal', 'hse', 'training', 'contracts', 'other')),
  mime_type text,
  file_ext text,
  file_size_bytes bigint,
  storage_path text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists document_library_items_org_idx on public.document_library_items (organization_id);
create index if not exists document_library_items_org_cat_idx on public.document_library_items (organization_id, category);
create index if not exists document_library_items_created_idx on public.document_library_items (organization_id, created_at desc);

alter table public.document_library_items enable row level security;

create policy document_library_select on public.document_library_items
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy document_library_write on public.document_library_items
  for all to authenticated
  using (
    public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  );

grant select, insert, update, delete on public.document_library_items to authenticated;

-- Private bucket for org-scoped files (path: {organization_id}/{uuid}-{filename})
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'document-files',
  'document-files',
  false,
  52428800,
  null
)
on conflict (id) do nothing;

-- Storage RLS: path first segment = organization UUID
create policy document_files_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'document-files'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
    )
  );

create policy document_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'document-files'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
        and (
          public.has_capability(m.organization_id, 'wiki.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  );

create policy document_files_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'document-files'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
        and (
          public.has_capability(m.organization_id, 'wiki.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  );

create policy document_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'document-files'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
        and (
          public.has_capability(m.organization_id, 'wiki.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  );

-- === 20250328100000_amu_center.sql ===
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

-- === 20250328120000_amu_enhancements.sql ===
-- AMU enhancements: VO roster delete protection, election protocol term, auto-close past deadlines.

-- Prevent accidental deletion of the verneombud roster row
create or replace function public.amu_roster_block_vo_delete()
returns trigger
language plpgsql
as $$
begin
  if old.is_verneombud_slot = true then
    raise exception 'Cannot delete the verneombud (VO) roster row. Change the safety representative role or use roster sync.';
  end if;
  return old;
end;
$$;

drop trigger if exists amu_roster_block_vo_delete_trg on public.amu_roster;
create trigger amu_roster_block_vo_delete_trg
  before delete on public.amu_roster
  for each row execute function public.amu_roster_block_vo_delete();

-- Close election with full protocol (including term_label from election row)
create or replace function public.close_amu_election(p_election_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_term jsonb;
  v_winner uuid;
  v_nominees int;
  v_votes int;
  v_distinct int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select organization_id, term_label into v_org, v_term from public.amu_elections where id = p_election_id;
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
        'term', coalesce(v_term, '{}'::jsonb),
        'eligible_nominees', v_nominees,
        'votes_cast', v_votes,
        'unique_voters', v_distinct,
        'winner_nominee_id', v_winner
      )
  where id = p_election_id;
end;
$$;

-- Auto-close elections whose voting deadline has passed (call from app or pg_cron)
create or replace function public.auto_close_due_amu_elections(p_organization_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
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
  for r in
    select id from public.amu_elections
    where organization_id = p_organization_id
      and phase = 'voting'
      and voting_ends_at is not null
      and voting_ends_at < now()
  loop
    perform public.close_amu_election(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

grant execute on function public.auto_close_due_amu_elections(uuid) to authenticated;

-- === 20250329100000_hse_module.sql ===
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
-- HSE: tighten task visibility for HSE-linked rows and allow VO/hse.write to update linked tasks and checklists.

-- ---------------------------------------------------------------------------
-- Tasks SELECT: org members see general tasks; HSE-linked tasks only when user may see parent HSE row
-- ---------------------------------------------------------------------------
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
  );

-- ---------------------------------------------------------------------------
-- Tasks UPDATE: keep tasks.write; add HSE-linked updates for VO / HSE writers
-- ---------------------------------------------------------------------------
drop policy if exists tasks_update_hse on public.tasks;
create policy tasks_update_hse on public.tasks
  for update to authenticated
  using (
    source_hse_record_id is not null
    and public.is_org_member(organization_id)
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
        )
    )
  )
  with check (
    source_hse_record_id is not null
    and public.is_org_member(organization_id)
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
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Task checklist: allow VO / HSE writers when parent task is HSE-linked
-- ---------------------------------------------------------------------------
drop policy if exists task_checklist_write_hse on public.task_checklist_items;
create policy task_checklist_write_hse on public.task_checklist_items
  for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and t.source_hse_record_id is not null
        and public.is_org_member(t.organization_id)
        and (
          public.has_capability(t.organization_id, 'hse.write')
          or public.has_capability(t.organization_id, 'org.admin')
          or exists (
            select 1 from public.organization_members om
            join public.roles r on r.id = om.role_id
            where om.organization_id = t.organization_id
              and om.user_id = (select auth.uid())
              and r.code = 'safety_rep'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and t.source_hse_record_id is not null
        and public.is_org_member(t.organization_id)
        and (
          public.has_capability(t.organization_id, 'hse.write')
          or public.has_capability(t.organization_id, 'org.admin')
          or exists (
            select 1 from public.organization_members om
            join public.roles r on r.id = om.role_id
            where om.organization_id = t.organization_id
              and om.user_id = (select auth.uid())
              and r.code = 'safety_rep'
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- HSE: author may update own submitted records (follow-up text, attachments)
-- ---------------------------------------------------------------------------
drop policy if exists hse_update_author on public.hse_records;
create policy hse_update_author on public.hse_records
  for update to authenticated
  using (
    public.is_org_member(organization_id)
    and created_by = (select auth.uid())
  )
  with check (
    public.is_org_member(organization_id)
    and created_by = (select auth.uid())
  );

-- Allow safety representatives (VO) to upload and delete HSE attachments in their org.

drop policy if exists hse_files_insert on storage.objects;
create policy hse_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'hse-attachments'
    and exists (
      select 1 from public.organization_members m
      join public.roles r on r.id = m.role_id
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
        and (
          public.has_capability(m.organization_id, 'hse.write')
          or public.has_capability(m.organization_id, 'org.admin')
          or r.code = 'safety_rep'
        )
    )
  );

drop policy if exists hse_files_delete on storage.objects;
create policy hse_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'hse-attachments'
    and exists (
      select 1 from public.organization_members m
      join public.roles r on r.id = m.role_id
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
        and (
          public.has_capability(m.organization_id, 'hse.write')
          or public.has_capability(m.organization_id, 'org.admin')
          or r.code = 'safety_rep'
        )
    )
  );

-- HSE: allow hse.write / org.admin to update records (triage, closure).

drop policy if exists hse_update_hse_write on public.hse_records;
create policy hse_update_hse_write on public.hse_records
  for update to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'hse.write')
      or public.has_capability(organization_id, 'org.admin')
    )
  )
  with check (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'hse.write')
      or public.has_capability(organization_id, 'org.admin')
    )
  );


-- Allow safety representatives (VO) to run inspections and record responses.

drop policy if exists hi_write on public.hse_inspections;
create policy hi_write on public.hse_inspections
  for all to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'hse.write')
      or public.has_capability(organization_id, 'org.admin')
      or exists (
        select 1 from public.organization_members om
        join public.roles r on r.id = om.role_id
        where om.organization_id = hse_inspections.organization_id
          and om.user_id = (select auth.uid())
          and r.code = 'safety_rep'
      )
    )
  )
  with check (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'hse.write')
      or public.has_capability(organization_id, 'org.admin')
      or exists (
        select 1 from public.organization_members om
        join public.roles r on r.id = om.role_id
        where om.organization_id = hse_inspections.organization_id
          and om.user_id = (select auth.uid())
          and r.code = 'safety_rep'
      )
    )
  );

drop policy if exists hir_write on public.hse_inspection_responses;
create policy hir_write on public.hse_inspection_responses
  for all to authenticated
  using (
    exists (
      select 1 from public.hse_inspections i
      where i.id = inspection_id
        and public.is_org_member(i.organization_id)
        and (
          public.has_capability(i.organization_id, 'hse.write')
          or public.has_capability(i.organization_id, 'org.admin')
          or exists (
            select 1 from public.organization_members om
            join public.roles r on r.id = om.role_id
            where om.organization_id = i.organization_id
              and om.user_id = (select auth.uid())
              and r.code = 'safety_rep'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.hse_inspections i
      where i.id = inspection_id
        and public.is_org_member(i.organization_id)
        and (
          public.has_capability(i.organization_id, 'hse.write')
          or public.has_capability(i.organization_id, 'org.admin')
          or exists (
            select 1 from public.organization_members om
            join public.roles r on r.id = om.role_id
            where om.organization_id = i.organization_id
              and om.user_id = (select auth.uid())
              and r.code = 'safety_rep'
          )
        )
    )
  );

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

-- Only safety representatives may create halted_work records; others keep deviation/ROS/etc.

drop policy if exists hse_insert_own on public.hse_records;

create policy hse_insert_own on public.hse_records
  for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and created_by = (select auth.uid())
    and (
      record_type <> 'halted_work'
      or exists (
        select 1 from public.organization_members om
        join public.roles r on r.id = om.role_id
        where om.organization_id = hse_records.organization_id
          and om.user_id = (select auth.uid())
          and r.code = 'safety_rep'
      )
    )
  );

-- Allow deviation status used after AMU escalation
alter table public.hse_records drop constraint if exists hse_records_status_check;
alter table public.hse_records
  add constraint hse_records_status_check check (
    status in ('open', 'in_progress', 'closed', 'escalated_to_amu')
  );

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
  v_parent_n int;
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

-- === 20250330110000_fix_survey_department_aggregate.sql ===
-- Fix: survey_department_aggregate referenced v_parent_n without declaring it (42601).

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
  v_parent_n int;
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
