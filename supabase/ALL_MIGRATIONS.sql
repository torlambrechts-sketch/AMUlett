-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";
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
create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_organization_id uuid references public.organizations (id) on delete set null,
  ui_locale text check (ui_locale in ('nb', 'en')),
  updated_at timestamptz not null default now()
);
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
