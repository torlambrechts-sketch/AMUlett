import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { WhistleblowerForm } from "@/components/hse/whistleblower-form";
import { HsePageHeader } from "@/components/hse/hse-page-header";

export default async function HseWhistleblowerPage() {
  const t = await getTranslations("modules");
  const th = await getTranslations("hse");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: canReview } = user
    ? await supabase.rpc("has_capability", { p_org: org.organizationId, p_code: "whistleblower.review" })
    : { data: false };
  const { data: canReception } = user
    ? await supabase.rpc("has_capability", { p_org: org.organizationId, p_code: "whistleblower.reception" })
    : { data: false };
  const { data: isAdmin } = user
    ? await supabase.rpc("has_capability", { p_org: org.organizationId, p_code: "org.admin" })
    : { data: false };

  const canSeeInbox = Boolean(canReview || canReception || isAdmin);

  let inbox: { id: string; reference_code: string; status: string; created_at: string; is_anonymous: boolean }[] = [];
  if (canSeeInbox) {
    const { data: rows } = await supabase
      .from("whistleblower_reports")
      .select("id, reference_code, status, created_at, is_anonymous")
      .eq("organization_id", org.organizationId)
      .order("created_at", { ascending: false })
      .limit(30);
    inbox = (rows ?? []) as typeof inbox;
  }

  return (
    <AppShell title={`${t("hse")} — ${th("whistleblowerTitle")}`} hideHeaderTitle mainClassName="!p-0">
      <HsePageHeader title={th("whistleblowerTitle")} subtitle={th("whistleblowerIntro")} />

      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]">{th("whistleblowerNew")}</h2>
      <div className="mb-10">
        <WhistleblowerForm organizationId={org.organizationId} />
      </div>

      {canSeeInbox ? (
        <>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]">{th("whistleblowerInbox")}</h2>
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-[var(--color-surface-elevated)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">{th("wbRef")}</th>
                  <th className="px-3 py-2 font-semibold">{th("colStatus")}</th>
                  <th className="px-3 py-2 font-semibold">{th("wbCreated")}</th>
                  <th className="px-3 py-2 font-semibold">{th("wbAnonymous")}</th>
                </tr>
              </thead>
              <tbody>
                {inbox.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-2 font-mono text-xs">{row.reference_code}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2 text-[var(--color-text-muted)]">{new Date(row.created_at).toLocaleString(locale)}</td>
                    <td className="px-3 py-2">{row.is_anonymous ? th("amuYes") : th("amuNo")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!inbox.length ? <p className="p-4 text-sm text-[var(--color-text-muted)]">{th("whistleblowerEmpty")}</p> : null}
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">{th("whistleblowerInboxDenied")}</p>
      )}
    </AppShell>
  );
}
