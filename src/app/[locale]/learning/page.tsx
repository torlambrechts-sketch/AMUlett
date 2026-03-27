import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { fetchPublishedCatalog } from "@/lib/learning/catalog";
import { getUserOrgContext } from "@/lib/org/server";
import { getLearningAccess } from "@/lib/learning/server-access";
import { CatalogCourseCard } from "@/components/learning/catalog-course-card";

export default async function LearningPage() {
  const t = await getTranslations("lms");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  const access = await getLearningAccess(org?.organizationId ?? null);
  const catalog = org ? await fetchPublishedCatalog(org.organizationId) : { system: [], organization: [] };

  return (
    <AppShell title={t("catalogTitle")}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-[var(--color-text-muted)]">{t("catalogIntro")}</p>
        {(access.canAuthorOrg || access.isPlatformAdmin) && (
          <Link
            href="/learning/studio"
            className="rounded-[var(--radius-md)] border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-muted)]"
          >
            {t("openStudio")}
          </Link>
        )}
      </div>

      {!org ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t("needOrg")}</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">{t("systemCourses")}</h2>
            {catalog.system.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">{t("noSystemCourses")}</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {catalog.system.map((c) => (
                  <CatalogCourseCard
                    key={c.id}
                    course={c}
                    locale={locale}
                    badge={t("badgeDefault")}
                    badgeClassName="text-[var(--color-primary)]"
                    t={t}
                  />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">{t("companyCourses")}</h2>
            {catalog.organization.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">{t("noCompanyCourses")}</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {catalog.organization.map((c) => (
                  <CatalogCourseCard
                    key={c.id}
                    course={c}
                    locale={locale}
                    badge={t("badgeCompany")}
                    badgeClassName="text-[var(--color-text-muted)]"
                    t={t}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
