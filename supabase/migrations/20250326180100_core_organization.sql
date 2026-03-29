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
