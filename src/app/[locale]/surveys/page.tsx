import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userCanSurveyAdmin, userManagesAnyDepartment } from "@/lib/survey/server-access";
import { resolveLocalized } from "@/lib/learning/localize";

export default async function SurveysPage() {
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

  const isSurveyAdmin = await userCanSurveyAdmin(org.organizationId);
  const canViewAnalytics = isSurveyAdmin || (await userManagesAnyDepartment(org.organizationId, user.id));

  const { data: surveys } = await supabase
    .from("surveys")
    .select("id, title, description, survey_type, status, closes_at")
    .eq("organization_id", org.organizationId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const surveyIds = (surveys ?? []).map((s) => s.id);
  let participated = new Set<string>();
  if (surveyIds.length) {
    const { data: part } = await supabase.from("survey_participation").select("survey_id").eq("user_id", user.id).in("survey_id", surveyIds);
    participated = new Set((part ?? []).map((p) => p.survey_id as string));
  }

  return (
    <AppShell title={t("surveys")}>
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("surveysPlaceholder")}</p>

      {isSurveyAdmin ? (
        <p className="mb-6">
          <Link href="/surveys/admin" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
            {ts("adminLink")}
          </Link>
        </p>
      ) : null}

      <ul className="space-y-3">
        {(surveys ?? []).map((row) => {
          const title = resolveLocalized(row.title as Record<string, string>, locale).text;
          const desc = resolveLocalized((row.description as Record<string, string>) ?? {}, locale).text;
          const typeKey = row.survey_type === "pulse" ? "type.pulse" : "type.culture";
          const done = participated.has(row.id);
          return (
            <li key={row.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{title || "—"}</h2>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{ts(typeKey)}</p>
                  {desc ? <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{desc}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {done ? (
                    <span className="rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs">{ts("alreadyResponded")}</span>
                  ) : (
                    <Link
                      href={`/surveys/${row.id}/take`}
                      className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
                    >
                      {ts("takeSurvey")}
                    </Link>
                  )}
                  {canViewAnalytics ? (
                    <Link href={`/surveys/${row.id}/analytics`} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm">
                      {ts("analytics")}
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {!surveys?.length ? <p className="text-sm text-[var(--color-text-muted)]">{ts("noPublishedSurveys")}</p> : null}
    </AppShell>
  );
}
