"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { LearningBlockType } from "@/lib/learning/types";
import { LearningContentEditor } from "@/components/editor/learning-content-editor";

export function JsonContentEditor({
  content,
  onChange,
  onSave,
  readOnly = false,
  moduleType,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  onSave: (c: Record<string, unknown>) => void;
  readOnly?: boolean;
  moduleType?: LearningBlockType;
}) {
  const t = useTranslations("lms");
  const te = useTranslations("editor");
  const [text, setText] = useState(() => JSON.stringify(content, null, 2));
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"visual" | "json">("visual");

  const showVisual = moduleType && !readOnly;

  return (
    <div className="space-y-3">
      {showVisual ? (
        <div className="flex gap-2 border-b border-[var(--color-border)] pb-2">
          <button
            type="button"
            className={`rounded px-2 py-1 text-xs font-medium ${mode === "visual" ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"}`}
            onClick={() => {
              setText(JSON.stringify(content, null, 2));
              setErr(null);
              setMode("visual");
            }}
          >
            {te("visualEditor")}
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 text-xs font-medium ${mode === "json" ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"}`}
            onClick={() => {
              setText(JSON.stringify(content, null, 2));
              setErr(null);
              setMode("json");
            }}
          >
            {te("jsonEditor")}
          </button>
        </div>
      ) : null}

      {showVisual && mode === "visual" ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <LearningContentEditor
            moduleType={moduleType}
            content={content}
            onChange={(c) => {
              onChange(c);
              setText(JSON.stringify(c, null, 2));
            }}
            readOnly={readOnly}
          />
          {!readOnly ? (
            <button
              type="button"
              className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-primary-fg)]"
              onClick={() => void onSave(content)}
            >
              {t("saveContent")}
            </button>
          ) : null}
        </div>
      ) : (
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
            rows={showVisual ? 12 : 8}
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
      )}
    </div>
  );
}
