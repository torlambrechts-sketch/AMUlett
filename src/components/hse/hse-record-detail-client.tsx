"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { HseEscalateButton } from "@/components/amu/hse-escalate-button";
import { HseActionPlanForm } from "@/components/hse/hse-action-plan-form";
import type { OrgMemberOption } from "@/lib/amu/org-members";
import { riskBandBadgeClass, type RiskBand } from "@/lib/hse/risk";

const ALLOWED_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "pdf"]);

export type HseRecordDetail = {
  id: string;
  organization_id: string;
  record_type: string;
  title: Record<string, string>;
  body: Record<string, string>;
  status: string;
  occurred_at: string | null;
  deviation_category: string | null;
  proposed_solution: Record<string, string>;
  attachment_paths: string[];
  probability: number | null;
  consequence: number | null;
  risk_score: number | null;
  risk_band: string | null;
  action_plan_required: boolean;
  action_plan_task_id: string | null;
  equipment_area_lock: Record<string, unknown>;
  halt_released_at: string | null;
  escalated_to_amu: boolean;
  created_by: string | null;
};

type Props = {
  record: HseRecordDetail;
  locale: string;
  canEscalateToAmu: boolean;
  canReleaseHalt: boolean;
  showActionPlanButton: boolean;
  actionPlanMembers: OrgMemberOption[];
};

