"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function JsonContentEditor({
  content,
  onChange,
  onSave,
  readOnly = false,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  onSave: (c: Record<string, unknown>) => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("lms");
  const [text, setText] = useState(() => JSON.stringify(content, null, 2));
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("contentJson")}</label>
      <textarea
        value={text}
        readOnly={readOnly}
        onChange={(e) => {
          if (readOnly) return;
          setText(e.target.value);
          setErr(null);
          try {
            onChange(JSON.parse(e.target.value) as Record<string, unknown>);
          } catch {
            /* invalid while typing */
          }
        }}
        rows={8}
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 font-mono text-xs read-only:opacity-90"
      />
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
      {!readOnly ? (
        <button
          type="button"
          className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1 text-xs"
          onClick={() => {
            try {
              const c = JSON.parse(text) as Record<string, unknown>;
              onChange(c);
              void onSave(c);
              setErr(null);
            } catch {
              setErr("Invalid JSON");
            }
          }}
        >
          {t("saveContent")}
        </button>
      ) : null}
    </div>
  );
}
