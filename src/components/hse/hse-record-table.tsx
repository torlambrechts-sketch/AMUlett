import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocalized } from "@/lib/learning/localize";
import { riskBandBadgeClass, type RiskBand } from "@/lib/hse/risk";

export type HseRecordRow = {
  id: string;
  record_type: string;
  title: Record<string, string> | null;
  status: string;
  risk_band?: string | null;
  risk_score?: number | null;
  action_plan_required?: boolean | null;
  escalated_to_amu?: boolean | null;
};

type Props = {
  records: HseRecordRow[];
  emptyMessage: string;
  showRisk?: boolean;
  showAmu?: boolean;
  basePath?: string;
};

export async function HseRecordTable({
  records,
  emptyMessage,
  showRisk = false,
  showAmu = false,
  basePath = "/hse",
}: Props) {
  const locale = await getLocale();
  const t = await getTranslations("hse");

  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-[var(--color-surface-elevated)]">
          <tr>
            <th className="px-3 py-2 font-semibold">{t("colType")}</th>
            <th className="px-3 py-2 font-semibold">{t("colTitle")}</th>
            <th className="px-3 py-2 font-semibold">{t("colStatus")}</th>
            {showRisk ? (
              <>
                <th className="px-3 py-2 font-semibold">{t("colRisk")}</th>
                <th className="px-3 py-2 font-semibold">{t("colActionPlan")}</th>
              </>
            ) : null}
            {showAmu ? <th className="px-3 py-2 font-semibold">{t("colAmu")}</th> : null}
            <th className="px-3 py-2 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {records.map((row) => {
            const titleRes = resolveLocalized(row.title ?? {}, locale);
            const band = row.risk_band as RiskBand | null | undefined;
            return (
              <tr key={row.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 text-[var(--color-text-muted)]">{row.record_type}</td>
                <td className="px-3 py-2">{titleRes.text || "—"}</td>
                <td className="px-3 py-2">{row.status}</td>
                {showRisk ? (
                  <>
                    <td className="px-3 py-2">
                      {band ? (
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${riskBandBadgeClass(band)}`}>
                          {t(`riskBand.${band}`)}
                          {row.risk_score != null ? ` (${row.risk_score})` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">{row.action_plan_required ? t("actionPlanYes") : "—"}</td>
                  </>
                ) : null}
                {showAmu ? <td className="px-3 py-2">{row.escalated_to_amu ? t("amuYes") : t("amuNo")}</td> : null}
                <td className="px-3 py-2 text-right">
                  <Link href={`${basePath}/record/${row.id}`} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                    {t("openRecord")}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!records.length ? <p className="p-4 text-sm text-[var(--color-text-muted)]">{emptyMessage}</p> : null}
    </div>
  );
}
