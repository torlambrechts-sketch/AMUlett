import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { getLearningAccess } from "@/lib/learning/server-access";
import { StudioCourseListItem } from "@/components/learning/studio-course-list-item";
import type { LearningCourseRow } from "@/lib/learning/types";

export default async function LearningStudioPage() {
  const t = await getTranslations("lms");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const access = await getLearningAccess(org.organizationId);
  if (!access.canAuthorOrg && !access.isPlatformAdmin) {
    redirect(`/${locale}/learning`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <AppShell title={t("studioTitle")}>
        <p className="text-sm text-[var(--color-text-muted)]">Supabase not configured.</p>
      </AppShell>
    );
  }

  let orgCourses: LearningCourseRow[] = [];
  if (access.canAuthorOrg) {
    const { data } = await supabase
      .from("learning_courses")
      .select("id, organization_id, slug, title, description, published, scope, created_at")
      .eq("scope", "organization")
      .eq("organization_id", org.organizationId)
      .order("created_at", { ascending: false });
    orgCourses = (data ?? []) as LearningCourseRow[];
  }

  let systemCourses: LearningCourseRow[] = [];
  if (access.isPlatformAdmin) {
    const { data } = await supabase
      .from("learning_courses")
      .select("id, organization_id, slug, title, description, published, scope, created_at")
      .eq("scope", "system_default")
      .order("created_at", { ascending: false });
    systemCourses = (data ?? []) as LearningCourseRow[];
  }

  /** Published catalog courses: visible to authors for export (platform admins use the list above). */
  let systemPublishedForAuthors: LearningCourseRow[] = [];
  if (access.canAuthorOrg && !access.isPlatformAdmin) {
    const { data } = await supabase
      .from("learning_courses")
      .select("id, organization_id, slug, title, description, published, scope, created_at")
      .eq("scope", "system_default")
      .eq("published", true)
      .order("created_at", { ascending: false });
    systemPublishedForAuthors = (data ?? []) as LearningCourseRow[];
  }

  return (
    <AppShell title={t("studioTitle")}>
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("studioIntro")}</p>
      <div className="mb-6">
        <Link
          href="/learning/studio/new"
          className="inline-flex rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)]"
        >
          {t("newCourse")}
        </Link>
      </div>

      {access.isPlatformAdmin ? (
        <section className="mb-10">
          <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">{t("studioSystemList")}</h2>
          {systemCourses.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">{t("noSystemCoursesDraft")}</p>
          ) : (
            <ul className="space-y-2">
              {systemCourses.map((c) => (
                <StudioCourseListItem
                  key={c.id}
                  course={c}
                  locale={locale}
                  badge={t("badgeDefault")}
                  badgeClassName="text-[var(--color-primary)]"
                  publishedLabel={t("published")}
                  draftLabel={t("draft")}
                  editLabel={t("edit")}
                  t={t}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {access.canAuthorOrg && !access.isPlatformAdmin && systemPublishedForAuthors.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-2 text-base font-semibold text-[var(--color-text)]">{t("studioDefaultCatalogForExport")}</h2>
          <p className="mb-3 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("studioDefaultCatalogForExportIntro")}</p>
          <ul className="space-y-2">
            {systemPublishedForAuthors.map((c) => (
              <StudioCourseListItem
                key={c.id}
                course={c}
                locale={locale}
                badge={t("badgeDefault")}
                badgeClassName="text-[var(--color-primary)]"
                publishedLabel={t("published")}
                draftLabel={t("draft")}
                editLabel={t("openToExport")}
                t={t}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">{t("studioCompanyList")}</h2>
        {!access.canAuthorOrg ? (
          <p className="text-sm text-[var(--color-text-muted)]">{t("noAuthorAccess")}</p>
        ) : orgCourses.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">{t("noCompanyCoursesDraft")}</p>
        ) : (
          <ul className="space-y-2">
            {orgCourses.map((c) => (
              <StudioCourseListItem
                key={c.id}
                course={c}
                locale={locale}
                badge={t("badgeCompany")}
                badgeClassName="text-[var(--color-text-muted)]"
                publishedLabel={t("published")}
                draftLabel={t("draft")}
                editLabel={t("edit")}
                t={t}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-xs text-[var(--color-text-muted)]">{t("platformAdminHint")}</p>
    </AppShell>
  );
}
