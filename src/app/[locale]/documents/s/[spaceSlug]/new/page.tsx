import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userCanWikiWrite } from "@/lib/wiki/server-access";
import { loadWikiTemplates } from "@/lib/wiki/templates";
import { WikiNewPageForm } from "@/components/wiki/wiki-new-page-form";
import { DocumentsPdLayout } from "@/components/documents/documents-pd-layout";

type Props = { params: Promise<{ spaceSlug: string }> };

export default async function WikiNewPage({ params }: Props) {
  const { spaceSlug } = await params;
  const t = await getTranslations("documents");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const canWrite = await userCanWikiWrite(org.organizationId);
  if (!canWrite) redirect(`/${locale}/documents`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: space } = await supabase
    .from("wiki_spaces")
    .select("id, slug, organization_id")
    .eq("slug", spaceSlug)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!space) notFound();

  const { data: pages } = await supabase
    .from("wiki_pages")
    .select("id, slug, title")
    .eq("space_id", space.id)
    .order("slug");

  const templates = loadWikiTemplates();

  return (
    <AppShell title={t("newPageTitle")} mainClassName="!p-0">
      <DocumentsPdLayout>
      <Link href="/documents" className="mb-6 inline-block text-sm text-[var(--color-primary)] hover:underline">
        ← {t("backToHub")}
      </Link>
      <WikiNewPageForm
        spaceId={space.id}
        spaceSlug={space.slug}
        parentOptions={(pages ?? []).map((p) => ({ id: p.id, slug: p.slug, title: p.title as Record<string, string> | null }))}
        templates={templates}
        locale={locale}
      />
      </DocumentsPdLayout>
    </AppShell>
  );
}
