import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { SurveyTaker } from "@/components/surveys/survey-taker";
import type { SurveyQuestionRow } from "@/lib/survey/types";

type Params = { surveyId: string };

export default async function SurveyTakePage({ params }: { params: Promise<Params> }) {
  const { surveyId } = await params;
  const t = await getTranslations("modules");
  const ts = await getTranslations("survey");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: survey } = await supabase
    .from("surveys")
    .select("id, organization_id, status, survey_type, title")
    .eq("id", surveyId)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!survey || survey.status !== "published") notFound();

  const { data: participated } = await supabase.from("survey_participation").select("survey_id").eq("survey_id", surveyId).eq("user_id", user.id).maybeSingle();

  if (participated) {
    redirect(`/${locale}/surveys`);
  }

  const { data: questions } = await supabase
    .from("survey_questions")
    .select("id, survey_id, position, question, response_type, question_category, is_enps, is_psychological_safety, options")
    .eq("survey_id", surveyId)
    .order("position");

  const { data: depts } = await supabase.from("departments").select("id, slug").eq("organization_id", org.organizationId).order("sort_order");

  const { data: memberRow } = await supabase.from("organization_members").select("department_id").eq("organization_id", org.organizationId).eq("user_id", user.id).maybeSingle();

  const departmentId = (memberRow?.department_id as string | null) ?? null;

  return (
    <AppShell title={t("surveys")}>
      <Link href="/surveys" className="mb-4 inline-block text-sm text-[var(--color-primary)] hover:underline">
        ← {ts("backToList")}
      </Link>
      <h1 className="mb-6 text-lg font-semibold">{ts("takeSurvey")}</h1>
      <SurveyTaker
        surveyId={surveyId}
        questions={(questions ?? []) as SurveyQuestionRow[]}
        departmentId={departmentId}
        departmentOptions={(depts ?? []) as { id: string; slug: string }[]}
      />
    </AppShell>
  );
}
