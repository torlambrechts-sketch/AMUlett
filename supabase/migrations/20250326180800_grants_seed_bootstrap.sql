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
