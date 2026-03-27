"use client";

import { useTranslations } from "next-intl";

export function AssignmentBlockView({
  content,
}: {
  content: { title?: string; instructions?: string; acceptUpload?: boolean };
}) {
  const t = useTranslations("lms");

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <p className="text-sm font-semibold text-[var(--color-text)]">{content.title ?? t("assignmentDefaultTitle")}</p>
      {content.instructions ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{content.instructions}</p>
      ) : null}
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">{t("assignmentUploadHint")}</p>
      {content.acceptUpload !== false ? (
        <label className="mt-2 block">
          <span className="sr-only">File</span>
          <input type="file" disabled className="text-xs text-[var(--color-text-muted)]" title={t("assignmentComingSoon")} />
        </label>
      ) : null}
    </div>
  );
}
