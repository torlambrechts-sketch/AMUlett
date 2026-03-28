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
import { DocumentLibraryUpload } from "@/components/documents/document-library-upload";
import { DocumentLibraryFilters } from "@/components/documents/document-library-filters";
import { DocumentLibraryTable, type LibraryRow, type WikiLibraryRow, type FileLibraryRow } from "@/components/documents/document-library-table";
import { isLibraryCategory, type LibraryCategory } from "@/lib/documents/library-categories";

type Props = {
  searchParams: Promise<{ q?: string; type?: string; cat?: string; sort?: string }>;
};

function wikiTitleSearch(hay: Record<string, string> | null, needle: string): boolean {
  const n = needle.toLowerCase();
  if (!hay) return false;
  for (const v of Object.values(hay)) {
    if (v && String(v).toLowerCase().includes(n)) return true;
  }
  return false;
}

function buildLibraryRows(params: {
  wikiPages: {
    id: string;
    slug: string;
    title: Record<string, string> | null;
    publish_status: string;
    library_category?: string | null;
    updated_at?: string | null;
  }[];
  files: {
    id: string;
    title: Record<string, string> | null;
    category: string;
    file_ext: string | null;
    file_size_bytes: number | null;
    storage_path: string;
    created_at: string | null;
  }[];
  q: string;
  typeFilter: string;
  catFilter: string;
  sort: string;
  locale: string;
}): LibraryRow[] {
  const { wikiPages, files, q, typeFilter, catFilter, sort, locale } = params;
  const needle = q.trim().toLowerCase();

  let wikiRows: WikiLibraryRow[] = wikiPages.map((p) => ({
    kind: "wiki" as const,
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: (isLibraryCategory(p.library_category ?? "general") ? p.library_category : "general") as LibraryCategory,
    publishStatus: p.publish_status,
    updatedAt: p.updated_at ?? null,
  }));

  let fileRows: FileLibraryRow[] = files.map((f) => ({
    kind: "file" as const,
    id: f.id,
    title: f.title,
    category: (isLibraryCategory(f.category) ? f.category : "general") as LibraryCategory,
    fileExt: f.file_ext,
    fileSizeBytes: f.file_size_bytes,
    storagePath: f.storage_path,
    createdAt: f.created_at,
  }));

  if (needle) {
    wikiRows = wikiRows.filter(
      (w) => w.slug.toLowerCase().includes(needle) || wikiTitleSearch(w.title, needle),
    );
    fileRows = fileRows.filter((f) => {
      const t = resolveLocalized(f.title ?? {}, locale).text || "";
      return t.toLowerCase().includes(needle);
    });
  }

  if (typeFilter === "wiki") fileRows = [];
  if (typeFilter === "file") wikiRows = [];

  if (catFilter !== "all") {
    wikiRows = wikiRows.filter((w) => w.category === catFilter);
    fileRows = fileRows.filter((f) => f.category === catFilter);
  }

  const combined: LibraryRow[] = [...wikiRows, ...fileRows];

  const titleKey = (r: LibraryRow): string => {
    if (r.kind === "wiki") {
      return (resolveLocalized(r.title ?? {}, locale).text || r.slug).toLowerCase();
    }
    return (resolveLocalized(r.title ?? {}, locale).text || "").toLowerCase();
  };

  const catKey = (r: LibraryRow) => r.category;
  const updatedKey = (r: LibraryRow): number => {
    if (r.kind === "wiki") return r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
    return r.createdAt ? new Date(r.createdAt).getTime() : 0;
  };

  if (sort === "title") {
    combined.sort((a, b) => titleKey(a).localeCompare(titleKey(b)));
  } else if (sort === "updated") {
    combined.sort((a, b) => updatedKey(b) - updatedKey(a));
  } else {
    combined.sort((a, b) => {
      const c = catKey(a).localeCompare(catKey(b));
      if (c !== 0) return c;
      return titleKey(a).localeCompare(titleKey(b));
    });
  }

  return combined;
}

export default async function DocumentsHubPage({ searchParams }: Props) {
  const { q = "", type: typeParam, cat: catParam, sort: sortParam } = await searchParams;
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

  const { data: space } = await supabase.from("wiki_spaces").select("id, slug, name").eq("id", spaceId).maybeSingle();

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
    .select("id, slug, title, parent_id, publish_status, library_category, updated_at")
    .eq("space_id", space.id)
    .order("slug");

  const { data: fileRowsRaw, error: fileErr } = await supabase
    .from("document_library_items")
    .select("id, title, category, file_ext, file_size_bytes, storage_path, created_at")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });

  const files =
    fileErr && fileErr.code === "42P01"
      ? []
      : fileErr
        ? []
        : (fileRowsRaw ?? []);

  const typeFilter = typeParam === "wiki" || typeParam === "file" ? typeParam : "all";
  const catFilter = catParam && catParam !== "all" && isLibraryCategory(catParam) ? catParam : "all";
  const sort = sortParam === "title" || sortParam === "updated" ? sortParam : "category";

  const libraryRows = buildLibraryRows({
    wikiPages: (pages ?? []) as {
      id: string;
      slug: string;
      title: Record<string, string> | null;
      publish_status: string;
      library_category?: string | null;
      updated_at?: string | null;
    }[],
    files: files as {
      id: string;
      title: Record<string, string> | null;
      category: string;
      file_ext: string | null;
      file_size_bytes: number | null;
      storage_path: string;
      created_at: string | null;
    }[],
    q,
    typeFilter,
    catFilter,
    sort,
    locale,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

      <section className="mb-10">
        <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">{t("libraryTitle")}</h2>
        <p className="mb-4 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("libraryIntro")}</p>
        {fileErr && fileErr.code !== "42P01" ? (
          <p className="mb-4 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            {t("libraryDbHint")}
          </p>
        ) : null}
        {canWrite ? <DocumentLibraryUpload organizationId={org.organizationId} /> : null}
        <div className="mt-4">
          <DocumentLibraryFilters />
        </div>
        <div className="mt-4">
          <DocumentLibraryTable spaceSlug={space.slug} locale={locale} rows={libraryRows} canWrite={canWrite} />
        </div>
      </section>

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
              <Link href={`/documents/s/${space.slug}/new`} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                {t("newPage")}
              </Link>
            ) : null}
          </div>
          <WikiPageTree pages={(pages ?? []) as WikiTreeNode[]} spaceSlug={space.slug} locale={locale} />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
          <p>{t("selectPage")}</p>
          <ul className="mt-4 list-disc space-y-1 pl-5">
            <li>{t("hintVersioning")}</li>
            <li>{t("hintTemplates")}</li>
            <li>{t("hintReview")}</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
