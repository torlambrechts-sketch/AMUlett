"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SurveyNpsGauge } from "@/components/surveys/survey-nps-gauge";
import { SurveyActionPlanModal } from "@/components/surveys/survey-action-plan-modal";
import type { DepartmentAggregate } from "@/lib/survey/types";
import type { OrgMemberOption } from "@/lib/amu/org-members";

type Dept = { id: string; slug: string; name: Record<string, string> };

const THRESHOLD = 3;

export function SurveyManagerDashboard({
  organizationId,
  surveyId,
  departments,
  members,
  initialAggregate,
}: {
  organizationId: string;
  surveyId: string;
  departments: Dept[];
  members: OrgMemberOption[];
  initialAggregate: DepartmentAggregate | null;
}) {
  const t = useTranslations("survey");
  const locale = useLocale();
  const [selectedDept, setSelectedDept] = useState(departments[0]?.id ?? "");
  const [agg, setAgg] = useState<DepartmentAggregate | null>(initialAggregate);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ deptId: string; cat: string } | null>(null);

  const deptName = useMemo(() => {
    const d = departments.find((x) => x.id === selectedDept);
    if (!d) return "";
    return d.name[locale] ?? d.name.en ?? d.slug;
  }, [departments, selectedDept, locale]);

  async function loadAggregate(forDepartmentId?: string) {
    const deptId = forDepartmentId ?? selectedDept;
    if (!deptId) return;
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("survey_department_aggregate", {
      p_survey_id: surveyId,
      p_department_id: deptId,
    });
    setLoading(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    setAgg(data as DepartmentAggregate);
  }

  const lowCategories = useMemo(() => {
    if (!agg || agg.hidden || !agg.category_averages) return [];
    return Object.entries(agg.category_averages).filter(([, v]) => v < THRESHOLD).map(([k]) => k);
  }, [agg]);

  const showPsPlan =
    agg &&
    !agg.hidden &&
    agg.psychological_safety_avg !== null &&
    agg.psychological_safety_avg !== undefined &&
    agg.psychological_safety_avg < THRESHOLD &&
    !lowCategories.includes("psychological_safety");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("filterDepartment")}</label>
          <select
            value={selectedDept}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedDept(v);
              void loadAggregate(v);
            }}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name[locale] ?? d.name.en ?? d.slug}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => void loadAggregate()} disabled={loading} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm">
          {loading ? "…" : t("refresh")}
        </button>
      </div>

      {agg?.hidden ? (
        <div className="rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {t("anonymityHidden", { count: agg.respondent_count ?? 0, min: agg.minimum_required ?? 5 })}
        </div>
      ) : agg ? (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <SurveyNpsGauge score={agg.enps ?? null} label={t("dashboard.nps")} />
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">{t("dashboard.participation")}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{agg.respondent_count ?? 0}</p>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">{t("noTrend")}</p>
            </div>
          </div>

          {agg.psychological_safety_risk ? (
            <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
              {t("psychSafetyRisk")}
            </div>
          ) : null}

          <div>
            <h3 className="mb-2 text-sm font-semibold">{t("analysisTitle")}</h3>
            <ul className="space-y-2 text-sm">
              {agg.category_averages &&
                Object.entries(agg.category_averages).map(([k, v]) => (
                  <li key={k} className="flex justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2">
                    <span>{k}</span>
                    <span className={v < THRESHOLD ? "font-semibold text-red-600" : ""}>{v.toFixed(2)}</span>
                  </li>
                ))}
            </ul>
          </div>

          {(lowCategories.length > 0 || showPsPlan) ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
              <p className="text-sm font-medium">{t("actionPlanPrompt")}</p>
              <ul className="mt-2 space-y-2">
                {lowCategories.map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => setModal({ deptId: selectedDept, cat })}
                      className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                    >
                      {t("createActionPlanFor", { category: cat })}
                    </button>
                  </li>
                ))}
                {showPsPlan ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => setModal({ deptId: selectedDept, cat: "psychological_safety" })}
                      className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                    >
                      {t("createActionPlanFor", { category: "psychological_safety" })}
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">{t("loadAnalytics")}</p>
      )}

      {modal ? (
        <SurveyActionPlanModal
          organizationId={organizationId}
          surveyId={surveyId}
          departmentId={modal.deptId}
          defaultTitle={{ en: `Survey follow-up: ${modal.cat}`, nb: `Oppfølging undersøkelse: ${modal.cat}` }}
          defaultDescription={{
            en: `Address low scores in ${modal.cat} for ${deptName}.`,
            nb: `Adresser lav score i ${modal.cat} for ${deptName}.`,
          }}
          members={members}
          onClose={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}
