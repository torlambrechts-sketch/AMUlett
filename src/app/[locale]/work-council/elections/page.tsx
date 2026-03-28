import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userCanAmuWrite } from "@/lib/amu/server-access";
import { AmuSubnav } from "@/components/amu/amu-subnav";
import { AmuElectionsPanel } from "@/components/amu/amu-elections-panel";

export default async function AmuElectionsPage() {
  const t = await getTranslations("amu");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const canWrite = await userCanAmuWrite(org.organizationId);

  await supabase.rpc("auto_close_due_amu_elections", { p_organization_id: org.organizationId });

  const { data: electionRows, error } = await supabase
    .from("amu_elections")
    .select("id, title, phase, protocol, nomination_ends_at, voting_ends_at, term_label")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });

  const elections =
    electionRows?.map((e) => ({
      ...e,
      nominees: [] as { id: string; user_id: string; status: string }[],
    })) ?? [];

  if (elections.length) {
    const ids = elections.map((e) => e.id);
    const { data: nomRows } = await supabase.from("amu_election_nominees").select("id, election_id, user_id, status").in("election_id", ids);
    const byE = new Map<string, typeof elections[0]["nominees"]>();
    for (const n of nomRows ?? []) {
      const eid = n.election_id as string;
      if (!byE.has(eid)) byE.set(eid, []);
      byE.get(eid)!.push({ id: n.id as string, user_id: n.user_id as string, status: n.status as string });
    }
    for (const e of elections) {
      e.nominees = byE.get(e.id) ?? [];
    }
  }

  return (
    <AppShell title={t("electionsTitle")}>
      <AmuSubnav />
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("electionsIntro")}</p>
      {error && error.code === "42P01" ? (
        <p className="text-sm text-amber-800">{t("migrationHint")}</p>
      ) : (
        <AmuElectionsPanel organizationId={org.organizationId} elections={elections as never[]} canWrite={canWrite} />
      )}
    </AppShell>
  );
}
