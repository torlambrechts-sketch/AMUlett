"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import DOMPurify from "isomorphic-dompurify";
import { RichTextField } from "@modules/editor";

function minutesToHtml(doc: Record<string, unknown> | null): string {
  if (!doc || typeof doc !== "object") return "<p></p>";
  const html = (doc as { html?: string }).html;
  return typeof html === "string" && html.trim() ? html : "<p></p>";
}

export function AmuMeetingMinutesEditor({
  meetingId,
  initialMinutes,
  canWrite,
}: {
  meetingId: string;
  initialMinutes: Record<string, unknown> | null;
  canWrite: boolean;
}) {
  const t = useTranslations("amu");
  const router = useRouter();
  const initialHtml = useMemo(() => minutesToHtml(initialMinutes), [initialMinutes]);
  const [html, setHtml] = useState(initialHtml);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("work_council_meetings")
      .update({ minutes_document: { html } as unknown as Record<string, unknown> })
      .eq("id", meetingId);
    setBusy(false);
    if (error) window.alert(error.message);
    else {
      setSaved(true);
      router.refresh();
    }
  }

  if (!canWrite) {
    const safe = DOMPurify.sanitize(initialHtml);
    return (
      <div
        className="prose prose-sm max-w-none rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 text-[var(--color-text)]"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }

  return (
    <div className="space-y-2">
      <RichTextField value={html} onChange={setHtml} placeholder={t("minutesPlaceholder")} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
        >
          {t("saveMinutes")}
        </button>
        {saved ? <span className="text-xs text-[var(--color-text-muted)]">{t("minutesSaved")}</span> : null}
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{t("minutesRealtimeHint")}</p>
    </div>
  );
}
