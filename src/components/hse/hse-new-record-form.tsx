"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RecordKind = "deviation" | "risk_assessment" | "halted_work";

export function HseNewRecordForm({
  organizationId,
  kind,
  allowHaltWork = true,
}: {
  organizationId: string;
  kind: RecordKind;
  /** Only VO may register halted work (§ 6-3). */
  allowHaltWork?: boolean;
}) {
  const t = useTranslations("hse");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [body, setBody] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [deviationCategory, setDeviationCategory] = useState<"physical" | "psychosocial" | "equipment">("physical");
  const [probability, setProbability] = useState("3");
  const [consequence, setConsequence] = useState("3");
  const [areaLabel, setAreaLabel] = useState("");
  const [equipmentLabel, setEquipmentLabel] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (kind === "halted_work" && !allowHaltWork) {
      window.alert(t("haltVoOnlyCreate"));
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

    const titleJson: Record<string, string> = { [locale]: title.trim() };

    const row: Record<string, unknown> = {
      organization_id: organizationId,
      record_type: kind,
      title: titleJson,
      status: "open",
      created_by: user.id,
    };

    if (kind === "deviation") {
      const bodyJson: Record<string, string> = description.trim() ? { [locale]: description.trim() } : {};
      row.body = bodyJson;
      row.deviation_category = deviationCategory;
      row.occurred_at = occurredAt || null;
      if (proposedSolution.trim()) {
        row.proposed_solution = { [locale]: proposedSolution.trim() };
      } else {
        row.proposed_solution = {};
      }
    }

    if (kind === "risk_assessment") {
      row.body = body.trim() ? { [locale]: body.trim() } : {};
      row.probability = Number.parseInt(probability, 10);
      row.consequence = Number.parseInt(consequence, 10);
      row.occurred_at = occurredAt || null;
    }

    if (kind === "halted_work") {
      row.body = body.trim() ? { [locale]: body.trim() } : {};
      row.equipment_area_lock = {
        areaLabel: areaLabel.trim() || undefined,
        equipmentLabel: equipmentLabel.trim() || undefined,
      };
    }

    const { data, error } = await supabase.from("hse_records").insert(row).select("id").single();
    setBusy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    if (kind === "halted_work" && data?.id) {
      const { error: notifyErr } = await supabase.rpc("notify_hse_halt_work_submitted", { p_hse_record_id: data.id });
      if (notifyErr) window.alert(notifyErr.message);
    }
    if (data?.id) router.push(`/hse/record/${data.id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldTitle")}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </div>

      {kind === "deviation" ? (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldCategory")}</label>
            <select
              value={deviationCategory}
              onChange={(e) => setDeviationCategory(e.target.value as typeof deviationCategory)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            >
              <option value="physical">{t("deviationCategory.physical")}</option>
              <option value="psychosocial">{t("deviationCategory.psychosocial")}</option>
              <option value="equipment">{t("deviationCategory.equipment")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldOccurred")}</label>
            <input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldDescription")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldProposedSolution")}</label>
            <textarea
              value={proposedSolution}
              onChange={(e) => setProposedSolution(e.target.value)}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
        </>
      ) : null}

      {kind === "risk_assessment" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldProbability")}</label>
              <select
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldConsequence")}</label>
              <select
                value={consequence}
                onChange={(e) => setConsequence(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldNotes")}</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldOccurred")}</label>
            <input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
        </>
      ) : null}

      {kind === "halted_work" && !allowHaltWork ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">{t("haltVoOnlyCreate")}</p>
      ) : null}

      {kind === "halted_work" && allowHaltWork ? (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldDescription")}</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldArea")}</label>
            <input
              value={areaLabel}
              onChange={(e) => setAreaLabel(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldEquipment")}</label>
            <input
              value={equipmentLabel}
              onChange={(e) => setEquipmentLabel(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">{t("haltAlertHint")}</p>
        </>
      ) : null}

      <button
        type="submit"
        disabled={busy || (kind === "halted_work" && !allowHaltWork)}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "…" : t("submitRecord")}
      </button>
    </form>
  );
}
