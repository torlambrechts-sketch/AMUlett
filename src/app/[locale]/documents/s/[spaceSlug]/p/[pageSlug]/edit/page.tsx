import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { resolveLocalized } from "@/lib/learning/localize";
import { userCanWikiWrite, userIsOrgAdmin } from "@/lib/wiki/server-access";
import { WikiPageEditor } from "@/components/wiki/wiki-page-editor";
import { DocumentsPdLayout } from "@/components/documents/documents-pd-layout";

type Props = { params: Promise<{ spaceSlug: string; pageSlug: string }> };

export default async function WikiPageEdit({ params }: Props) {
  const { spaceSlug, pageSlug } = await params;
  const t = await getTranslations("documents");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const canWrite = await userCanWikiWrite(org.organizationId);
  if (!canWrite) redirect(`/${locale}/documents/s/${spaceSlug}/p/${pageSlug}`);

  const isAdmin = await userIsOrgAdmin(org.organizationId);
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
      "id, slug, title, publish_status, requires_approval, review_reminder_months, next_review_at, current_revision_id, library_category"
    )
    .eq("space_id", space.id)
    .eq("slug", pageSlug)
    .maybeSingle();

  if (!page) notFound();

  const { data: rev } = page.current_revision_id
    ? await supabase
        .from("wiki_page_revisions")
        .select("id, version, editor_document, body_plain")
        .eq("id", page.current_revision_id)
        .maybeSingle()
    : { data: null };

  const { data: allTags } = await supabase.from("wiki_tags").select("id, slug, label").eq("organization_id", org.organizationId).order("slug");

  const { data: pageTagRows } = await supabase.from("wiki_page_tags").select("tag_id").eq("page_id", page.id);
  const selectedTagIds = new Set((pageTagRows ?? []).map((r) => r.tag_id));

  const titleRes = resolveLocalized(page.title as Record<string, string>, locale);

  return (
    <AppShell title={`${t("edit")}: ${titleRes.text || page.slug}`} mainClassName="!p-0">
      <DocumentsPdLayout>
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href={`/documents/s/${spaceSlug}/p/${pageSlug}`} className="text-[var(--color-primary)] hover:underline">
          {t("viewPage")}
        </Link>
        <Link href="/documents" className="text-[var(--color-text-muted)] hover:underline">
          {t("backToHub")}
        </Link>
      </div>

      <WikiPageEditor
        key={`${page.id}-${rev?.id ?? "new"}`}
        spaceSlug={spaceSlug}
        pageId={page.id}
        pageSlug={page.slug}
        organizationId={org.organizationId}
        initialTitle={page.title as Record<string, string>}
        initialLibraryCategory={(page.library_category as string) ?? "general"}
        initialPublishStatus={page.publish_status as string}
        requiresApproval={page.requires_approval as boolean}
        reviewMonths={page.review_reminder_months as number | null}
        nextReviewAt={page.next_review_at as string | null}
        initialDocument={rev?.editor_document ?? {}}
        revisionVersion={rev?.version ?? 0}
        locale={locale}
        isAdmin={isAdmin}
        allTags={(allTags ?? []).map((tg) => ({
          id: tg.id,
          slug: tg.slug,
          label: tg.label as Record<string, string>,
        }))}
        selectedTagIds={Array.from(selectedTagIds)}
      />
      </DocumentsPdLayout>
    </AppShell>
  );
}
