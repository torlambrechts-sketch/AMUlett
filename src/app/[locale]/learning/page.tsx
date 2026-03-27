import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { fetchPublishedCatalog } from "@/lib/learning/catalog";
import { getUserOrgContext } from "@/lib/org/server";
import { getLearningAccess } from "@/lib/learning/server-access";
import { pickLocalizedJson } from "@/lib/learning/localize";
import { EnrollButton } from "@/components/learning/enroll-button";

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
                  <li
                    key={c.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-primary)]">
                      {t("badgeDefault")}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[var(--color-text)]">
                      {pickLocalizedJson(c.title, locale) || c.slug}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)] line-clamp-3">
                      {pickLocalizedJson(c.description, locale)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/learning/course/${c.id}`}
                        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                      >
                        {t("viewCourse")}
                      </Link>
                      <EnrollButton courseId={c.id} label={t("enroll")} />
                    </div>
                  </li>
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
                  <li
                    key={c.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                      {t("badgeCompany")}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[var(--color-text)]">
                      {pickLocalizedJson(c.title, locale) || c.slug}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)] line-clamp-3">
                      {pickLocalizedJson(c.description, locale)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/learning/course/${c.id}`}
                        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                      >
                        {t("viewCourse")}
                      </Link>
                      <EnrollButton courseId={c.id} label={t("enroll")} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
