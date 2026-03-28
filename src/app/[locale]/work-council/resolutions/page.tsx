import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userCanAmuWrite } from "@/lib/amu/server-access";
import { AmuSubnav } from "@/components/amu/amu-subnav";
import { AmuResolutionsBoard } from "@/components/amu/amu-resolutions-board";

export default async function AmuResolutionsPage() {
  const t = await getTranslations("amu");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const canWrite = await userCanAmuWrite(org.organizationId);

  const { data: resolutions, error } = await supabase
    .from("amu_resolutions")
    .select("id, title, status, deadline, assignee_user_id")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });

  return (
    <AppShell title={t("resolutionsTitle")}>
      <AmuSubnav />
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("resolutionsIntro")}</p>
      {error && error.code === "42P01" ? (
        <p className="text-sm text-amber-800">{t("migrationHint")}</p>
      ) : (
        <AmuResolutionsBoard organizationId={org.organizationId} resolutions={(resolutions ?? []) as never[]} canWrite={canWrite} />
      )}
    </AppShell>
  );
}
