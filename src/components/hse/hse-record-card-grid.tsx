"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type HseCardRecord = {
  id: string;
  record_type: string;
  /** Resolved display title (DB stores JSONB). */
  titleDisplay: string;
  status: string;
  risk_band?: string | null;
  risk_score?: number | null;
  action_plan_required?: boolean | null;
  escalated_to_amu?: boolean | null;
};

export function HseRecordCardGrid({ records }: { records: HseCardRecord[] }) {
  const t = useTranslations("hse");

  if (records.length === 0) {
    return <p className="py-12 text-center text-sm text-[#6b7280]">{t("emptyRecords")}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {records.map((r) => (
        <article
          key={r.id}
          className="flex flex-col rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e0f2f1] text-[#1d4e5b]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Zm0 13.036h.008v.008h-.008v-.008Z" />
              </svg>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-[#9ca3af]">{r.record_type.replace(/_/g, " ")}</span>
          </div>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-[#111827]">
            {r.titleDisplay || "—"}
          </h3>
          <p className="mt-2 line-clamp-2 text-xs text-[#6b7280]">
            {t("cardStatus")}: {r.status}
            {r.risk_band ? ` · ${r.risk_band}` : ""}
            {r.risk_score != null ? ` (${r.risk_score})` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {r.action_plan_required ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">{t("badgeActionPlan")}</span>
            ) : null}
            {r.escalated_to_amu ? (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-900">{t("badgeAmu")}</span>
            ) : null}
          </div>
          <div className="mt-auto border-t border-[#f3f4f6] pt-3">
            <Link
              href={`/hse/record/${r.id}`}
              className="inline-flex w-full items-center justify-center rounded-lg bg-[#1d4e5b] px-3 py-2 text-xs font-semibold text-white hover:bg-[#163d47]"
            >
              {t("cardOpen")}
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