export function HseRecordDetailClient({
  record: initial,
  locale,
  canEscalateToAmu,
  canReleaseHalt,
  showActionPlanButton,
  actionPlanMembers,
}: Props) {
  const t = useTranslations("hse");
  const uiLocale = useLocale();
  const router = useRouter();
  const [record, setRecord] = useState(initial);
  const [status, setStatus] = useState(initial.status);
  const [busy, setBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const titleText = useMemo(() => record.title[uiLocale] ?? record.title.en ?? record.title.nb ?? "", [record.title, uiLocale]);
  const bodyText = useMemo(() => record.body[uiLocale] ?? record.body.en ?? record.body.nb ?? "", [record.body, uiLocale]);
  const proposedText = useMemo(() => {
    const ps = record.proposed_solution;
    if (!ps || typeof ps !== "object") return "";
    return ps[uiLocale] ?? ps.en ?? ps.nb ?? "";
  }, [record.proposed_solution, uiLocale]);

  const band = record.risk_band as RiskBand | null;

  async function saveStatus(next: string) {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("hse_records").update({ status: next }).eq("id", record.id);
    setBusy(false);
    if (error) {
      if (error.message.includes("ACTION_PLAN_REQUIRED")) window.alert(t("closeBlockedActionPlan"));
      else window.alert(error.message);
    }
    else {
      setStatus(next);
      setRecord((r) => ({ ...r, status: next }));
      router.refresh();
    }
  }

  async function releaseHalt() {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("hse_records").update({ halt_released_at: new Date().toISOString() }).eq("id", record.id);
    setBusy(false);
    if (error) window.alert(error.message);
    else {
      setRecord((r) => ({ ...r, halt_released_at: new Date().toISOString() }));
      router.refresh();
    }
  }

  async function openAttachment(path: string) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.storage.from("hse-attachments").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      window.alert(error?.message ?? "Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.has(ext)) {
      setUploadMsg(t("uploadUnsupported"));
      return;
    }
    setUploadMsg(null);
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const path = `${record.organization_id}/${record.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("hse-attachments").upload(path, file, { upsert: false });
    if (upErr) {
      setBusy(false);
      setUploadMsg(upErr.message);
      return;
    }
    const nextPaths = [...record.attachment_paths, path];
    const { error: dbErr } = await supabase.from("hse_records").update({ attachment_paths: nextPaths }).eq("id", record.id);
    setBusy(false);
    if (dbErr) {
      setUploadMsg(dbErr.message);
      return;
    }
    setRecord((r) => ({ ...r, attachment_paths: nextPaths }));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">{titleText || "—"}</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {record.record_type} · {status}
        </p>
      </header>

      {record.record_type === "risk_assessment" && band ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${riskBandBadgeClass(band)}`}>
            {band === "low" ? t("riskBand.low") : band === "medium" ? t("riskBand.medium") : t("riskBand.high")}
            {record.risk_score != null ? ` (${record.risk_score})` : ""}
          </span>
          {record.action_plan_required && !record.action_plan_task_id && showActionPlanButton ? (
            <HseActionPlanForm
              organizationId={record.organization_id}
              hseRecordId={record.id}
              members={actionPlanMembers}
              disabled={busy}
            />
          ) : null}
          {record.action_plan_task_id ? (
            <span className="text-sm text-[var(--color-text-muted)]">
              {t("actionPlanLinked")} ({record.action_plan_task_id.slice(0, 8)}…)
            </span>
          ) : null}
        </div>
      ) : null}

      {bodyText ? (
        <section>
          <h3 className="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">{t("sectionDescription")}</h3>
          <p className="whitespace-pre-wrap text-sm">{bodyText}</p>
        </section>
      ) : null}

      {record.record_type === "deviation" && record.deviation_category ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("fieldCategory")}:{" "}
          {record.deviation_category === "physical"
            ? t("deviationCategory.physical")
            : record.deviation_category === "psychosocial"
              ? t("deviationCategory.psychosocial")
              : t("deviationCategory.equipment")}
        </p>
      ) : null}

      {record.record_type === "deviation" && proposedText ? (
        <section>
          <h3 className="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">{t("fieldProposedSolution")}</h3>
          <p className="whitespace-pre-wrap text-sm">{proposedText}</p>
        </section>
      ) : null}

      {record.record_type === "halted_work" ? (
        <div className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">{t("haltWorkHeading")}</p>
          {record.equipment_area_lock && typeof record.equipment_area_lock === "object" ? (
            <pre className="mt-2 overflow-x-auto text-xs opacity-90">{JSON.stringify(record.equipment_area_lock, null, 2)}</pre>
          ) : null}
          {record.halt_released_at ? (
            <p className="mt-2 text-xs">{t("haltReleasedAt", { date: new Date(record.halt_released_at).toLocaleString(locale) })}</p>
          ) : canReleaseHalt ? (
            <button
              type="button"
              disabled={busy}
              onClick={releaseHalt}
              className="mt-3 rounded-[var(--radius-md)] bg-amber-800 px-3 py-1.5 text-xs font-medium text-white dark:bg-amber-700"
            >
              {t("releaseHalt")}
            </button>
          ) : (
            <p className="mt-2 text-xs">{t("haltReleaseVoOnly")}</p>
          )}
        </div>
      ) : null}

      <section>
        <h3 className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">{t("sectionAttachments")}</h3>
        <ul className="mb-2 space-y-1 text-sm">
          {record.attachment_paths.length ? (
            record.attachment_paths.map((p) => (
              <li key={p}>
                <button type="button" onClick={() => void openAttachment(p)} className="text-[var(--color-primary)] hover:underline">
                  {p.split("/").pop()}
                </button>
              </li>
            ))
          ) : (
            <li className="text-[var(--color-text-muted)]">{t("noAttachments")}</li>
          )}
        </ul>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--color-primary)]">
          <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.pdf" className="sr-only" onChange={onUpload} disabled={busy} />
          {t("uploadAttachment")}
        </label>
        {uploadMsg ? <p className="mt-1 text-xs text-red-600">{uploadMsg}</p> : null}
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[var(--color-text-muted)]">{t("fieldStatus")}</span>
          <select
            value={status}
            onChange={(e) => void saveStatus(e.target.value)}
            disabled={busy}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm"
          >
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            {record.record_type === "deviation" ? <option value="escalated_to_amu">escalated_to_amu</option> : null}
            <option value="closed">closed</option>
          </select>
        </label>
        {canEscalateToAmu && record.record_type === "deviation" ? (
          <HseEscalateButton recordId={record.id} alreadyEscalated={record.escalated_to_amu} />
        ) : null}
      </div>
    </div>
  );
}
