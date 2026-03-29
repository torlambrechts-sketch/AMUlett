import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userCanAmuWrite } from "@/lib/amu/server-access";
import { AmuSubnav } from "@/components/amu/amu-subnav";
import { AmuAnnualReportButton } from "@/components/amu/amu-annual-report-button";

export default async function AmuReportsPage() {
  const t = await getTranslations("amu");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const canWrite = await userCanAmuWrite(org.organizationId);
  const year = new Date().getFullYear();

  const { data: reports } = await supabase
    .from("amu_annual_reports")
    .select("id, report_year, content, generated_at")
    .eq("organization_id", org.organizationId)
    .order("report_year", { ascending: false });

  return (
    <AppShell title={t("reportsTitle")}>
      <AmuSubnav />
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("reportsIntro")}</p>

      {canWrite ? <AmuAnnualReportButton organizationId={org.organizationId} defaultYear={year} /> : null}

      <ul className="mt-6 space-y-4">
        {(reports ?? []).map((r) => (
          <li key={r.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {t("reportYearLabel", { year: r.report_year })}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{new Date(r.generated_at).toLocaleString()}</p>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-[var(--color-surface-elevated)] p-2 text-xs">
              {JSON.stringify(r.content, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
      {!reports?.length ? <p className="mt-4 text-sm text-[var(--color-text-muted)]">{t("reportsEmpty")}</p> : null}
    </AppShell>
  );
}
