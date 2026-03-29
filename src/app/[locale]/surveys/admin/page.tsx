import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userCanSurveyAdmin } from "@/lib/survey/server-access";
import { SurveyAdminList } from "@/components/surveys/survey-admin-list";

export default async function SurveysAdminPage() {
  const t = await getTranslations("modules");
  const ts = await getTranslations("survey");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const ok = await userCanSurveyAdmin(org.organizationId);
  if (!ok) redirect(`/${locale}/surveys`);

  const { data: surveys } = await supabase
    .from("surveys")
    .select("id, title, survey_type, status, created_at")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });

  return (
    <AppShell title={`${t("surveys")} — ${ts("adminTitle")}`}>
      <Link href="/surveys" className="mb-6 inline-block text-sm text-[var(--color-primary)] hover:underline">
        ← {ts("backToList")}
      </Link>
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{ts("adminIntro")}</p>
      <SurveyAdminList surveys={(surveys ?? []) as { id: string; title: Record<string, string>; survey_type: string; status: string }[]} />
    </AppShell>
  );
}
