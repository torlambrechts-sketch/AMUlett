import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userCanAmuWrite } from "@/lib/amu/server-access";
import { AmuSubnav } from "@/components/amu/amu-subnav";
import { AmuMeetingsPanel } from "@/components/amu/amu-meetings-panel";

export default async function AmuMeetingsPage() {
  const t = await getTranslations("amu");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const canWrite = await userCanAmuWrite(org.organizationId);

  const { data: meetings } = await supabase
    .from("work_council_meetings")
    .select("id, title, scheduled_at, status, minutes_document")
    .eq("organization_id", org.organizationId)
    .order("scheduled_at", { ascending: false, nullsFirst: false });

  const { count: hseOpen } = await supabase
    .from("hse_records")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.organizationId)
    .eq("status", "open");

  const { count: hseIncident } = await supabase
    .from("hse_records")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.organizationId)
    .eq("record_type", "incident");

  const { count: hseRos } = await supabase
    .from("hse_records")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.organizationId)
    .eq("record_type", "risk_assessment");

  return (
    <AppShell title={t("meetingsTitle")}>
      <AmuSubnav />
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("meetingsIntro")}</p>
      <AmuMeetingsPanel
        organizationId={org.organizationId}
        meetings={(meetings ?? []) as never[]}
        hseStats={{
          open: hseOpen ?? 0,
          incident: hseIncident ?? 0,
          risk_assessment: hseRos ?? 0,
        }}
        canWrite={canWrite}
      />
    </AppShell>
  );
}
