import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { HseNewRecordForm } from "@/components/hse/hse-new-record-form";

export default async function HseHaltPage() {
  const t = await getTranslations("modules");
  const th = await getTranslations("hse");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  return (
    <AppShell title={`${t("hse")} — ${th("haltTitle")}`}>
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{th("haltIntro")}</p>
      <HseNewRecordForm organizationId={org.organizationId} kind="halted_work" />
    </AppShell>
  );
}
