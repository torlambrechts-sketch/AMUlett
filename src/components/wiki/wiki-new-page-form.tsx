"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolveLocalized } from "@/lib/learning/localize";
import { emptyWikiDocument, type WikiEditorDocument } from "@/lib/wiki/types";
import { wikiDocumentToPlainText } from "@/lib/wiki/plain-text";
import type { WikiTemplateMeta } from "@/lib/wiki/templates";

export function WikiNewPageForm({
  spaceId,
  spaceSlug,
  parentOptions,
  templates,
  locale,
}: {
  spaceId: string;
  spaceSlug: string;
  parentOptions: { id: string; slug: string; title: Record<string, string> | null }[];
  templates: WikiTemplateMeta[];
  locale: string;
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [reviewMonths, setReviewMonths] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pickDoc(): WikiEditorDocument {
    if (templateKey) {
      const tm = templates.find((x) => x.key === templateKey);
      if (tm) {
        return JSON.parse(JSON.stringify(tm.document)) as WikiEditorDocument;
      }
    }
    return emptyWikiDocument();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }

    const doc = pickDoc();
    const bodyPlain = wikiDocumentToPlainText(doc);
    const s = slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!s) {
      setErr(t("slugRequired"));
      setBusy(false);
      return;
    }

    const titleJson: Record<string, string> = {};
    if (title.trim()) titleJson[locale] = title.trim();

    const { data: page, error: pe } = await supabase
      .from("wiki_pages")
      .insert({
        space_id: spaceId,
        parent_id: parentId || null,
        slug: s,
        title: titleJson,
        publish_status: "draft",
        requires_approval: requiresApproval,
        review_reminder_months: reviewMonths ? parseInt(reviewMonths, 10) : null,
        next_review_at: reviewMonths ? monthsFromNow(parseInt(reviewMonths, 10)) : null,
        owner_user_id: user.id,
        template_key: templateKey || null,
      })
      .select("id")
      .single();

    if (pe || !page) {
      setErr(pe?.message ?? "Failed");
      setBusy(false);
      return;
    }

    const { data: rev, error: re } = await supabase
      .from("wiki_page_revisions")
      .insert({
        page_id: page.id,
        version: 1,
        editor_document: doc as unknown as Record<string, unknown>,
        body_plain: bodyPlain,
        revision_summary: "Initial version",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (re || !rev) {
      setErr(re?.message ?? "Failed revision");
      setBusy(false);
      return;
    }

    await supabase.from("wiki_pages").update({ current_revision_id: rev.id }).eq("id", page.id);

    router.push(`/documents/s/${spaceSlug}/p/${s}/edit`);
    router.refresh();
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t("fieldSlug")}</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("fieldTitle")}</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("fieldParent")}</label>
        <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
          <option value="">{t("noParent")}</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {resolveLocalized(p.title ?? {}, locale).text || p.slug}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("fieldTemplate")}</label>
        <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
          <option value="">{t("blankPage")}</option>
          {templates.map((tm) => (
            <option key={tm.key} value={tm.key}>
              {resolveLocalized(tm.label, locale).text || tm.key}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
        {t("requiresApproval")}
      </label>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("reviewMonths")}</label>
        <input
          type="number"
          min={1}
          value={reviewMonths}
          onChange={(e) => setReviewMonths(e.target.value)}
          className="w-32 rounded border px-3 py-2 text-sm"
          placeholder="—"
        />
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
      >
        {busy ? "…" : t("createPage")}
      </button>
    </form>
  );
}

function monthsFromNow(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
}
