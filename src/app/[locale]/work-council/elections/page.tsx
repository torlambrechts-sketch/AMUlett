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

  const { data: elections, error } = await supabase
    .from("amu_elections")
    .select("id, title, phase, protocol")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });

  return (
    <AppShell title={t("electionsTitle")}>
      <AmuSubnav />
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("electionsIntro")}</p>
      {error && error.code === "42P01" ? (
        <p className="text-sm text-amber-800">{t("migrationHint")}</p>
      ) : (
        <AmuElectionsPanel organizationId={org.organizationId} elections={(elections ?? []) as never[]} canWrite={canWrite} />
      )}
    </AppShell>
  );
}
