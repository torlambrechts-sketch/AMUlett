"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveLocalized } from "@/lib/learning/localize";
import { LocalizedParagraph } from "@/components/learning/localized-content";
import { EnrollButton } from "@/components/learning/enroll-button";
import type { LearningCourseRow } from "@/lib/learning/types";

function Chevron({ up, className }: { up: boolean; className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
      style={{ transform: up ? "rotate(180deg)" : undefined }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export function LearningAcCatalog({
  locale,
  learnerName,
  featured,
  rows,
  canAuthor,
}: {
  locale: string;
  learnerName: string;
  featured: LearningCourseRow | null;
  rows: LearningCourseRow[];
  canAuthor: boolean;
}) {
  const t = useTranslations("lms");
  const [openId, setOpenId] = useState<string | null>(featured?.id ?? rows[0]?.id ?? null);

  const ordered = useMemo(() => {
    const list = [...rows];
    if (featured && !list.some((c) => c.id === featured.id)) {
      return [featured, ...list];
    }
    if (featured) {
      const rest = list.filter((c) => c.id !== featured.id);
      return [featured, ...rest];
    }
    return list;
  }, [featured, rows]);

  return (
    <div className="learning-ac-main pb-24 text-[13px] leading-5 text-[#171a1f]">
      {/* Top promo strip */}
      <div className="flex flex-col items-center justify-center gap-3 border-b border-black/5 px-4 py-3.5 sm:flex-row sm:gap-10 md:px-8">
        <p className="max-w-2xl text-center text-xs leading-5 text-[#171a1f] sm:text-left">{t("acBanner", { name: learnerName })}</p>
        <button
          type="button"
          className="shrink-0 rounded-full border border-[#004cfe] bg-white px-2.5 py-1 text-[13px] leading-5 text-[#004cfe]"
        >
          {t("acSchedule")}
        </button>
      </div>

      {/* White sub-header bar */}
      <div className="mx-4 mt-px flex flex-wrap items-center gap-3 rounded border border-black/[0.06] bg-white px-4 py-2.5 shadow-[0_0_2px_rgb(23_26_31/0.12),0_0_1px_rgb(23_26_31/0.07)] md:mx-6 lg:mx-8">
        <h2 className="min-w-0 flex-1 text-sm font-normal leading-[22px] text-[#171a1f]">{t("acSubheader")}</h2>
        {canAuthor ? (
          <div className="flex shrink-0 overflow-hidden rounded">
            <Link
              href="/learning/studio/new"
              className="flex items-center justify-center bg-[#004cfe] px-3 py-2 text-[13px] leading-5 text-white"
            >
              {t("acNewCourse")}
            </Link>
            <Link
              href="/learning/studio"
              className="flex items-center justify-center bg-[#004cfe] px-2.5 py-2 text-white"
              aria-label={t("acStudioMenu")}
              title={t("acStudioMenu")}
            >
              <Chevron up={false} className="h-4 w-4 text-[#dee7fd]" />
            </Link>
          </div>
        ) : null}
      </div>

      {/* Serif welcome */}
      <div className="px-6 pb-2 pt-6 md:px-8 md:pt-5">
        <h1 className="learning-ac-serif max-w-3xl text-[22px] font-normal leading-[34px] tracking-tight text-[#171a1f]">
          {t("acWelcomeTitle", { name: learnerName })}
        </h1>
      </div>

      {/* Course stack */}
      <div className="space-y-2.5 px-4 pb-8 md:px-6 lg:px-8">
        {ordered.length === 0 ? (
          <div className="rounded border border-black/[0.06] bg-white p-8 text-center shadow-[0_0_2px_rgb(23_26_31/0.12),0_0_1px_rgb(23_26_31/0.07)]">
            <p className="learning-ac-serif text-lg text-[#171a1f]">{t("acEmptyTitle")}</p>
            <p className="mt-2 text-sm text-[#9095a1]">{t("acEmptyBody")}</p>
          </div>
        ) : (
          ordered.map((course, index) => {
            const isOpen = openId === course.id;
            const titleRes = resolveLocalized(course.title, locale);
            const descRes = resolveLocalized(course.description, locale);
            const step = `${index + 1}/${ordered.length}`;

            return (
              <div
                key={course.id}
                className="overflow-hidden rounded border border-black/[0.06] bg-white shadow-[0_0_2px_rgb(23_26_31/0.12),0_0_1px_rgb(23_26_31/0.07)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : course.id)}
                  className="flex w-full items-center gap-4 border-b border-transparent px-4 py-3 text-left md:px-5"
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-black/20 bg-white shadow-[0_0_2px_rgba(0,0,0,0.25)]"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 text-sm font-normal leading-[22px] text-[#171a1f]">
                    {titleRes.text || course.slug}
                  </span>
                  <Chevron up={isOpen} className="shrink-0 text-[#bdc1ca]" />
                </button>

                {isOpen ? (
                  <div className="flex flex-col gap-8 px-4 py-10 md:flex-row md:items-stretch md:gap-6 md:px-10 md:py-12">
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-5 md:max-w-[534px] md:pr-5">
                      <div className="text-sm leading-[22px] text-[#171a1f]">
                        <LocalizedParagraph
                          resolved={descRes}
                          emptyMessage={t("acFeaturedFallback")}
                          fallbackMessage={() => t("acFeaturedFallback")}
                          textClassName="text-sm leading-[22px] text-[#171a1f]"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/learning/course/${course.id}`}
                          className="inline-flex items-center justify-center border border-[#171a1f] bg-white px-4 py-2 text-[13px] leading-5 text-[#171a1f]"
                        >
                          {t("viewCourse")}
                        </Link>
                        <EnrollButton
                          courseId={course.id}
                          label={t("acStartCourse")}
                          className="inline-flex items-center justify-center rounded bg-[#004cfe] px-4 py-2 text-[13px] font-normal leading-5 text-white disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="relative min-h-[200px] w-full overflow-hidden rounded bg-[#0107a9] shadow-[0_0_2px_rgb(23_26_31/0.12),0_0_1px_rgb(23_26_31/0.07)] md:min-h-[291px] md:flex-1 md:max-w-[517px]">
                      <div className="flex items-center justify-between gap-3 px-3 py-3 text-white md:px-4 md:py-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#004cfe]">
                            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                          <p className="learning-ac-serif min-w-0 truncate text-base font-normal leading-8">
                            {titleRes.text || course.slug}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-center gap-0.5 text-[#bdc1ca]">
                          <span className="text-xs">{step}</span>
                          <span className="text-xs">{t("acShare")}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center px-6 pb-10 pt-4">
                        <p className="learning-ac-serif max-w-[11rem] text-center text-xl font-normal leading-8 text-white md:max-w-none md:text-[26px] md:leading-10">
                          {t("acVideoTagline")}
                        </p>
                        <Link
                          href={`/learning/course/${course.id}/learn`}
                          className="mt-8 inline-flex items-center justify-center rounded-[30px] bg-[#ff0000] px-5 py-2 text-white"
                          aria-label={t("acPlayAria")}
                        >
                          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* Floating help-style button */}
      <Link
        href="/settings"
        className="fixed bottom-6 right-6 z-40 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[#000dff] text-white shadow-lg md:bottom-8 md:right-8"
        aria-label={t("acHelpFab")}
      >
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337L5.05 21l1.395-3.72C5.512 15.042 5 13.574 5 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
          />
        </svg>
      </Link>
    </div>
  );
}
