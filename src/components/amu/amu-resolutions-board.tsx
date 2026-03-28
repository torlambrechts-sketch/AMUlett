"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ResolutionRow = {
  id: string;
  title: Record<string, string> | null;
  status: string;
  deadline: string | null;
  assignee_user_id: string | null;
};

const STATUSES = ["not_started", "in_progress", "completed"] as const;

export function AmuResolutionsBoard({
  organizationId,
  resolutions,
  canWrite,
}: {
  organizationId: string;
  resolutions: ResolutionRow[];
  canWrite: boolean;
}) {
  const t = useTranslations("amu");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function addResolution(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("amu_resolutions").insert({
      organization_id: organizationId,
      title: { en: title.trim(), nb: title.trim() },
      status: "not_started",
    });
    setBusy(false);
    if (!error) {
      setTitle("");
      router.refresh();
    }
  }

  async function setStatus(id: string, status: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("amu_resolutions").update({ status }).eq("id", id);
    router.refresh();
  }

  const byStatus = (s: string) => resolutions.filter((r) => r.status === s);

  return (
    <div className="space-y-6">
      {canWrite ? (
        <form onSubmit={addResolution} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("resolutionTitleLabel")}</label>
          <div className="flex flex-wrap gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-w-[200px] flex-1 rounded border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
            >
              {t("addResolution")}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {STATUSES.map((st) => (
          <div key={st} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t(`resolutionStatus.${st}`)}</h3>
            <ul className="space-y-2">
              {byStatus(st).map((r) => {
                const ttl = r.title?.en ?? r.title?.nb ?? "—";
                return (
                  <li key={r.id} className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm">
                    <p className="font-medium text-[var(--color-text)]">{ttl}</p>
                    {r.deadline ? (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {t("deadline")}: {r.deadline}
                      </p>
                    ) : null}
                    {canWrite ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {st !== "not_started" ? (
                          <button type="button" onClick={() => setStatus(r.id, "not_started")} className="text-[var(--color-primary)] hover:underline">
                            → {t("resolutionStatus.not_started")}
                          </button>
                        ) : null}
                        {st !== "in_progress" ? (
                          <button type="button" onClick={() => setStatus(r.id, "in_progress")} className="text-[var(--color-primary)] hover:underline">
                            → {t("resolutionStatus.in_progress")}
                          </button>
                        ) : null}
                        {st !== "completed" ? (
                          <button type="button" onClick={() => setStatus(r.id, "completed")} className="text-[var(--color-primary)] hover:underline">
                            → {t("resolutionStatus.completed")}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {byStatus(st).length === 0 ? <p className="text-xs text-[var(--color-text-muted)]">{t("columnEmpty")}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
