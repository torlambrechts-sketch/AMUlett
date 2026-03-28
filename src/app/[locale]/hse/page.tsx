import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userIsSafetyRep } from "@/lib/amu/server-access";
import { HseEscalateButton } from "@/components/amu/hse-escalate-button";
import { resolveLocalized } from "@/lib/learning/localize";

export default async function HsePage() {
  const t = await getTranslations("modules");
  const ta = await getTranslations("amu");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const isVo = await userIsSafetyRep(org.organizationId);

  const { data: records } = await supabase
    .from("hse_records")
    .select("id, record_type, title, status, escalated_to_amu, occurred_at")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <AppShell title={t("hse")}>
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("hsePlaceholder")}</p>

      {isVo ? (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {ta("hseVoEscalateHint")}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-[var(--color-surface-elevated)]">
            <tr>
              <th className="px-3 py-2 font-semibold">{ta("hseColType")}</th>
              <th className="px-3 py-2 font-semibold">{ta("hseColTitle")}</th>
              <th className="px-3 py-2 font-semibold">{ta("hseColStatus")}</th>
              <th className="px-3 py-2 font-semibold">{ta("hseColAmu")}</th>
              {isVo ? <th className="px-3 py-2 font-semibold">{ta("hseColAction")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {(records ?? []).map((row) => {
              const titleRes = resolveLocalized((row.title as Record<string, string>) ?? {}, locale);
              return (
                <tr key={row.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 text-[var(--color-text-muted)]">{row.record_type}</td>
                  <td className="px-3 py-2">{titleRes.text || "—"}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.escalated_to_amu ? ta("escalatedYes") : ta("escalatedNo")}</td>
                  {isVo ? (
                    <td className="px-3 py-2">
                      <HseEscalateButton recordId={row.id} alreadyEscalated={Boolean(row.escalated_to_amu)} />
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!records?.length ? <p className="p-4 text-sm text-[var(--color-text-muted)]">{ta("hseEmpty")}</p> : null}
      </div>
    </AppShell>
  );
}
