import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userCanAmuWrite } from "@/lib/amu/server-access";
import { AmuSubnav } from "@/components/amu/amu-subnav";
import { AmuRosterClient } from "@/components/amu/amu-roster-client";

export default async function AmuRosterPage() {
  const t = await getTranslations("amu");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const canWrite = await userCanAmuWrite(org.organizationId);

  const { data: rows, error } = await supabase
    .from("amu_roster")
    .select("id, user_id, side, is_chair, is_verneombud_slot, position_label")
    .eq("organization_id", org.organizationId)
    .order("sort_order");

  return (
    <AppShell title={t("rosterTitle")}>
      <AmuSubnav />
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("rosterIntro")}</p>
      {error && error.code === "42P01" ? (
        <p className="text-sm text-amber-800">{t("migrationHint")}</p>
      ) : (
        <AmuRosterClient organizationId={org.organizationId} rows={(rows ?? []) as never[]} canWrite={canWrite} />
      )}
    </AppShell>
  );
}
