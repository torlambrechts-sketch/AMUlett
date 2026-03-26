"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeInvitationRole } from "@/lib/org/invitation-role";

type RoleOption = { id: string; code: string; label: string };

type PendingRow = {
  id: string;
  email: string;
  expires_at: string;
  roleLabel: string;
  roleCode: string;
};

export function InvitesSection({
  organizationId,
  roleOptions,
  initialPending,
  labels,
}: {
  organizationId: string;
  roleOptions: RoleOption[];
  initialPending: PendingRow[];
  labels: Record<string, string>;
}) {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roleOptions[0]?.id ?? "");
  const [pending, setPending] = useState(initialPending);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);

  const inviteBaseUrl =
    typeof window !== "undefined" ? `${window.location.origin}/${locale}/invite` : "";

  async function refreshPending() {
    const supabase = createSupabaseBrowserClient();
    const { data, error: qErr } = await supabase
      .from("organization_invitations")
      .select("id, email, expires_at, roles ( code, label )")
      .eq("organization_id", organizationId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (qErr || !data) return;

    setPending(
      data.map((row) => {
        const roleEmbed = normalizeInvitationRole(row.roles);
        const label =
          roleEmbed?.label?.[locale] ??
          roleEmbed?.label?.en ??
          roleEmbed?.label?.nb ??
          "";
        return {
          id: row.id,
          email: row.email,
          expires_at: row.expires_at,
          roleLabel: label,
          roleCode: roleEmbed?.code ?? "",
        };
      })
    );
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLastToken(null);
    if (!roleId) {
      setError("Select a role");
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: rpcError } = await supabase.rpc("create_organization_invitation", {
        p_organization_id: organizationId,
        p_email: email.trim(),
        p_role_id: roleId,
      });

      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      const payload = data as { token?: string } | null;
      const token = payload?.token;
      if (token) {
        setLastToken(token);
      }
      setMessage(labels.inviteCreated);
      setEmail("");
      await refreshPending();
    } catch {
      setError("Unexpected error");
    }
    setLoading(false);
  }

  async function revoke(id: string) {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: rpcError } = await supabase.rpc("revoke_organization_invitation", {
      p_invitation_id: id,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await refreshPending();
  }

  function copyLink(token: string) {
    const url = `${inviteBaseUrl}?token=${encodeURIComponent(token)}`;
    void navigator.clipboard.writeText(url);
    setMessage(labels.linkCopied);
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-semibold text-[var(--color-text)]">{labels.title}</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{labels.subtitle}</p>

      <form onSubmit={sendInvite} className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="invite-email" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            {labels.email}
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
        <div className="w-full sm:w-56">
          <label htmlFor="invite-role" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            {labels.role}
          </label>
          <select
            id="invite-role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            {roleOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label || r.code}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {loading ? labels.sending : labels.sendInvite}
        </button>
      </form>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-[var(--color-text-secondary)]" role="status">
          {message}
        </p>
      ) : null}

      {lastToken ? (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">{labels.copyLink}</p>
          <code className="mt-2 block break-all text-xs text-[var(--color-text)]">
            {inviteBaseUrl}?token={lastToken.slice(0, 12)}…
          </code>
          <button
            type="button"
            onClick={() => copyLink(lastToken)}
            className="mt-3 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            {labels.copyLink}
          </button>
        </div>
      ) : null}

      <h3 className="mb-3 mt-8 text-sm font-semibold text-[var(--color-text)]">{labels.pendingTitle}</h3>
      {pending.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{labels.noPending}</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {pending.map((row) => (
            <li key={row.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">{row.email}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {row.roleLabel || row.roleCode} · {labels.expires}{" "}
                  {new Date(row.expires_at).toLocaleString(locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(row.id)}
                className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
              >
                {labels.revoke}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
