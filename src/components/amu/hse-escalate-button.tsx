"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function HseEscalateButton({ recordId, alreadyEscalated }: { recordId: string; alreadyEscalated: boolean }) {
  const t = useTranslations("amu");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function escalate() {
    if (alreadyEscalated) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("escalate_hse_to_amu_agenda", { p_hse_record_id: recordId });
    setBusy(false);
    if (error) window.alert(error.message);
    else router.refresh();
  }

  if (alreadyEscalated) {
    return <span className="text-xs text-[var(--color-text-muted)]">{t("escalatedYes")}</span>;
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={escalate}
      className="text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
    >
      {busy ? "…" : t("escalateToAmu")}
    </button>
  );
}
