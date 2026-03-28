"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OrgMemberOption } from "@/lib/amu/org-members";

export function HseActionPlanForm({
  organizationId,
  hseRecordId,
  members,
  disabled,
}: {
  organizationId: string;
  hseRecordId: string;
  members: OrgMemberOption[];
  disabled?: boolean;
}) {
  const t = useTranslations("hse");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");

  async function createPlan(e: React.FormEvent) {
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

    const title = { en: "ROS action plan", nb: "Tiltaksplan ROS" };
    const dueAt = due ? new Date(due + "T12:00:00").toISOString() : null;

    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .insert({
        organization_id: organizationId,
        title,
        description: {},
        status: "open",
        source_hse_record_id: hseRecordId,
        assignee_user_id: assignee,
        due_at: dueAt,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (taskErr || !task) {
      setBusy(false);
      window.alert(taskErr?.message ?? "Failed");
      return;
    }

    const { error: linkErr } = await supabase.from("hse_records").update({ action_plan_task_id: task.id }).eq("id", hseRecordId);

    setBusy(false);
    if (linkErr) {
      window.alert(linkErr.message);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={createPlan} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("actionPlanAssignee")}</label>
        <select
          required
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        >
          <option value="">{t("actionPlanPickAssignee")}</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.user_id.slice(0, 8)}…{m.role_code ? ` (${m.role_code})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[160px]">
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("actionPlanDeadline")}</label>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={busy || disabled}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "…" : t("createActionPlan")}
      </button>
    </form>
  );
}
