"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AmuAnnualReportButton({ organizationId, defaultYear }: { organizationId: string; defaultYear: number }) {
  const t = useTranslations("amu");
  const router = useRouter();
  const [year, setYear] = useState(String(defaultYear));
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const y = parseInt(year, 10);
    await supabase.rpc("generate_amu_annual_report", { p_organization_id: organizationId, p_year: y });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("reportYearField")}</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-28 rounded border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={generate}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
      >
        {t("generateReport")}
      </button>
    </div>
  );
}
