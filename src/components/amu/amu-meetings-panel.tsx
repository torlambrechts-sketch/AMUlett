"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AmuMeetingMinutesEditor } from "@/components/amu/amu-meeting-minutes-editor";

export type MeetingRow = {
  id: string;
  title: Record<string, string> | null;
  scheduled_at: string | null;
  status: string;
  minutes_document: Record<string, unknown> | null;
};

export type MeetingHseStats = {
  open: number;
  incident: number;
  risk_assessment: number;
};

export function AmuMeetingsPanel({
  organizationId,
  meetings,
  hseStats,
  canWrite,
}: {
  organizationId: string;
  meetings: MeetingRow[];
  hseStats: MeetingHseStats;
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
    const { error } = await supabase.rpc("generate_statutory_amu_agenda", { p_meeting_id: meetingId });
    if (error) window.alert(error.message);
    else router.refresh();
  }

  async function adjourn(meetingId: string) {
    if (!window.confirm(t("adjournConfirm"))) return;
    const supabase = createSupabaseBrowserClient();
    await supabase
      .from("work_council_meetings")
      .update({ status: "completed", adjourned_at: new Date().toISOString() })
      .eq("id", meetingId);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">{t("hseStatsOpen")}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{hseStats.open}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">{t("hseStatsIncidents")}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{hseStats.incident}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">{t("hseStatsRos")}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{hseStats.risk_assessment}</p>
        </div>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{t("hseStatsHint")}</p>

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

      <ul className="space-y-4">
        {meetings.map((m) => {
          const ttl = m.title?.en ?? m.title?.nb ?? "—";
          return (
            <li key={m.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-[var(--color-text)]">{ttl}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : t("noDate")} · {m.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {canWrite ? (
                    <>
                      <button type="button" onClick={() => genAgenda(m.id)} className="font-medium text-[var(--color-primary)] hover:underline">
                        {t("generateAgenda")}
                      </button>
                      {m.status !== "completed" ? (
                        <button type="button" onClick={() => adjourn(m.id)} className="font-medium text-[var(--color-text-secondary)] hover:underline">
                          {t("adjournMeeting")}
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                <p className="mb-2 text-xs font-semibold text-[var(--color-text)]">{t("minutesHeading")}</p>
                <AmuMeetingMinutesEditor meetingId={m.id} initialMinutes={m.minutes_document} canWrite={canWrite} />
              </div>
              <p className="mt-3 text-xs text-[var(--color-text-muted)]">{t("protocolVaultHint")}</p>
            </li>
          );
        })}
      </ul>
      {meetings.length === 0 ? <p className="text-sm text-[var(--color-text-muted)]">{t("meetingsEmpty")}</p> : null}
    </div>
  );
}
