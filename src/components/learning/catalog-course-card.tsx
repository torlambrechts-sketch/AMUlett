import { Link } from "@/i18n/navigation";
import { resolveLocalized } from "@/lib/learning/localize";
import { LocalizedParagraph } from "@/components/learning/localized-content";
import { EnrollButton } from "@/components/learning/enroll-button";
import type { LearningCourseRow } from "@/lib/learning/types";

type TFn = (key: string, values?: Record<string, string>) => string;

export function CatalogCourseCard({
  course,
  locale,
  badge,
  badgeClassName,
  t,
}: {
  course: LearningCourseRow;
  locale: string;
  badge: string;
  badgeClassName: string;
  t: TFn;
}) {
  const titleRes = resolveLocalized(course.title, locale);
  const descRes = resolveLocalized(course.description, locale);

  return (
    <li className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
      <p className={`text-xs font-medium uppercase tracking-wide ${badgeClassName}`}>{badge}</p>
      <div className="mt-1">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">{titleRes.text || course.slug}</h3>
        {!titleRes.text ? (
          <p className="mt-1 text-xs italic text-[var(--color-text-muted)]">{t("notAvailableInThisLanguage")}</p>
        ) : !titleRes.localeMatched && titleRes.usedLocale ? (
          <p className="mt-1 text-xs text-amber-900 dark:text-amber-100/90">
            {t("contentFromOtherLocale", { language: t(`localeName_${titleRes.usedLocale}`) })}
          </p>
        ) : null}
      </div>
      <div className="mt-2 line-clamp-3">
        <LocalizedParagraph
          resolved={descRes}
          emptyMessage={t("notAvailableInThisLanguage")}
          fallbackMessage={(lang) => t("contentFromOtherLocale", { language: lang })}
          textClassName="text-sm text-[var(--color-text-muted)]"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/learning/course/${course.id}`} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          {t("viewCourse")}
        </Link>
        <EnrollButton courseId={course.id} label={t("enroll")} />
      </div>
    </li>
  );
}
