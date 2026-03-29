"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RosterRow = {
  id: string;
  user_id: string;
  side: string;
  is_chair: boolean;
  is_verneombud_slot: boolean;
  position_label: Record<string, string> | null;
};

export function AmuRosterClient({
  organizationId,
  rows,
  canWrite,
}: {
  organizationId: string;
  rows: RosterRow[];
  canWrite: boolean;
}) {
  const t = useTranslations("amu");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function syncVo() {
    setBusy(true);
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("sync_amu_verneombud_roster", { p_organization_id: organizationId });
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      setMsg(t("voSynced"));
      router.refresh();
    }
  }

  return (
    <div>
      {canWrite ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={syncVo}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
          >
            {t("syncVoButton")}
          </button>
        </div>
      ) : null}
      {msg ? <p className="mb-4 text-sm text-[var(--color-text-secondary)]">{msg}</p> : null}

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-[var(--color-surface-elevated)]">
            <tr>
              <th className="px-3 py-2 font-semibold">{t("rosterSide")}</th>
              <th className="px-3 py-2 font-semibold">{t("rosterRole")}</th>
              <th className="px-3 py-2 font-semibold">{t("rosterUser")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 capitalize">{t(`side.${r.side}`)}</td>
                <td className="px-3 py-2">
                  {r.is_verneombud_slot ? <span className="font-medium text-[var(--color-primary)]">{t("roleVo")}</span> : null}
                  {r.is_chair ? <span className="ml-2 rounded bg-[var(--color-primary-muted)] px-1.5 py-0.5 text-xs">{t("roleChair")}</span> : null}
                  {!r.is_verneombud_slot && !r.is_chair ? "—" : null}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-[var(--color-text-muted)]">{r.user_id.slice(0, 8)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="p-4 text-sm text-[var(--color-text-muted)]">{t("rosterEmpty")}</p> : null}
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">{t("rosterVoHint")}</p>
    </div>
  );
}
