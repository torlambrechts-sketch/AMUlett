"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolveLocalized } from "@/lib/learning/localize";

type Item = { key: string; label: Record<string, string> };

type FailDetail = {
  deviation_category: "physical" | "psychosocial" | "equipment";
  description: string;
};

export function HseInspectionRun({
  organizationId,
  templateId,
  templateTitle,
  items,
}: {
  organizationId: string;
  templateId: string;
  templateTitle: Record<string, string>;
  items: Item[];
}) {
  const t = useTranslations("hse");
  const locale = useLocale();
  const router = useRouter();
  const titleText = useMemo(() => resolveLocalized(templateTitle, locale).text, [templateTitle, locale]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Record<string, "pass" | "fail" | "na">>({});
  const [failDetails, setFailDetails] = useState<Record<string, FailDetail>>({});

  function setResult(key: string, result: "pass" | "fail" | "na") {
    setResults((r) => ({ ...r, [key]: result }));
    if (result === "fail") {
      setFailDetails((fd) => ({
        ...fd,
        [key]: fd[key] ?? { deviation_category: "physical", description: "" },
      }));
    } else {
      setFailDetails((fd) => {
        const next = { ...fd };
        delete next[key];
        return next;
      });
    }
  }

  function setFailDetail(key: string, patch: Partial<FailDetail>) {
    setFailDetails((fd) => ({
      ...fd,
      [key]: { ...(fd[key] ?? { deviation_category: "physical", description: "" }), ...patch },
    }));
  }

  async function complete() {
    const keys = items.map((i) => i.key);
    for (const key of keys) {
      if (results[key] === undefined) {
        window.alert(t("inspectionAnswerAll"));
        return;
      }
      if (results[key] === "fail") {
        const d = failDetails[key];
        if (!d?.description.trim()) {
          window.alert(t("deviationDescriptionRequired"));
          return;
        }
      }
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

    const { data: inspection, error: inspErr } = await supabase
      .from("hse_inspections")
      .insert({
        organization_id: organizationId,
        template_id: templateId,
        title: templateTitle,
        status: "completed",
        performed_at: new Date().toISOString(),
        performed_by: user.id,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (inspErr || !inspection) {
      setBusy(false);
      window.alert(inspErr?.message ?? "Failed");
      return;
    }

    for (const key of keys) {
      const result = results[key] ?? "na";
      let linkedId: string | null = null;

      if (result === "fail") {
        const item = items.find((i) => i.key === key);
        const label = item ? resolveLocalized(item.label, locale).text : key;
        const fd = failDetails[key];
        const devTitle = { [locale]: `${titleText}: ${label}` };
        const bodyText = fd?.description.trim() ?? "";
        const { data: dev, error: devErr } = await supabase
          .from("hse_records")
          .insert({
            organization_id: organizationId,
            record_type: "deviation",
            title: devTitle,
            body: { [locale]: bodyText },
            status: "open",
            deviation_category: fd?.deviation_category ?? "physical",
            proposed_solution: {},
            created_by: user.id,
          })
          .select("id")
          .single();
        if (devErr) {
          setBusy(false);
          window.alert(devErr.message);
          return;
        }
        linkedId = dev?.id ?? null;
      }

      const notes =
        result === "fail" && failDetails[key]
          ? { [locale]: t("inspectionFailNotes", { item: items.find((i) => i.key === key) ? resolveLocalized(items.find((i) => i.key === key)!.label, locale).text : key }) }
          : {};

      const { error: respErr } = await supabase.from("hse_inspection_responses").insert({
        inspection_id: inspection.id,
        item_key: key,
        result,
        notes,
        linked_hse_record_id: linkedId,
      });
      if (respErr) {
        setBusy(false);
        window.alert(respErr.message);
        return;
      }
    }

    setBusy(false);
    router.refresh();
    window.alert(t("inspectionSaved"));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-muted)]">{t("inspectionRunHint")}</p>
      <ul className="space-y-3">
        {items.map((item) => {
          const label = resolveLocalized(item.label, locale).text;
          const cur = results[item.key];
          const isFail = cur === "fail";
          const fd = failDetails[item.key];
          return (
            <li key={item.key} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
              <p className="text-sm font-medium">{label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["pass", "fail", "na"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResult(item.key, r)}
                    className={[
                      "rounded px-2 py-1 text-xs font-medium",
                      cur === r ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-[var(--color-surface)]",
                    ].join(" ")}
                  >
                    {t(`inspectionResult.${r}`)}
                  </button>
                ))}
              </div>
              {isFail ? (
                <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">{t("inspectionFailFormTitle")}</p>
                  <select
                    value={fd?.deviation_category ?? "physical"}
                    onChange={(e) => setFailDetail(item.key, { deviation_category: e.target.value as FailDetail["deviation_category"] })}
                    className="w-full max-w-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm"
                  >
                    <option value="physical">{t("deviationCategory.physical")}</option>
                    <option value="psychosocial">{t("deviationCategory.psychosocial")}</option>
                    <option value="equipment">{t("deviationCategory.equipment")}</option>
                  </select>
                  <textarea
                    value={fd?.description ?? ""}
                    onChange={(e) => setFailDetail(item.key, { description: e.target.value })}
                    rows={3}
                    placeholder={t("inspectionFailDescriptionPlaceholder")}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        disabled={busy}
        onClick={complete}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "…" : t("completeInspection")}
      </button>
    </div>
  );
}
