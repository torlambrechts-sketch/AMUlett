"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { HseTemplateShell } from "@/components/hse/hse-template-shell";
import { HseRecordCardGrid, type HseCardRecord } from "@/components/hse/hse-record-card-grid";

export function HseDashboardClient({
  records,
  openCount,
  rosCount,
  isVo,
  voHint,
}: {
  records: HseCardRecord[];
  openCount: number;
  rosCount: number;
  isVo: boolean;
  voHint: string;
}) {
  const t = useTranslations("hse");
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "all";

  const filtered = useMemo(() => {
    if (tab === "all") return records;
    return records.filter((r) => r.record_type === tab);
  }, [records, tab]);

  return (
    <HseTemplateShell
      metricsSlot={
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e5e7eb] bg-[#f2f5f7] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">{t("statOpen")}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[#1d4e5b]">{openCount}</p>
          </div>
          <div className="rounded-xl border border-[#e5e7eb] bg-[#f2f5f7] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">{t("statRos")}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[#1d4e5b]">{rosCount}</p>
          </div>
        </div>
      }
    >
      {isVo ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{voHint}</div>
      ) : null}

      <HseRecordCardGrid records={filtered} />
    </HseTemplateShell>
  );
}
