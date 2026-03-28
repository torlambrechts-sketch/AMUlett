import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userIsSafetyRep } from "@/lib/amu/server-access";
import { userCanWriteHse } from "@/lib/hse/server-access";
import { getOrganizationMembersWithRoles } from "@/lib/amu/org-members";
import { HseRecordDetailClient, type HseRecordDetail } from "@/components/hse/hse-record-detail-client";
import Link from "next/link";

type Params = { recordId: string };

export default async function HseRecordPage({ params }: { params: Promise<Params> }) {
  const { recordId } = await params;
  const t = await getTranslations("modules");
  const th = await getTranslations("hse");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const { data: row } = await supabase
    .from("hse_records")
    .select(
      "id, organization_id, record_type, title, body, status, occurred_at, deviation_category, proposed_solution, attachment_paths, probability, consequence, risk_score, risk_band, action_plan_required, action_plan_task_id, equipment_area_lock, halt_released_at, escalated_to_amu, created_by"
    )
    .eq("id", recordId)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!row) notFound();

  const isVo = await userIsSafetyRep(org.organizationId);
  const canWriteHse = await userCanWriteHse(org.organizationId);
  const showActionPlan = canWriteHse || isVo;
  const actionPlanMembers = showActionPlan ? await getOrganizationMembersWithRoles(org.organizationId) : [];

  const record: HseRecordDetail = {
    id: row.id,
    organization_id: row.organization_id,
    record_type: row.record_type,
    title: (row.title as Record<string, string>) ?? {},
    body: (row.body as Record<string, string>) ?? {},
    status: row.status,
    occurred_at: row.occurred_at,
    deviation_category: row.deviation_category,
    proposed_solution: (row.proposed_solution as Record<string, string>) ?? {},
    attachment_paths: Array.isArray(row.attachment_paths) ? (row.attachment_paths as string[]) : [],
    probability: row.probability,
    consequence: row.consequence,
    risk_score: row.risk_score,
    risk_band: row.risk_band,
    action_plan_required: row.action_plan_required,
    action_plan_task_id: row.action_plan_task_id,
    equipment_area_lock: (row.equipment_area_lock as Record<string, unknown>) ?? {},
    halt_released_at: row.halt_released_at,
    escalated_to_amu: Boolean(row.escalated_to_amu),
    created_by: row.created_by,
  };

  const canEscalateToAmu = isVo && record.record_type === "deviation";
  const canReleaseHalt = isVo && record.record_type === "halted_work";

  return (
    <AppShell title={`${t("hse")} — ${th("recordDetail")}`}>
      <Link href="/hse" className="mb-6 inline-block text-sm text-[var(--color-primary)] hover:underline">
        ← {th("backToHse")}
      </Link>

      <HseRecordDetailClient
        record={record}
        locale={locale}
        canEscalateToAmu={canEscalateToAmu}
        canReleaseHalt={canReleaseHalt}
        showActionPlanButton={showActionPlan}
        actionPlanMembers={actionPlanMembers}
      />

    </AppShell>
  );
}
