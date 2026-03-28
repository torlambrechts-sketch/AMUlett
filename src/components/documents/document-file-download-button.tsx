"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function DocumentFileDownloadButton({ storagePath, fileName }: { storagePath: string; fileName: string }) {
  const t = useTranslations("documents");
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.storage.from("document-files").createSignedUrl(storagePath, 3600);
    setBusy(false);
    if (error || !data?.signedUrl) {
      window.alert(error?.message ?? t("downloadFailed"));
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={download}
      className="text-sm font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
    >
      {busy ? t("downloading") : t("download")}
    </button>
  );
}
