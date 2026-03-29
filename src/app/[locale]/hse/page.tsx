import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userIsSafetyRep } from "@/lib/amu/server-access";
import { resolveLocalized } from "@/lib/learning/localize";
import { HseDashboardClient } from "@/components/hse/hse-dashboard-client";
import type { HseCardRecord } from "@/components/hse/hse-record-card-grid";

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
    .limit(48);

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

  const cards: HseCardRecord[] = (recent ?? []).map((r) => {
    const titleJson = r.title as Record<string, string> | null | undefined;
    return {
      id: r.id,
      record_type: r.record_type,
      titleDisplay: resolveLocalized(titleJson, locale).text,
      status: r.status,
      risk_band: r.risk_band,
      risk_score: r.risk_score,
      action_plan_required: r.action_plan_required,
      escalated_to_amu: r.escalated_to_amu,
    };
  });

  return (
    <AppShell title={t("hse")} hideHeaderTitle mainClassName="!p-0">
      <Suspense fallback={<div className="p-6 text-sm text-[#6b7280]">{th("loading")}</div>}>
        <HseDashboardClient
          records={cards}
          openCount={openCount ?? 0}
          rosCount={rosCount ?? 0}
          isVo={isVo}
          voHint={th("voHint")}
        />
      </Suspense>
    </AppShell>
  );
}
