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
