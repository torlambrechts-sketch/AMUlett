"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ASSET_TYPES = ["video", "pdf", "scorm", "xapi", "h5p", "audio", "image", "other"] as const;

export function ResourceLibraryForm({ organizationId }: { organizationId: string }) {
  const t = useTranslations("lms");
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [assetType, setAssetType] = useState<(typeof ASSET_TYPES)[number]>("pdf");
  const [externalUrl, setExternalUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("learning_resources").insert({
      organization_id: organizationId,
      slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
      title: { en: title },
      description: {},
      asset_type: assetType,
      external_url: externalUrl.trim() || null,
      metadata: {},
    });
    if (error) setMsg(error.message);
    else {
      setSlug("");
      setTitle("");
      setExternalUrl("");
      setMsg(t("resourceSaved"));
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div>
        <label className="mb-1 block text-sm font-medium">{t("resourceSlug")}</label>
        <input required value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("resourceTitle")}</label>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("resourceType")}</label>
        <select value={assetType} onChange={(e) => setAssetType(e.target.value as (typeof ASSET_TYPES)[number])} className="w-full rounded border px-3 py-2 text-sm">
          {ASSET_TYPES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("resourceUrl")}</label>
        <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" placeholder="https://..." />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("resourceUrlHint")}</p>
      </div>
      {msg ? <p className="text-sm text-[var(--color-text-muted)]">{msg}</p> : null}
      <button type="submit" className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)]">
        {t("saveResource")}
      </button>
    </form>
  );
}
