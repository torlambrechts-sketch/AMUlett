import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { resolveLocalized } from "@/lib/learning/localize";
import { HseInspectionRun } from "@/components/hse/hse-inspection-run";
import { HsePageHeader } from "@/components/hse/hse-page-header";

type TemplateRow = {
  id: string;
  slug: string;
  title: Record<string, string>;
  description: Record<string, string> | null;
  items: { key: string; label: Record<string, string> }[];
};

export default async function HseInspectionsPage() {
  const t = await getTranslations("modules");
  const th = await getTranslations("hse");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const { data: templates } = await supabase
    .from("hse_inspection_templates")
    .select("id, slug, title, description, items")
    .eq("organization_id", org.organizationId)
    .order("slug");

  const { data: recent } = await supabase
    .from("hse_inspections")
    .select("id, title, status, performed_at, template_id")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false })
    .limit(15);

  return (
    <AppShell title={`${t("hse")} — ${th("inspectionsTitle")}`} hideHeaderTitle mainClassName="!p-0">
      <HsePageHeader title={th("inspectionsTitle")} subtitle={th("inspectionsIntro")} />

      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]">{th("templatesHeading")}</h2>
      <div className="mb-10 space-y-8">
        {(templates as TemplateRow[] | null)?.map((tmpl) => {
          const items = Array.isArray(tmpl.items) ? tmpl.items : [];
          return (
            <section key={tmpl.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="text-base font-semibold">{resolveLocalized(tmpl.title, locale).text}</h3>
              {tmpl.description ? (
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{resolveLocalized(tmpl.description, locale).text}</p>
              ) : null}
              <div className="mt-4">
                <HseInspectionRun organizationId={org.organizationId} templateId={tmpl.id} templateTitle={tmpl.title} items={items} />
              </div>
            </section>
          );
        })}
        {!templates?.length ? <p className="text-sm text-[var(--color-text-muted)]">{th("noTemplates")}</p> : null}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]">{th("recentInspections")}</h2>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-[var(--color-surface-elevated)]">
            <tr>
              <th className="px-3 py-2 font-semibold">{th("colTitle")}</th>
              <th className="px-3 py-2 font-semibold">{th("colStatus")}</th>
              <th className="px-3 py-2 font-semibold">{th("colPerformed")}</th>
            </tr>
          </thead>
          <tbody>
            {(recent ?? []).map((row) => {
              const tr = row as { id: string; title: Record<string, string>; status: string; performed_at: string | null };
              return (
                <tr key={tr.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2">{resolveLocalized(tr.title, locale).text || "—"}</td>
                  <td className="px-3 py-2">{tr.status}</td>
                  <td className="px-3 py-2 text-[var(--color-text-muted)]">
                    {tr.performed_at ? new Date(tr.performed_at).toLocaleString(locale) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!recent?.length ? <p className="p-4 text-sm text-[var(--color-text-muted)]">{th("emptyInspections")}</p> : null}
      </div>
    </AppShell>
  );
}
