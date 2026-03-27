import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { resolveLocalized } from "@/lib/learning/localize";
import { userCanWikiWrite } from "@/lib/wiki/server-access";
import { WikiDiffView } from "@/components/wiki/wiki-diff-view";

type Props = {
  params: Promise<{ spaceSlug: string; pageSlug: string }>;
  searchParams: Promise<{ left?: string; right?: string }>;
};

export default async function WikiComparePage({ params, searchParams }: Props) {
  const { spaceSlug, pageSlug } = await params;
  const { left, right } = await searchParams;
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
    .select("id")
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

  const { data: allRev } = await supabase
    .from("wiki_page_revisions")
    .select("id, version, body_plain")
    .eq("page_id", page.id)
    .order("version", { ascending: false });

  const revs = allRev ?? [];
  const leftId = left ?? revs[1]?.id;
  const rightId = right ?? revs[0]?.id;

  const leftRev = revs.find((r) => r.id === leftId);
  const rightRev = revs.find((r) => r.id === rightId);

  const titleRes = resolveLocalized(page.title as Record<string, string>, locale);

  return (
    <AppShell title={`${t("compare")}: ${titleRes.text || page.slug}`}>
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href={`/documents/s/${spaceSlug}/p/${pageSlug}/history`} className="text-[var(--color-primary)] hover:underline">
          ← {t("history")}
        </Link>
      </div>

      {!leftRev || !rightRev ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t("pickTwoVersions")}</p>
      ) : (
        <WikiDiffView
          left={leftRev.body_plain ?? ""}
          right={rightRev.body_plain ?? ""}
          leftLabel={t("versionLabel", { version: leftRev.version })}
          rightLabel={t("versionLabel", { version: rightRev.version })}
        />
      )}

      {revs.length > 1 ? (
        <form method="get" className="mt-8 flex flex-wrap items-end gap-3 text-sm">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-muted)]">{t("leftRevision")}</label>
            <select name="left" defaultValue={leftId} className="rounded border px-2 py-1">
              {revs.map((r) => (
                <option key={r.id} value={r.id}>
                  v{r.version}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-muted)]">{t("rightRevision")}</label>
            <select name="right" defaultValue={rightId} className="rounded border px-2 py-1">
              {revs.map((r) => (
                <option key={r.id} value={r.id}>
                  v{r.version}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-[var(--color-primary-fg)]">
            {t("compare")}
          </button>
        </form>
      ) : null}
    </AppShell>
  );
}
