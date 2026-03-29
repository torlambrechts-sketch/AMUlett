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
