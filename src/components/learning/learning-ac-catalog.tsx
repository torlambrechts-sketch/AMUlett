"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveLocalized } from "@/lib/learning/localize";
import { EnrollButton } from "@/components/learning/enroll-button";
import type { LearningCourseRow } from "@/lib/learning/types";
import { LearningPdCard } from "@/components/learning/learning-pd-shell";

function scopeLabel(course: LearningCourseRow, t: (k: string) => string) {
  return course.scope === "system_default" ? t("badgeDefault") : t("badgeCompany");
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
  const [q, setQ] = useState("");

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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ordered;
    return ordered.filter((c) => {
      const titleRes = resolveLocalized(c.title, locale);
      return (titleRes.text || c.slug).toLowerCase().includes(s) || c.slug.toLowerCase().includes(s);
    });
  }, [ordered, q, locale]);

  const systemCount = rows.filter((c) => c.scope === "system_default").length;
  const orgCount = rows.filter((c) => c.scope === "organization").length;

  return (
    <div className="text-sm text-[#1a1d21]">
      {/* Welcome strip — pastel feature cards */}
      <div className="mb-6 rounded-xl border border-[#e8eaed] bg-[#f0f4f1] p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">{t("pdWelcomeEyebrow")}</p>
            <h2 className="mt-1 text-lg font-semibold text-[#1a1d21]">{t("pdWelcomeTitle", { name: learnerName })}</h2>
            <p className="mt-1 max-w-xl text-sm text-[#6b7280]">{t("pdWelcomeSubtitle")}</p>
          </div>
          {canAuthor ? (
            <Link
              href="/learning/studio/new"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#2d8e52] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#247a47]"
            >
              {t("pdNewCourse")}
            </Link>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { bg: "bg-[#e8e4f4]", title: t("pdCard1Title"), desc: t("pdCard1Desc") },
            { bg: "bg-[#fde8e0]", title: t("pdCard2Title"), desc: t("pdCard2Desc") },
            { bg: "bg-[#f5f0e4]", title: t("pdCard3Title"), desc: t("pdCard3Desc") },
            { bg: "bg-[#e3f2ef]", title: t("pdCard4Title"), desc: t("pdCard4Desc") },
          ].map((card) => (
            <div key={card.title} className={`rounded-lg border border-black/[0.04] ${card.bg} p-4`}>
              <p className="text-sm font-semibold text-[#1a1d21]">{card.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#4b5563]">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Promotional row (trial / CTA style) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e8eaed] bg-white px-4 py-3 shadow-sm">
        <p className="text-sm text-[#3d4248]">{t("pdBanner", { name: learnerName })}</p>
        <button
          type="button"
          className="rounded-full border border-[#2d8e52] bg-white px-4 py-1.5 text-sm font-medium text-[#2d8e52] transition hover:bg-[rgba(45,142,82,0.06)]"
        >
          {t("pdBannerCta")}
        </button>
      </div>

      {/* Main white card — catalog table */}
      <LearningPdCard className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eaed] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#1a1d21]">{t("pdCatalogTitle")}</h3>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              {t("pdCatalogStats", { system: String(systemCount), org: String(orgCount) })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">{t("pdSearch")}</span>
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
              </svg>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("pdSearchPlaceholder")}
                className="h-9 w-full min-w-[12rem] rounded-full border border-[#e8eaed] bg-[#f7f8f9] py-1.5 pl-9 pr-3 text-sm text-[#1a1d21] placeholder:text-[#9ca3af] md:w-56"
              />
            </label>
            {canAuthor ? (
              <Link
                href="/learning/studio"
                className="inline-flex items-center rounded-lg border border-[#e8eaed] bg-white px-3 py-2 text-sm font-medium text-[#3d4248] hover:bg-[#f7f8f9]"
              >
                {t("pdOpenStudio")}
              </Link>
            ) : null}
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-[#e8eaed] px-2 py-2">
          <button type="button" className="flex min-w-[8rem] flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[#f7f8f9] sm:min-w-0 sm:flex-none">
            <span className="text-[#2d8e52]">
              <IconDoc />
            </span>
            <span>
              <span className="font-medium text-[#2d8e52]">{t("pdTabPublished")}</span>
              <span className="ml-1 text-xs text-[#6b7280]">({filtered.length})</span>
            </span>
          </button>
          <button type="button" className="flex min-w-[8rem] flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#6b7280] transition hover:bg-[#f7f8f9] sm:min-w-0 sm:flex-none">
            <IconClock />
            <span>{t("pdTabInProgress")}</span>
          </button>
          <button type="button" className="flex min-w-[8rem] flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#6b7280] transition hover:bg-[#f7f8f9] sm:min-w-0 sm:flex-none">
            <IconCheck />
            <span>{t("pdTabDone")}</span>
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-base font-medium text-[#1a1d21]">{t("acEmptyTitle")}</p>
            <p className="mt-2 text-sm text-[#6b7280]">{q ? t("pdNoMatches") : t("acEmptyBody")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#e8eaed] text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                  <th className="px-5 py-3 font-medium">{t("pdColTitle")}</th>
                  <th className="hidden px-3 py-3 font-medium sm:table-cell">{t("pdColScope")}</th>
                  <th className="px-3 py-3 font-medium">{t("pdColStatus")}</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">{t("pdColUpdated")}</th>
                  <th className="px-5 py-3 text-right font-medium">{t("pdColActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((course) => {
                  const titleRes = resolveLocalized(course.title, locale);
                  const title = titleRes.text || course.slug;
                  const dateStr = course.created_at.slice(0, 10);
                  return (
                    <tr key={course.id} className="border-b border-[#f0f1f3] transition hover:bg-[#fafaf9]">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e8eaed] bg-[#f7f8f9] text-[#6b7280]">
                            <IconDoc />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1a1d21]">{title}</p>
                            <p className="mt-0.5 text-xs text-[#6b7280]">{course.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-4 text-[#3d4248] sm:table-cell">{scopeLabel(course, t)}</td>
                      <td className="px-3 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(45,142,82,0.12)] px-2.5 py-0.5 text-xs font-medium text-[#2d8e52]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#2d8e52]" />
                          {t("pdStatusPublished")}
                        </span>
                      </td>
                      <td className="hidden px-3 py-4 text-[#6b7280] md:table-cell">{dateStr}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/learning/course/${course.id}`}
                            className="text-sm font-medium text-[#2d8e52] hover:underline"
                          >
                            {t("viewCourse")}
                          </Link>
                          <EnrollButton
                            courseId={course.id}
                            label={t("enroll")}
                            className="inline-flex items-center justify-center rounded-lg bg-[#2d8e52] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#247a47] disabled:opacity-50"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </LearningPdCard>
    </div>
  );
}

function IconDoc() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
