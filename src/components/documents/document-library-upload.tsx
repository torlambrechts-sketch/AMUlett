"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LIBRARY_CATEGORIES, type LibraryCategory } from "@/lib/documents/library-categories";

const ALLOWED_EXT = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "md",
  "rtf",
  "odt",
  "ods",
  "odp",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "zip",
]);

function extFromName(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function slugFileName(name: string): string {
  const base = name.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180);
  return base || "file";
}

export function DocumentLibraryUpload({ organizationId }: { organizationId: string }) {
  const t = useTranslations("documents");
  const locale = useLocale();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LibraryCategory>("general");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const input = (e.target as HTMLFormElement).elements.namedItem("file") as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      setMsg(t("uploadPickFile"));
      return;
    }
    const ext = extFromName(file.name);
    if (!ALLOWED_EXT.has(ext)) {
      setMsg(t("uploadUnsupportedType", { ext: ext || "?" }));
      return;
    }

    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }

    const id = crypto.randomUUID();
    const safeName = slugFileName(file.name);
    const path = `${organizationId}/${id}-${safeName}`;

    const { error: upErr } = await supabase.storage.from("document-files").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (upErr) {
      setMsg(upErr.message);
      setBusy(false);
      return;
    }

    const titleJson: Record<string, string> = {};
    const displayTitle = title.trim() || file.name.replace(/\.[^.]+$/, "");
    titleJson[locale] = displayTitle;

    const { error: insErr } = await supabase.from("document_library_items").insert({
      organization_id: organizationId,
      title: titleJson,
      description: {},
      category,
      mime_type: file.type || null,
      file_ext: ext || null,
      file_size_bytes: file.size,
      storage_path: path,
      created_by: user.id,
    });

    if (insErr) {
      await supabase.storage.from("document-files").remove([path]);
      setMsg(insErr.message);
      setBusy(false);
      return;
    }

    setTitle("");
    input.value = "";
    setMsg(t("uploadSuccess"));
    setBusy(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">{t("uploadFileTitle")}</h3>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("fieldTitle")}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("uploadTitlePlaceholder")}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("libraryCategory")}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as LibraryCategory)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            {LIBRARY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`category.${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("uploadFile")}</label>
          <input name="file" type="file" required className="w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-[var(--color-surface-elevated)] file:px-2 file:py-1" />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
        >
          {busy ? t("uploading") : t("upload")}
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">{t("uploadFormatsHint")}</p>
      {msg ? <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{msg}</p> : null}
    </form>
  );
}
