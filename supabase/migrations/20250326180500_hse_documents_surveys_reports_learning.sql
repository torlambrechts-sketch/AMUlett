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
