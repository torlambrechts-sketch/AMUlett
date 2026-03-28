import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userIsSafetyRep } from "@/lib/amu/server-access";
import { HseRecordTable } from "@/components/hse/hse-record-table";

export default async function HsePage() {
  const t = await getTranslations("modules");
  const th = await getTranslations("hse");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const isVo = await userIsSafetyRep(org.organizationId);

  const { data: recent } = await supabase
    .from("hse_records")
    .select("id, record_type, title, status, risk_band, risk_score, action_plan_required, escalated_to_amu")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false })
    .limit(12);

  const { count: openCount } = await supabase
    .from("hse_records")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.organizationId)
    .eq("status", "open");

  const { count: rosCount } = await supabase
    .from("hse_records")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.organizationId)
    .eq("record_type", "risk_assessment");

  return (
    <AppShell title={t("hse")}>
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("hsePlaceholder")}</p>

      {isVo ? (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {th("voHint")}
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{th("statOpen")}</p>
          <p className="mt-1 text-2xl font-semibold">{openCount ?? 0}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{th("statRos")}</p>
          <p className="mt-1 text-2xl font-semibold">{rosCount ?? 0}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{th("quickLinks")}</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link href="/hse/ros" className="text-[var(--color-primary)] hover:underline">
                {th("navRos")}
              </Link>
            </li>
            <li>
              <Link href="/hse/deviations" className="text-[var(--color-primary)] hover:underline">
                {th("navDeviations")}
              </Link>
            </li>
            <li>
              <Link href="/hse/inspections" className="text-[var(--color-primary)] hover:underline">
                {th("navInspections")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]">{th("recentRecords")}</h2>
      <HseRecordTable
        records={(recent ?? []) as never}
        emptyMessage={th("emptyRecords")}
        showRisk
        showAmu={isVo}
      />
    </AppShell>
  );
}
