create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_organization_id uuid references public.organizations (id) on delete set null,
  ui_locale text check (ui_locale in ('nb', 'en')),
  updated_at timestamptz not null default now()
);
