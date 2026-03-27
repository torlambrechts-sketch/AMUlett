import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { resolveLocalized } from "@/lib/learning/localize";
import { WikiDocView } from "@/components/wiki/wiki-doc-view";
import { WikiToc } from "@/components/wiki/wiki-toc";
import { extractTocFromHtml, extractTocFromMarkdown } from "@/lib/wiki/toc";
import { parseWikiDocument } from "@/lib/wiki/types";
import { userCanWikiWrite, userIsOrgAdmin } from "@/lib/wiki/server-access";
import { WikiFavoriteButton } from "@/components/wiki/wiki-favorite-button";
import { WikiPresenceBar } from "@/components/wiki/wiki-presence";

type Props = { params: Promise<{ spaceSlug: string; pageSlug: string }> };

export default async function WikiPageView({ params }: Props) {
  const { spaceSlug, pageSlug } = await params;
  const t = await getTranslations("documents");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: space } = await supabase
    .from("wiki_spaces")
    .select("id, slug, organization_id")
    .eq("slug", spaceSlug)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!space) notFound();

  const { data: page } = await supabase
    .from("wiki_pages")
    .select(
      "id, slug, title, parent_id, owner_user_id, publish_status, requires_approval, next_review_at, review_reminder_months, template_key, current_revision_id"
    )
    .eq("space_id", space.id)
    .eq("slug", pageSlug)
    .maybeSingle();

  if (!page) notFound();

  const canWrite = await userCanWikiWrite(org.organizationId);
  const isAdmin = await userIsOrgAdmin(org.organizationId);

  if (page.publish_status !== "published" && !canWrite) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (page.publish_status === "draft" && user?.id !== page.owner_user_id) notFound();
    if (page.publish_status === "pending_approval" && !isAdmin) notFound();
  }

  const { data: rev } = page.current_revision_id
    ? await supabase
        .from("wiki_page_revisions")
        .select("id, version, editor_document, created_at, created_by")
        .eq("id", page.current_revision_id)
        .maybeSingle()
    : { data: null };

  const titleRes = resolveLocalized(page.title as Record<string, string>, locale);
  const doc = parseWikiDocument(rev?.editor_document);
  let tocEntries =
    doc.format === "markdown"
      ? extractTocFromMarkdown(doc.markdown)
      : (() => {
          const combined: { level: number; text: string; id: string }[] = [];
          let hi = 0;
          for (const b of doc.blocks) {
            if (b.type !== "text") continue;
            const tb = b as { html?: string; content?: string };
            if (tb.html?.trim()) {
              for (const e of extractTocFromHtml(tb.html)) {
                combined.push({ ...e, id: `${b.id}-${e.id}-${hi++}` });
              }
            } else {
              for (const e of extractTocFromMarkdown(tb.content ?? "")) {
                combined.push({ ...e, id: `${b.id}-${e.id}-${hi++}` });
              }
            }
          }
          return combined;
        })();

  const { data: tagRows } = await supabase
    .from("wiki_page_tags")
    .select("tag_id, wiki_tags(slug, label)")
    .eq("page_id", page.id);

  const now = new Date();
  const reviewDue =
    page.next_review_at && new Date(page.next_review_at as string) <= now && page.publish_status === "published";

  return (
    <AppShell
      title={titleRes.text || page.slug}
      titleLocaleNote={!titleRes.localeMatched && titleRes.usedLocale ? t("titleFromLocale", { locale: titleRes.usedLocale }) : undefined}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/documents" className="text-[var(--color-primary)] hover:underline">
          {t("backToHub")}
        </Link>
        {canWrite ? (
          <>
            <Link href={`/documents/s/${spaceSlug}/p/${pageSlug}/edit`} className="text-[var(--color-primary)] hover:underline">
              {t("edit")}
            </Link>
            <Link href={`/documents/s/${spaceSlug}/p/${pageSlug}/history`} className="text-[var(--color-text-muted)] hover:underline">
              {t("history")}
            </Link>
          </>
        ) : null}
        <WikiFavoriteButton pageId={page.id} organizationId={org.organizationId} />
      </div>

      <WikiPresenceBar pageId={page.id} organizationId={org.organizationId} />

      {page.publish_status !== "published" ? (
        <p className="mb-4 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {page.publish_status === "pending_approval" ? t("bannerPending") : t("bannerDraft")}
        </p>
      ) : null}

      {reviewDue ? (
        <p className="mb-4 rounded-[var(--radius-md)] border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100">
          {t("reviewDue")}
        </p>
      ) : null}

      {tagRows && tagRows.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {tagRows.map((tr) => {
            const raw = tr.wiki_tags;
            const tg = (Array.isArray(raw) ? raw[0] : raw) as { slug: string; label: Record<string, string> } | null | undefined;
            if (!tg) return null;
            const lab = resolveLocalized(tg.label ?? {}, locale).text || tg.slug;
            return (
              <span key={tr.tag_id} className="rounded-full bg-[var(--color-surface-elevated)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                {lab}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
        <article className="min-w-0">
          {rev ? (
            <WikiDocView editorDocument={rev.editor_document} spaceSlug={spaceSlug} />
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">{t("noContent")}</p>
          )}
          {rev ? (
            <p className="mt-8 text-xs text-[var(--color-text-muted)]">
              {t("versionLabel", { version: rev.version })} · {new Date(rev.created_at).toLocaleString()}
            </p>
          ) : null}
        </article>
        <aside className="hidden lg:block">
          <WikiToc entries={tocEntries} />
        </aside>
      </div>
    </AppShell>
  );
}
