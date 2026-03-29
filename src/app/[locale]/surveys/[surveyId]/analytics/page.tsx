import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userCanSurveyAdmin, userManagesAnyDepartment } from "@/lib/survey/server-access";
import { getOrganizationMembersWithRoles } from "@/lib/amu/org-members";
import { SurveyManagerDashboard } from "@/components/surveys/survey-manager-dashboard";
import type { DepartmentAggregate } from "@/lib/survey/types";

type Params = { surveyId: string };

export default async function SurveyAnalyticsPage({ params }: { params: Promise<Params> }) {
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
    .select("id, organization_id, status")
    .eq("id", surveyId)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!survey) notFound();

  const isAdmin = await userCanSurveyAdmin(org.organizationId);
  const isManager = await userManagesAnyDepartment(org.organizationId, user.id);
  if (!isAdmin && !isManager) {
    redirect(`/${locale}/surveys`);
  }

  let deptQuery = supabase.from("departments").select("id, slug, name").eq("organization_id", org.organizationId).order("sort_order");
  if (!isAdmin) {
    const { data: managed } = await supabase.from("department_managers").select("department_id").eq("user_id", user.id);
    const ids = (managed ?? []).map((m) => m.department_id as string);
    if (!ids.length) {
      return (
        <AppShell title={`${t("surveys")} — ${ts("analytics")}`}>
          <p className="text-sm text-[var(--color-text-muted)]">{ts("noManagedDepartments")}</p>
        </AppShell>
      );
    }
    deptQuery = deptQuery.in("id", ids);
  }
  const { data: depts } = await deptQuery;
  const members = await getOrganizationMembersWithRoles(org.organizationId);

  const firstDeptId = depts?.[0]?.id as string | undefined;
  let initialAggregate: DepartmentAggregate | null = null;
  if (firstDeptId) {
    const { data: aggData } = await supabase.rpc("survey_department_aggregate", {
      p_survey_id: surveyId,
      p_department_id: firstDeptId,
    });
    initialAggregate = (aggData ?? null) as DepartmentAggregate | null;
  }

  return (
    <AppShell title={`${t("surveys")} — ${ts("analytics")}`}>
      <Link href="/surveys" className="mb-4 inline-block text-sm text-[var(--color-primary)] hover:underline">
        ← {ts("backToList")}
      </Link>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">{ts("analyticsIntro")}</p>
      <SurveyManagerDashboard
        organizationId={org.organizationId}
        surveyId={surveyId}
        departments={(depts ?? []) as never}
        members={members}
        initialAggregate={initialAggregate}
      />
    </AppShell>
  );
}
