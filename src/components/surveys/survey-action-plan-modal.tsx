"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OrgMemberOption } from "@/lib/amu/org-members";

type Props = {
  organizationId: string;
  surveyId: string;
  departmentId: string;
  defaultTitle: Record<string, string>;
  defaultDescription: Record<string, string>;
  members: OrgMemberOption[];
  onClose: () => void;
};

export function SurveyActionPlanModal({
  organizationId,
  surveyId,
  departmentId,
  defaultTitle,
  defaultDescription,
  members,
  onClose,
}: Props) {
  const t = useTranslations("survey");
  const router = useRouter();
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignee) {
      window.alert(t("actionPlanAssigneeRequired"));
      return;
    }
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }
    const dueAt = due ? new Date(due + "T12:00:00").toISOString() : null;
    const { error } = await supabase.from("tasks").insert({
      organization_id: organizationId,
      title: defaultTitle,
      description: defaultDescription,
      status: "open",
      assignee_user_id: assignee,
      due_at: dueAt,
      created_by: user.id,
      source_survey_id: surveyId,
      source_department_id: departmentId,
    });
    setBusy(false);
    if (error) window.alert(error.message);
    else {
      onClose();
      router.refresh();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-xl">
        <h2 className="text-lg font-semibold">{t("actionPlans.new_plan")}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("actionPlanModalIntro")}</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("actionPlanAssignee")}</label>
            <select
              required
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              <option value="">{t("actionPlanPickAssignee")}</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_id.slice(0, 8)}…{m.role_code ? ` (${m.role_code})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("actionPlanDeadline")}</label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] py-2 text-sm">
              {t("cancel")}
            </button>
            <button type="submit" disabled={busy} className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-primary)] py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy ? "…" : t("createTask")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
