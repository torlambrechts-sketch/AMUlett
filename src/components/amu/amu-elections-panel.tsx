"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type NomineeRow = { id: string; user_id: string; status: string };

export type ElectionRow = {
  id: string;
  title: Record<string, string> | null;
  phase: string;
  protocol: Record<string, unknown> | null;
  nomination_ends_at: string | null;
  voting_ends_at: string | null;
  term_label: Record<string, string> | null;
  nominees?: NomineeRow[];
};

function phaseDeadlinePassed(phase: string, nomination_ends_at: string | null, voting_ends_at: string | null): boolean {
  const now = Date.now();
  if (phase === "nomination" && nomination_ends_at) return new Date(nomination_ends_at).getTime() < now;
  if (phase === "voting" && voting_ends_at) return new Date(voting_ends_at).getTime() < now;
  return false;
}

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
  const [termEn, setTermEn] = useState("");
  const [nomEnd, setNomEnd] = useState("");
  const [voteEnd, setVoteEnd] = useState("");
  const [busy, setBusy] = useState(false);

  async function createElection(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const term: Record<string, string> = {};
    if (termEn.trim()) term.en = termEn.trim();
    const { error } = await supabase.from("amu_elections").insert({
      organization_id: organizationId,
      title: { en: title.trim(), nb: title.trim() },
      phase: "nomination",
      term_label: term,
      nomination_ends_at: nomEnd ? new Date(nomEnd).toISOString() : null,
      voting_ends_at: voteEnd ? new Date(voteEnd).toISOString() : null,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (!error) {
      setTitle("");
      setTermEn("");
      setNomEnd("");
      setVoteEnd("");
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

  async function nominateSelf(electionId: string) {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("amu_election_nominees").insert({
      election_id: electionId,
      user_id: user.id,
      status: "accepted",
    });
    router.refresh();
  }

  async function castVote(electionId: string, nomineeId: string) {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("amu_election_votes").delete().eq("election_id", electionId).eq("voter_user_id", user.id);
    const { error } = await supabase.from("amu_election_votes").insert({
      election_id: electionId,
      voter_user_id: user.id,
      nominee_id: nomineeId,
    });
    if (error) window.alert(error.message);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      {canWrite ? (
        <form onSubmit={createElection} className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("electionTitleLabel")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder={t("electionTitlePlaceholder")}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("electionTermLabel")}</label>
            <input
              value={termEn}
              onChange={(e) => setTermEn(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder={t("electionTermPlaceholder")}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("nominationEnds")}</label>
              <input
                type="datetime-local"
                value={nomEnd}
                onChange={(e) => setNomEnd(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("votingEnds")}</label>
              <input
                type="datetime-local"
                value={voteEnd}
                onChange={(e) => setVoteEnd(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
          >
            {t("createElection")}
          </button>
        </form>
      ) : null}

      <ul className="space-y-4">
        {elections.map((el) => (
          <ElectionCard
            key={el.id}
            election={el}
            canWrite={canWrite}
            onAdvance={advance}
            onClose={closeElection}
            onNominateSelf={nominateSelf}
            onVote={castVote}
          />
        ))}
      </ul>
      {elections.length === 0 ? <p className="text-sm text-[var(--color-text-muted)]">{t("electionsEmpty")}</p> : null}

      <p className="text-xs text-[var(--color-text-muted)]">{t("electionSecretHint")}</p>
    </div>
  );
}

function ElectionCard({
  election: el,
  canWrite,
  onAdvance,
  onClose,
  onNominateSelf,
  onVote,
}: {
  election: ElectionRow;
  canWrite: boolean;
  onAdvance: (id: string, phase: string) => void;
  onClose: (id: string) => void;
  onNominateSelf: (id: string) => void;
  onVote: (electionId: string, nomineeId: string) => void;
}) {
  const t = useTranslations("amu");
  const ttl = el.title?.en ?? el.title?.nb ?? "—";
  const nominees = el.nominees ?? [];
  const overdue = phaseDeadlinePassed(el.phase, el.nomination_ends_at, el.voting_ends_at);

  return (
    <li className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-[var(--color-text)]">{ttl}</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t("phase")}: {el.phase}
            {el.term_label?.en || el.term_label?.nb ? (
              <span>
                {" "}
                · {t("termShort")}: {el.term_label?.en ?? el.term_label?.nb}
              </span>
            ) : null}
          </p>
          {el.nomination_ends_at ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("nominationEnds")}: {new Date(el.nomination_ends_at).toLocaleString()}
            </p>
          ) : null}
          {el.voting_ends_at ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("votingEnds")}: {new Date(el.voting_ends_at).toLocaleString()}
            </p>
          ) : null}
          {overdue && el.phase !== "closed" ? (
            <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-200">{t("phaseDeadlineOverdue")}</p>
          ) : null}
        </div>
        {canWrite ? (
          <div className="flex flex-wrap gap-2 text-xs">
            {el.phase === "nomination" ? (
              <button type="button" onClick={() => onAdvance(el.id, "voting")} className="font-medium text-[var(--color-primary)] hover:underline">
                {t("openVoting")}
              </button>
            ) : null}
            {el.phase === "voting" ? (
              <button type="button" onClick={() => onClose(el.id)} className="font-medium text-[var(--color-primary)] hover:underline">
                {t("closeElection")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {el.phase === "nomination" ? (
        <div className="mt-3">
          <button type="button" onClick={() => onNominateSelf(el.id)} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
            {t("nominateSelf")}
          </button>
          {nominees.length > 0 ? (
            <ul className="mt-2 text-xs text-[var(--color-text-muted)]">
              {nominees.map((n) => (
                <li key={n.id}>
                  {t("nominee")} · {n.user_id.slice(0, 8)}… ({n.status})
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("noNominees")}</p>
          )}
        </div>
      ) : null}

      {el.phase === "voting" && nominees.filter((n) => n.status !== "withdrawn").length > 0 ? (
        <div className="mt-3 border-t border-[var(--color-border)] pt-3">
          <p className="mb-2 text-xs font-medium text-[var(--color-text)]">{t("castVote")}</p>
          <div className="flex flex-wrap gap-2">
            {nominees
              .filter((n) => n.status !== "withdrawn")
              .map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onVote(el.id, n.id)}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-primary-muted)]"
                >
                  {t("voteFor")} {n.user_id.slice(0, 8)}…
                </button>
              ))}
          </div>
        </div>
      ) : null}

      {el.phase === "closed" && el.protocol ? (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold text-[var(--color-text)]">{t("electionProtocol")}</p>
          <pre className="max-h-48 overflow-auto rounded bg-[var(--color-surface-elevated)] p-2 text-xs">{JSON.stringify(el.protocol, null, 2)}</pre>
        </div>
      ) : null}
    </li>
  );
}
