"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type MeetingRow = {
  id: string;
  title: Record<string, string> | null;
  scheduled_at: string | null;
  status: string;
  minutes_document: Record<string, unknown> | null;
};

export function AmuMeetingsPanel({
  organizationId,
  meetings,
  hseOpen: hseOpenCount,
  canWrite,
}: {
  organizationId: string;
  meetings: MeetingRow[];
  hseOpen: number;
  canWrite: boolean;
}) {
  const t = useTranslations("amu");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function createMeeting(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const ttl = title.trim() || "AMU meeting";
    const { error } = await supabase.from("work_council_meetings").insert({
      organization_id: organizationId,
      title: { en: ttl, nb: ttl },
      status: "planned",
      strict_agenda: true,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (!error) {
      setTitle("");
      router.refresh();
    }
  }

  async function genAgenda(meetingId: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.rpc("generate_statutory_amu_agenda", { p_meeting_id: meetingId });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm text-[var(--color-text)]">
          <span className="font-semibold">{t("hseStatsOpen")}</span> {hseOpenCount}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("hseStatsHint")}</p>
      </div>

      {canWrite ? (
        <form onSubmit={createMeeting} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("meetingTitleLabel")}</label>
          <div className="flex flex-wrap gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-w-[200px] flex-1 rounded border px-3 py-2 text-sm"
              placeholder={t("meetingTitlePlaceholder")}
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
            >
              {t("scheduleMeeting")}
            </button>
          </div>
        </form>
      ) : null}

      <ul className="space-y-3">
        {meetings.map((m) => {
          const ttl = m.title?.en ?? m.title?.nb ?? "—";
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <div>
                <p className="font-medium text-[var(--color-text)]">{ttl}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : t("noDate")} · {m.status}
                </p>
              </div>
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => genAgenda(m.id)}
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  {t("generateAgenda")}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {meetings.length === 0 ? <p className="text-sm text-[var(--color-text-muted)]">{t("meetingsEmpty")}</p> : null}

      <p className="text-xs text-[var(--color-text-muted)]">{t("minutesEditorHint")}</p>
    </div>
  );
}
