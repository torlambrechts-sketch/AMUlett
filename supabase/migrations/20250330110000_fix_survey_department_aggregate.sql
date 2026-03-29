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
