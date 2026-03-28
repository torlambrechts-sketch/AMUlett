"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AmuChairRotationAlert({
  year,
  lastRotationYear,
  organizationId,
  canWrite,
}: {
  year: number;
  lastRotationYear: number | null;
  canWrite: boolean;
  organizationId: string;
}) {
  const t = useTranslations("amu");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const show = canWrite && (lastRotationYear === null || lastRotationYear < year);

  if (!show) return null;

  async function acknowledge() {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.from("amu_org_settings").upsert(
      {
        organization_id: organizationId,
        last_chair_rotation_year: year,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-[var(--radius-lg)] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100">
      <p className="font-medium">{t("chairRotationTitle")}</p>
      <p className="mt-1 text-blue-900/90 dark:text-blue-200/90">{t("chairRotationBody")}</p>
      <button
        type="button"
        disabled={busy}
        onClick={acknowledge}
        className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
      >
        {busy ? "…" : t("chairRotationAck")}
      </button>
    </div>
  );
}
