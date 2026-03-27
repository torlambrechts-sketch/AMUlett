import { Link } from "@/i18n/navigation";
import { resolveLocalized } from "@/lib/learning/localize";
import type { LearningCourseRow } from "@/lib/learning/types";

type TFn = (key: string, values?: Record<string, string>) => string;

export function StudioCourseListItem({
  course,
  locale,
  badge,
  badgeClassName,
  publishedLabel,
  draftLabel,
  editLabel,
  t,
}: {
  course: LearningCourseRow;
  locale: string;
  badge: string;
  badgeClassName: string;
  publishedLabel: string;
  draftLabel: string;
  editLabel: string;
  t: TFn;
}) {
  const titleRes = resolveLocalized(course.title, locale);

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div>
        <span className={`text-xs ${badgeClassName}`}>{badge}</span>
        <p className="font-medium text-[var(--color-text)]">{titleRes.text || course.slug}</p>
        {!titleRes.text ? (
          <p className="text-xs italic text-[var(--color-text-muted)]">{t("notAvailableInThisLanguage")}</p>
        ) : !titleRes.localeMatched && titleRes.usedLocale ? (
          <p className="text-xs text-amber-900 dark:text-amber-100/90">
            {t("contentFromOtherLocale", { language: t(`localeName_${titleRes.usedLocale}`) })}
          </p>
        ) : null}
        <p className="text-xs text-[var(--color-text-muted)]">{course.published ? publishedLabel : draftLabel}</p>
      </div>
      <Link href={`/learning/studio/${course.id}`} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
        {editLabel}
      </Link>
    </li>
  );
}
