"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseWikiDocument } from "@/lib/wiki/types";
import { wikiDocumentToPlainText } from "@/lib/wiki/plain-text";

export function WikiRollbackButton({ pageId, revisionId, label }: { pageId: string; revisionId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function rollback() {
    if (!confirm("Restore this version as the current revision? A new revision will be created.")) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }

    const { data: oldRev } = await supabase
      .from("wiki_page_revisions")
      .select("editor_document, version")
      .eq("id", revisionId)
      .maybeSingle();

    if (!oldRev) {
      setBusy(false);
      return;
    }

    const doc = parseWikiDocument(oldRev.editor_document);
    const bodyPlain = wikiDocumentToPlainText(doc);
    const fromVersion = oldRev.version as number;

    const { data: maxRow } = await supabase
      .from("wiki_page_revisions")
      .select("version")
      .eq("page_id", pageId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (maxRow?.version ?? 0) + 1;

    const { data: newRev, error } = await supabase
      .from("wiki_page_revisions")
      .insert({
        page_id: pageId,
        version: nextVersion,
        editor_document: doc as unknown as Record<string, unknown>,
        body_plain: bodyPlain,
        revision_summary: `Restore from version ${fromVersion}`,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !newRev) {
      setBusy(false);
      return;
    }

    await supabase.from("wiki_pages").update({ current_revision_id: newRev.id }).eq("id", pageId);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={rollback}
      className="text-xs text-amber-700 hover:underline dark:text-amber-300 disabled:opacity-50"
    >
      {busy ? "…" : label}
    </button>
  );
}
