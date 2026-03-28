"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseWikiDocument, type WikiEditorDocument } from "@/lib/wiki/types";
import { wikiDocumentToPlainText } from "@/lib/wiki/plain-text";
import { WikiDocView } from "@/components/wiki/wiki-doc-view";
import { WikiPresenceBar } from "@/components/wiki/wiki-presence";
import { WikiBlocksEditor } from "@modules/editor";
import { resolveLocalized } from "@/lib/learning/localize";
import { LIBRARY_CATEGORIES, type LibraryCategory, isLibraryCategory } from "@/lib/documents/library-categories";

export function WikiPageEditor({
  spaceSlug,
  pageId,
  pageSlug,
  organizationId,
  initialTitle,
  initialLibraryCategory,
  initialPublishStatus,
  requiresApproval,
  reviewMonths: initialReviewMonths,
  nextReviewAt: initialNextReviewAt,
  initialDocument,
  revisionVersion,
  locale,
  isAdmin,
  allTags,
  selectedTagIds,
}: {
  spaceSlug: string;
  pageId: string;
  organizationId: string;
  pageSlug: string;
  initialTitle: Record<string, string>;
  initialLibraryCategory: string;
  initialPublishStatus: string;
  requiresApproval: boolean;
  reviewMonths: number | null;
  nextReviewAt: string | null;
  initialDocument: unknown;
  revisionVersion: number;
  locale: string;
  isAdmin: boolean;
  allTags: { id: string; slug: string; label: Record<string, string> }[];
  selectedTagIds: string[];
}) {
  const t = useTranslations("documents");
  const te = useTranslations("editor");
  const router = useRouter();

  const initialParsed = useMemo(() => parseWikiDocument(initialDocument), [initialDocument]);
  const [doc, setDoc] = useState<WikiEditorDocument>(() => initialParsed);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(initialParsed, null, 2));
  const [editorTab, setEditorTab] = useState<"visual" | "markdown" | "json">(() =>
    initialParsed.format === "markdown" ? "markdown" : "visual"
  );

  const [title, setTitle] = useState(
    () => initialTitle[locale] ?? Object.values(initialTitle).find(Boolean) ?? ""
  );
  const [libraryCategory, setLibraryCategory] = useState<LibraryCategory>(() =>
    isLibraryCategory(initialLibraryCategory) ? initialLibraryCategory : "general",
  );
  const [publishStatus, setPublishStatus] = useState(initialPublishStatus);
  const [reqAppr, setReqAppr] = useState(requiresApproval);
  const [revMonths, setRevMonths] = useState(initialReviewMonths != null ? String(initialReviewMonths) : "");
  const [tagSel, setTagSel] = useState(() => new Set(selectedTagIds));
  const [newTagSlug, setNewTagSlug] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsedForPreview = useMemo(() => {
    if (editorTab === "json") {
      try {
        return parseWikiDocument(JSON.parse(jsonText) as unknown);
      } catch {
        return doc;
      }
    }
    return doc;
  }, [doc, editorTab, jsonText]);

  function syncDocFromJson() {
    try {
      const next = parseWikiDocument(JSON.parse(jsonText) as unknown);
      setDoc(next);
      setMsg(null);
      return next;
    } catch {
      setMsg(t("invalidJson"));
      return null;
    }
  }

  function setBlocksFormat(nextBlocks: WikiEditorDocument["blocks"]) {
    const next: WikiEditorDocument = { format: "blocks", blocks: nextBlocks, markdown: "" };
    setDoc(next);
    setJsonText(JSON.stringify(next, null, 2));
  }

  async function persistTags(supabase: ReturnType<typeof createSupabaseBrowserClient>) {
    await supabase.from("wiki_page_tags").delete().eq("page_id", pageId);
    const rows = Array.from(tagSel).map((tag_id) => ({ page_id: pageId, tag_id }));
    if (rows.length) await supabase.from("wiki_page_tags").insert(rows);
  }

  async function addNewTag() {
    const slug = newTagSlug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("wiki_tags")
      .insert({
        organization_id: organizationId,
        slug,
        label: { [locale]: slug },
      })
      .select("id, slug, label")
      .single();
    if (!error && data) {
      setTagSel((s) => new Set(s).add(data.id));
      setNewTagSlug("");
      router.refresh();
    }
    setBusy(false);
  }

  async function saveRevision(action: "draft" | "publish") {
    setBusy(true);
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }

    let finalDoc: WikiEditorDocument;
    if (editorTab === "json") {
      const parsed = syncDocFromJson();
      if (!parsed) {
        setBusy(false);
        return;
      }
      finalDoc = parsed;
    } else {
      finalDoc = doc;
    }

    const bodyPlain = wikiDocumentToPlainText(finalDoc);
    const titleJson = { ...initialTitle };
    if (title.trim()) titleJson[locale] = title.trim();

    const { data: maxRow } = await supabase
      .from("wiki_page_revisions")
      .select("version")
      .eq("page_id", pageId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (maxRow?.version ?? revisionVersion) + 1;

    const { data: newRev, error: revErr } = await supabase
      .from("wiki_page_revisions")
      .insert({
        page_id: pageId,
        version: nextVersion,
        editor_document: finalDoc as unknown as Record<string, unknown>,
        body_plain: bodyPlain,
        revision_summary: action === "publish" ? "Publish" : "Draft save",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (revErr || !newRev) {
      setMsg(revErr?.message ?? "Failed");
      setBusy(false);
      return;
    }

    let status = publishStatus;
    let nextReview: string | null = initialNextReviewAt;

    if (action === "publish") {
      if (reqAppr && !isAdmin) {
        status = "pending_approval";
      } else {
        status = "published";
        const m = revMonths ? parseInt(revMonths, 10) : NaN;
        if (!Number.isNaN(m) && m > 0) {
          nextReview = monthsFromNow(m);
        }
      }
    } else {
      status = "draft";
    }

    const monthsVal = revMonths ? parseInt(revMonths, 10) : null;
    const { error: pe } = await supabase
      .from("wiki_pages")
      .update({
        title: titleJson,
        current_revision_id: newRev.id,
        publish_status: status,
        requires_approval: reqAppr,
        review_reminder_months: monthsVal && monthsVal > 0 ? monthsVal : null,
        next_review_at: nextReview,
        library_category: libraryCategory,
      })
      .eq("id", pageId);

    if (pe) {
      setMsg(pe.message);
      setBusy(false);
      return;
    }

    await persistTags(supabase);
    setPublishStatus(status);
    setMsg(t("saved"));
    setBusy(false);
    router.refresh();
  }

  async function approvePublish() {
    if (!isAdmin) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const m = revMonths ? parseInt(revMonths, 10) : NaN;
    const nextReview = !Number.isNaN(m) && m > 0 ? monthsFromNow(m) : null;
    await supabase
      .from("wiki_pages")
      .update({
        publish_status: "published",
        next_review_at: nextReview,
        library_category: libraryCategory,
      })
      .eq("id", pageId);
    setPublishStatus("published");
    setBusy(false);
    setMsg(t("published"));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <WikiPresenceBar pageId={pageId} organizationId={organizationId} />

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("fieldTitle")}</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("libraryCategory")}</label>
          <select
            value={libraryCategory}
            onChange={(e) => setLibraryCategory(e.target.value as LibraryCategory)}
            className="w-full max-w-md rounded border px-3 py-2 text-sm sm:w-auto"
          >
            {LIBRARY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`category.${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => saveRevision("draft")}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {t("saveDraft")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => saveRevision("publish")}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
          >
            {reqAppr && !isAdmin ? t("submitForApproval") : t("publish")}
          </button>
          {isAdmin && publishStatus === "pending_approval" ? (
            <button
              type="button"
              disabled={busy}
              onClick={approvePublish}
              className="rounded-[var(--radius-md)] bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("approve")}
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          {t("statusLabel")}: {publishStatus}
        </p>
        {msg ? <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{msg}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
        {doc.format === "blocks" ? (
          <button
            type="button"
            className={`rounded px-3 py-1.5 text-xs font-medium ${editorTab === "visual" ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"}`}
            onClick={() => setEditorTab("visual")}
          >
            {te("visualEditor")}
          </button>
        ) : null}
        {doc.format === "markdown" ? (
          <button
            type="button"
            className={`rounded px-3 py-1.5 text-xs font-medium ${editorTab === "markdown" ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"}`}
            onClick={() => setEditorTab("markdown")}
          >
            {te("markdownEditor")}
          </button>
        ) : null}
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-xs font-medium ${editorTab === "json" ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"}`}
          onClick={() => setEditorTab("json")}
        >
          {te("jsonEditor")}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,380px)]">
        <div className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          {editorTab === "visual" && doc.format === "blocks" ? (
            <WikiBlocksEditor blocks={doc.blocks} onChange={(blocks) => setBlocksFormat(blocks)} readOnly={false} />
          ) : null}

          {editorTab === "markdown" ? (
            <div>
              <p className="mb-2 text-xs text-[var(--color-text-muted)]">{te("markdownFullPage")}</p>
              <textarea
                className="min-h-[280px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-mono text-sm"
                value={doc.format === "markdown" ? doc.markdown : ""}
                onChange={(e) => {
                  const next: WikiEditorDocument = { format: "markdown", blocks: [], markdown: e.target.value };
                  setDoc(next);
                  setJsonText(JSON.stringify(next, null, 2));
                }}
              />
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">{te("wikiLinkHint")}</p>
            </div>
          ) : null}

          {editorTab === "json" ? (
            <div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={24}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 font-mono text-xs"
              />
            </div>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">{t("preview")}</p>
          <div className="max-h-[min(70vh,560px)] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <WikiDocView editorDocument={parsedForPreview} spaceSlug={spaceSlug} />
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={reqAppr} onChange={(e) => setReqAppr(e.target.checked)} />
          {t("requiresApproval")}
        </label>
        <div className="mt-3">
          <label className="text-xs text-[var(--color-text-muted)]">{t("reviewMonths")}</label>
          <input
            type="number"
            min={1}
            value={revMonths}
            onChange={(e) => setRevMonths(e.target.value)}
            className="ml-2 w-24 rounded border px-2 py-1 text-sm"
          />
        </div>
        <p className="mt-3 text-xs font-medium text-[var(--color-text)]">{t("tags")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {allTags.map((tg) => (
            <label key={tg.id} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={tagSel.has(tg.id)}
                onChange={(e) => {
                  setTagSel((s) => {
                    const n = new Set(s);
                    if (e.target.checked) n.add(tg.id);
                    else n.delete(tg.id);
                    return n;
                  });
                }}
              />
              {resolveLocalized(tg.label, locale).text || tg.slug}
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input
            value={newTagSlug}
            onChange={(e) => setNewTagSlug(e.target.value)}
            placeholder={t("newTagPlaceholder")}
            className="rounded border px-2 py-1 text-xs"
          />
          <button type="button" disabled={busy} onClick={addNewTag} className="rounded border px-2 py-1 text-xs disabled:opacity-50">
            {t("addTag")}
          </button>
        </div>
      </div>
    </div>
  );
}

function monthsFromNow(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
}
