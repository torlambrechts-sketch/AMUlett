"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function WikiDeleteButton({
  pageId,
  disabled,
  variant = "button",
}: {
  pageId: string;
  spaceSlug?: string;
  disabled?: boolean;
  /** `link` matches inline table actions */
  variant?: "button" | "link";
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!window.confirm(t("deleteWikiConfirm"))) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("wiki_pages").delete().eq("id", pageId);
    setBusy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push(`/documents`);
    router.refresh();
  }

  const cls =
    variant === "link"
      ? "text-sm font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      : "rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200";

  return (
    <button type="button" disabled={disabled || busy} onClick={onDelete} className={cls}>
      {busy ? t("deleting") : t("deleteWiki")}
    </button>
  );
}
