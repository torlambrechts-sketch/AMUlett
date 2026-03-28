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

export type MemberOption = { user_id: string; label: string };

const STATUSES = ["not_started", "in_progress", "completed"] as const;

function isDeadlinePast(deadline: string | null): boolean {
  if (!deadline) return false;
  const t = deadline.slice(0, 10);
  const now = new Date();
  const y = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return t < y;
}

export function AmuResolutionsBoard({
  organizationId,
  resolutions,
  members,
  canWrite,
}: {
  organizationId: string;
  resolutions: ResolutionRow[];
  members: MemberOption[];
  canWrite: boolean;
}) {
  const t = useTranslations("amu");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignee, setAssignee] = useState("");
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
      deadline: deadline || null,
      assignee_user_id: assignee || null,
    });
    setBusy(false);
    if (!error) {
      setTitle("");
      setDeadline("");
      setAssignee("");
      router.refresh();
    }
  }

  async function setStatus(id: string, status: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("amu_resolutions").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    router.refresh();
  }

  async function saveMeta(id: string, next: { assignee_user_id: string | null; deadline: string | null }) {
    const supabase = createSupabaseBrowserClient();
    await supabase
      .from("amu_resolutions")
      .update({ ...next, updated_at: new Date().toISOString() })
      .eq("id", id);
    router.refresh();
  }

  const byStatus = (s: string) => resolutions.filter((r) => r.status === s);

  const labelForUser = (uid: string | null) => {
    if (!uid) return "—";
    return members.find((m) => m.user_id === uid)?.label ?? uid.slice(0, 8) + "…";
  };

  return (
    <div className="space-y-6">
      {canWrite ? (
        <form onSubmit={addResolution} className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("resolutionTitleLabel")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("assignee")}</label>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
                <option value="">{t("assigneeUnassigned")}</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("deadline")}</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
          >
            {t("addResolution")}
          </button>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {STATUSES.map((st) => (
          <div key={st} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t(`resolutionStatus.${st}`)}</h3>
            <ul className="space-y-2">
              {byStatus(st).map((r) => {
                const ttl = r.title?.en ?? r.title?.nb ?? "—";
                const overdue = r.deadline && r.status !== "completed" && isDeadlinePast(r.deadline);
                return (
                  <li key={r.id} className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm">
                    <p className="font-medium text-[var(--color-text)]">{ttl}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {t("assignee")}: {labelForUser(r.assignee_user_id)}
                    </p>
                    {r.deadline ? (
                      <p className={`text-xs ${overdue ? "font-medium text-red-700 dark:text-red-300" : "text-[var(--color-text-muted)]"}`}>
                        {t("deadline")}: {r.deadline}
                        {overdue ? ` · ${t("deadlineOverdue")}` : ""}
                      </p>
                    ) : null}
                    {canWrite ? (
                      <>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <select
                            value={r.assignee_user_id ?? ""}
                            onChange={(e) => saveMeta(r.id, { assignee_user_id: e.target.value || null, deadline: r.deadline })}
                            className="rounded border px-2 py-1 text-xs"
                          >
                            <option value="">{t("assigneeUnassigned")}</option>
                            {members.map((m) => (
                              <option key={m.user_id} value={m.user_id}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={r.deadline ?? ""}
                            onChange={(e) => saveMeta(r.id, { assignee_user_id: r.assignee_user_id, deadline: e.target.value || null })}
                            className="rounded border px-2 py-1 text-xs"
                          />
                        </div>
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
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {byStatus(st).length === 0 ? <p className="text-xs text-[var(--color-text-muted)]">{t("columnEmpty")}</p> : null}
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{t("resolutionAlertsHint")}</p>
    </div>
  );
}
