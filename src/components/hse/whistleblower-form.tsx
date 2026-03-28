"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function makeRefCode(): string {
  return `WB-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

export function WhistleblowerForm({ organizationId }: { organizationId: string }) {
  const t = useTranslations("hse");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(true);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const subjectJson = { [locale]: subject.trim() };
    const bodyJson = { [locale]: body.trim() };

    const { error } = await supabase.from("whistleblower_reports").insert({
      organization_id: organizationId,
      reference_code: makeRefCode(),
      subject: subjectJson,
      body: bodyJson,
      status: "received",
      is_anonymous: anonymous,
      reception_only: true,
      reporter_user_id: anonymous ? null : user?.id ?? null,
    });

    setBusy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    setSubject("");
    setBody("");
    router.refresh();
    window.alert(t("whistleblowerSubmitted"));
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-1" />
        <span>{t("whistleblowerAnonymous")}</span>
      </label>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("whistleblowerSubject")}</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{t("whistleblowerBody")}</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={6}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{t("whistleblowerRbacHint")}</p>
      <button
        type="submit"
        disabled={busy}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "…" : t("whistleblowerSubmit")}
      </button>
    </form>
  );
}
