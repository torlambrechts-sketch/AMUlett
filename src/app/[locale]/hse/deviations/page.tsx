import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userIsSafetyRep } from "@/lib/amu/server-access";
import { HseRecordTable } from "@/components/hse/hse-record-table";
import { HseNewRecordForm } from "@/components/hse/hse-new-record-form";

export default async function HseDeviationsPage() {
  const t = await getTranslations("modules");
  const th = await getTranslations("hse");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const isVo = await userIsSafetyRep(org.organizationId);

  const { data: records } = await supabase
    .from("hse_records")
    .select("id, record_type, title, status, risk_band, risk_score, action_plan_required, escalated_to_amu")
    .eq("organization_id", org.organizationId)
    .eq("record_type", "deviation")
    .order("created_at", { ascending: false })
    .limit(80);

  return (
    <AppShell title={`${t("hse")} — ${th("deviationsTitle")}`}>
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{th("deviationsIntro")}</p>

      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]">{th("newDeviation")}</h2>
      <div className="mb-10">
        <HseNewRecordForm organizationId={org.organizationId} kind="deviation" />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]">{th("deviationsList")}</h2>
      <HseRecordTable records={(records ?? []) as never} emptyMessage={th("emptyDeviations")} showAmu={isVo} />
    </AppShell>
  );
}
