"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function HseCreateActionPlanButton({
  organizationId,
  hseRecordId,
  disabled,
}: {
  organizationId: string;
  hseRecordId: string;
  disabled?: boolean;
}) {
  const t = useTranslations("hse");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function createPlan() {
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

    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .insert({
        organization_id: organizationId,
        title,
        description: {},
        status: "open",
        source_hse_record_id: hseRecordId,
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
    <button
      type="button"
      disabled={busy || disabled}
      onClick={createPlan}
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-surface)] disabled:opacity-50"
    >
      {busy ? "…" : t("createActionPlan")}
    </button>
  );
}
