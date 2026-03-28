"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ElectionRow = {
  id: string;
  title: Record<string, string> | null;
  phase: string;
  protocol: Record<string, unknown> | null;
};

export function AmuElectionsPanel({
  organizationId,
  elections,
  canWrite,
}: {
  organizationId: string;
  elections: ElectionRow[];
  canWrite: boolean;
}) {
  const t = useTranslations("amu");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function createElection(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("amu_elections").insert({
      organization_id: organizationId,
      title: { en: title.trim(), nb: title.trim() },
      phase: "nomination",
      term_label: { en: "", nb: "" },
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (!error) {
      setTitle("");
      router.refresh();
    }
  }

  async function advance(id: string, phase: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("amu_elections").update({ phase }).eq("id", id);
    router.refresh();
  }

  async function closeElection(id: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.rpc("close_amu_election", { p_election_id: id });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {canWrite ? (
        <form onSubmit={createElection} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("electionTitleLabel")}</label>
          <div className="flex flex-wrap gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-w-[200px] flex-1 rounded border px-3 py-2 text-sm"
              placeholder={t("electionTitlePlaceholder")}
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
            >
              {t("createElection")}
            </button>
          </div>
        </form>
      ) : null}

      <ul className="space-y-4">
        {elections.map((el) => {
          const ttl = el.title?.en ?? el.title?.nb ?? "—";
          return (
            <li key={el.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-[var(--color-text)]">{ttl}</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t("phase")}: {el.phase}
                  </p>
                </div>
                {canWrite ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {el.phase === "nomination" ? (
                      <button type="button" onClick={() => advance(el.id, "voting")} className="font-medium text-[var(--color-primary)] hover:underline">
                        {t("openVoting")}
                      </button>
                    ) : null}
                    {el.phase === "voting" ? (
                      <button type="button" onClick={() => closeElection(el.id)} className="font-medium text-[var(--color-primary)] hover:underline">
                        {t("closeElection")}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {el.phase === "closed" && el.protocol ? (
                <pre className="mt-3 max-h-48 overflow-auto rounded bg-[var(--color-surface-elevated)] p-2 text-xs">{JSON.stringify(el.protocol, null, 2)}</pre>
              ) : null}
            </li>
          );
        })}
      </ul>
      {elections.length === 0 ? <p className="text-sm text-[var(--color-text-muted)]">{t("electionsEmpty")}</p> : null}
    </div>
  );
}
