"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function DocumentFileDeleteButton({
  itemId,
  storagePath,
  disabled,
}: {
  itemId: string;
  storagePath: string;
  disabled?: boolean;
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!window.confirm(t("deleteFileConfirm"))) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error: rmErr } = await supabase.storage.from("document-files").remove([storagePath]);
    if (rmErr) {
      setBusy(false);
      window.alert(rmErr.message);
      return;
    }
    const { error: dbErr } = await supabase.from("document_library_items").delete().eq("id", itemId);
    setBusy(false);
    if (dbErr) {
      window.alert(dbErr.message);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onDelete}
      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
    >
      {busy ? t("deleting") : t("delete")}
    </button>
  );
}
