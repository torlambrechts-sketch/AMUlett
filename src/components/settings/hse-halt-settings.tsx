"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function HseHaltSettings({
  organizationId,
  initialEmails,
}: {
  organizationId: string;
  initialEmails: string[];
}) {
  const t = useTranslations("hseSettings");
  const router = useRouter();
  const [emails, setEmails] = useState(initialEmails.join(", "));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const parsed = emails
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("hse_org_settings").upsert(
      {
        organization_id: organizationId,
        halt_alert_emails: parsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    );
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(t("saved"));
    router.refresh();
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
      <h3 className="text-sm font-semibold">{t("haltAlertsTitle")}</h3>
      <p className="text-xs text-[var(--color-text-muted)]">{t("haltAlertsHint")}</p>
      <textarea
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        rows={3}
        placeholder={t("haltEmailsPlaceholder")}
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "…" : t("save")}
      </button>
      {msg ? <p className="text-sm text-[var(--color-text-muted)]">{msg}</p> : null}
    </form>
  );
}
