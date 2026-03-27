import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { resolveLocalized } from "@/lib/learning/localize";
import { userCanWikiWrite } from "@/lib/wiki/server-access";
import { WikiRollbackButton } from "@/components/wiki/wiki-rollback-button";

type Props = { params: Promise<{ spaceSlug: string; pageSlug: string }> };

export default async function WikiHistoryPage({ params }: Props) {
  const { spaceSlug, pageSlug } = await params;
  const t = await getTranslations("documents");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const canWrite = await userCanWikiWrite(org.organizationId);
  if (!canWrite) redirect(`/${locale}/documents/s/${spaceSlug}/p/${pageSlug}`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: space } = await supabase
    .from("wiki_spaces")
    .select("id, organization_id")
    .eq("slug", spaceSlug)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!space) notFound();

  const { data: page } = await supabase
    .from("wiki_pages")
    .select("id, slug, title, current_revision_id")
    .eq("space_id", space.id)
    .eq("slug", pageSlug)
    .maybeSingle();

  if (!page) notFound();

  const { data: revisions } = await supabase
    .from("wiki_page_revisions")
    .select("id, version, created_at, revision_summary, created_by")
    .eq("page_id", page.id)
    .order("version", { ascending: false });

  const titleRes = resolveLocalized(page.title as Record<string, string>, locale);

  return (
    <AppShell title={`${t("history")}: ${titleRes.text || page.slug}`}>
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href={`/documents/s/${spaceSlug}/p/${pageSlug}`} className="text-[var(--color-primary)] hover:underline">
          {t("viewPage")}
        </Link>
        <Link href={`/documents/s/${spaceSlug}/p/${pageSlug}/edit`} className="text-[var(--color-text-muted)] hover:underline">
          {t("edit")}
        </Link>
      </div>

      <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        {(revisions ?? []).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <span className="font-medium text-[var(--color-text)]">
                {t("versionLabel", { version: r.version })}
              </span>
              <span className="ml-2 text-xs text-[var(--color-text-muted)]">{new Date(r.created_at).toLocaleString()}</span>
              {r.revision_summary ? (
                <p className="text-xs text-[var(--color-text-muted)]">{r.revision_summary}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/documents/s/${spaceSlug}/p/${pageSlug}/compare?left=${r.id}`}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                {t("compare")}
              </Link>
              {page.current_revision_id !== r.id ? (
                <WikiRollbackButton pageId={page.id} revisionId={r.id} label={t("rollback")} />
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">{t("current")}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
