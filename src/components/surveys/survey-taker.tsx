"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolveLocalized } from "@/lib/learning/localize";
import type { SurveyQuestionRow } from "@/lib/survey/types";

export function SurveyTaker({
  surveyId,
  questions,
  departmentId,
  departmentOptions,
}: {
  surveyId: string;
  questions: SurveyQuestionRow[];
  departmentId: string | null;
  departmentOptions: { id: string; slug: string }[];
}) {
  const t = useTranslations("survey");
  const locale = useLocale();
  const router = useRouter();
  const sorted = useMemo(() => [...questions].sort((a, b) => a.position - b.position), [questions]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [dept, setDept] = useState(departmentId ?? departmentOptions[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const q = sorted[idx];
  const total = sorted.length;
  const progress = total ? ((idx + 1) / total) * 100 : 0;

  function setAnswer(val: string | number) {
    if (!q) return;
    setAnswers((a) => ({ ...a, [q.id]: val }));
  }

  function next() {
    if (idx < total - 1) setIdx((i) => i + 1);
  }

  function back() {
    if (idx > 0) setIdx((i) => i - 1);
  }

  async function submit() {
    if (!dept) {
      window.alert(t("pickDepartment"));
      return;
    }
    for (const qq of sorted) {
      if (answers[qq.id] === undefined || answers[qq.id] === "") {
        window.alert(t("answerAll"));
        return;
      }
    }
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const payload: Record<string, unknown> = {};
    for (const qq of sorted) {
      let v: unknown = answers[qq.id];
      if (qq.response_type === "likert_5") v = Number(v);
      if (qq.is_enps && qq.response_type === "single_choice") v = Number(v);
      payload[qq.id] = v;
    }
    const { error } = await supabase.rpc("submit_survey_response", {
      p_survey_id: surveyId,
      p_department_id: dept,
      p_answers: payload,
    });
    setBusy(false);
    if (error) window.alert(error.message);
    else {
      router.push("/surveys");
      router.refresh();
    }
  }

  if (!q) {
    return <p className="text-sm text-[var(--color-text-muted)]">{t("noQuestions")}</p>;
  }

  const qText = resolveLocalized(q.question, locale).text;
  const likertLabels = ["1", "2", "3", "4", "5"];

  return (
    <div className="mx-auto max-w-lg">
      {departmentOptions.length > 1 ? (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">{t("yourDepartment")}</label>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm">
            {departmentOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.slug}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-elevated)]">
        <div className="h-full bg-[var(--color-primary)] transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <p className="mb-4 text-xs text-[var(--color-text-muted)]">
        {idx + 1} / {total}
      </p>

      <div
        className="min-h-[220px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm"
        style={{ touchAction: "pan-y" }}
      >
        <p className="text-base font-medium leading-relaxed">{qText}</p>

        {q.response_type === "likert_5" ? (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {likertLabels.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setAnswer(Number(n));
                }}
                className={[
                  "h-12 w-12 rounded-full text-sm font-semibold transition-colors",
                  String(answers[q.id]) === n ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface-elevated)]",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}

        {q.response_type === "single_choice" && q.is_enps ? (
          <div className="mt-6 grid grid-cols-6 gap-1 sm:grid-cols-11">
            {Array.from({ length: 11 }, (_, i) => i).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setAnswer(n)}
                className={[
                  "rounded-md py-2 text-xs font-medium",
                  answers[q.id] === n ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-[var(--color-bg)]",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}

        {q.response_type === "text" ? (
          <textarea
            value={String(answers[q.id] ?? "")}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            className="mt-4 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        ) : null}
      </div>

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={back} disabled={idx === 0} className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] py-2.5 text-sm disabled:opacity-40">
          {t("back")}
        </button>
        {idx < total - 1 ? (
          <button type="button" onClick={next} className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-primary)] py-2.5 text-sm font-medium text-white">
            {t("next")}
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={submit} className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-primary)] py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {busy ? "…" : t("submit")}
          </button>
        )}
      </div>
    </div>
  );
}
