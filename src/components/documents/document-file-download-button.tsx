"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function DocumentFileDownloadButton({
  storagePath,
  fileName,
  className,
  label,
}: {
  storagePath: string;
  fileName: string;
  /** Override default link styling (e.g. full-width teal button). */
  className?: string;
  label?: string;
}) {
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

  const defaultCls = "text-sm font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50";
  const btnCls = className ?? defaultCls;
  const text = label ?? t("download");

  return (
    <button type="button" disabled={busy} onClick={download} className={btnCls}>
      {className ? (
        <>
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span>{busy ? t("downloading") : text}</span>
        </>
      ) : (
        <>{busy ? t("downloading") : text}</>
      )}
    </button>
  );
}
