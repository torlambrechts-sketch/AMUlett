import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { resolveLocalized } from "@/lib/learning/localize";
import { WikiPageTree, type WikiTreeNode } from "@/components/wiki/wiki-page-tree";
import { userCanWikiWrite, userIsOrgAdmin } from "@/lib/wiki/server-access";
import { getOrCreateDefaultWikiSpace } from "@/lib/wiki/get-default-space";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function DocumentsHubPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const t = await getTranslations("documents");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const { spaceId, error: spaceErr } = await getOrCreateDefaultWikiSpace(supabase, org.organizationId);

  if (!spaceId) {
    return (
      <AppShell title={t("title")}>
        <p className="text-sm text-red-600">
          {t("setupError")} {spaceErr ?? ""}
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">{t("migrationHint")}</p>
        {spaceErr?.includes("wiki.write") ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("askWikiAuthor")}</p> : null}
      </AppShell>
    );
  }

  const { data: space } = await supabase
    .from("wiki_spaces")
    .select("id, slug, name")
    .eq("id", spaceId)
    .maybeSingle();

  if (!space) {
    return (
      <AppShell title={t("title")}>
        <p className="text-sm text-[var(--color-text-muted)]">{t("noSpace")}</p>
      </AppShell>
    );
  }

  const canWrite = await userCanWikiWrite(org.organizationId);
  const isAdmin = await userIsOrgAdmin(org.organizationId);

  const { data: pages } = await supabase
    .from("wiki_pages")
    .select("id, slug, title, parent_id, publish_status")
    .eq("space_id", space.id)
    .order("slug");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let searchResults: { id: string; slug: string; title: Record<string, string> | null }[] = [];
  if (q?.trim()) {
    const query = q.trim();
    const escaped = query.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const fts = await supabase
      .from("wiki_pages")
      .select("id, slug, title")
      .eq("space_id", space.id)
      .textSearch("search_vector", escaped, { type: "plain", config: "simple" });
    if (!fts.error && fts.data?.length) {
      searchResults = fts.data as typeof searchResults;
    } else {
      const slugOnly = await supabase
        .from("wiki_pages")
        .select("id, slug, title")
        .eq("space_id", space.id)
        .ilike("slug", `%${escaped}%`);
      searchResults = (slugOnly.data ?? []) as typeof searchResults;
    }
  }

  type FavRow = { page_id: string; pinned: boolean; slug: string; title: Record<string, string> | null };
  let favoriteRows: FavRow[] = [];
  if (user) {
    const { data: favs } = await supabase
      .from("wiki_page_favorites")
      .select("page_id, pinned")
      .eq("user_id", user.id)
      .eq("organization_id", org.organizationId);
    const ids = favs?.map((f) => f.page_id) ?? [];
    if (ids.length && favs) {
      const { data: fp } = await supabase.from("wiki_pages").select("id, slug, title").in("id", ids).eq("space_id", space.id);
      const pinBy = new Map(favs.map((f) => [f.page_id, f.pinned]));
      favoriteRows =
        (fp ?? []).map((p) => ({
          page_id: p.id,
          pinned: pinBy.get(p.id) ?? false,
          slug: p.slug,
          title: p.title as Record<string, string> | null,
        })) ?? [];
    }
  }

  const pending =
    isAdmin && canWrite
      ? ((pages ?? []) as WikiTreeNode[]).filter((p) => p.publish_status === "pending_approval")
      : [];

  return (
    <AppShell title={t("title")}>
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("intro")}</p>

      <form method="get" className="mb-6 flex max-w-xl flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("searchPlaceholder")}
          className="min-w-[200px] flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)]">
          {t("search")}
        </button>
      </form>

      {q?.trim() ? (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">{t("searchResults")}</h2>
          {searchResults.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">{t("noResults")}</p>
          ) : (
            <ul className="space-y-1">
              {searchResults.map((p) => (
                <li key={p.id}>
                  <Link href={`/documents/s/${space.slug}/p/${p.slug}`} className="text-sm text-[var(--color-primary)] hover:underline">
                    {resolveLocalized(p.title ?? {}, locale).text || p.slug}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {favoriteRows.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">{t("favorites")}</h2>
          <ul className="space-y-1">
            {favoriteRows.map((f) => (
              <li key={f.page_id}>
                <Link href={`/documents/s/${space.slug}/p/${f.slug}`} className="text-sm text-[var(--color-primary)] hover:underline">
                  {resolveLocalized(f.title ?? {}, locale).text || f.slug}
                  {f.pinned ? <span className="ml-1 text-xs text-[var(--color-text-muted)]">· {t("pinned")}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pending.length > 0 ? (
        <section className="mb-8 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">{t("pendingApproval")}</h2>
          <ul className="space-y-1">
            {pending.map((p) => (
              <li key={p.id}>
                <Link href={`/documents/s/${space.slug}/p/${p.slug}`} className="text-sm text-[var(--color-primary)] hover:underline">
                  {resolveLocalized(p.title ?? {}, locale).text || p.slug}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">{t("treeTitle")}</h2>
            {canWrite ? (
              <Link
                href={`/documents/s/${space.slug}/new`}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                {t("newPage")}
              </Link>
            ) : null}
          </div>
          <WikiPageTree pages={(pages ?? []) as WikiTreeNode[]} spaceSlug={space.slug} locale={locale} />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
          <p>{t("selectPage")}</p>
          <ul className="mt-4 list-disc pl-5 space-y-1">
            <li>{t("hintVersioning")}</li>
            <li>{t("hintTemplates")}</li>
            <li>{t("hintReview")}</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
