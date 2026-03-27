"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCallback, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { LEARNING_BLOCK_TYPES, type LearningBlockType, type LearningModuleRow } from "@/lib/learning/types";
import { defaultContentForType } from "@/lib/learning/default-content";
import { LearningBlockRenderer } from "@/components/blocks/learning/block-renderer";

type CourseMeta = {
  id: string;
  slug: string;
  published: boolean;
  scope: string;
  title: Record<string, string>;
  description: Record<string, string>;
};

export function CourseEditor({ course, initialModules }: { course: CourseMeta; initialModules: LearningModuleRow[] }) {
  const t = useTranslations("lms");
  const router = useRouter();
  const [modules, setModules] = useState<LearningModuleRow[]>(initialModules);
  const [published, setPublished] = useState(course.published);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");

  const exportPayload = useMemo(
    () => ({
      version: 1,
      slug: course.slug,
      title: course.title,
      description: course.description,
      scope: course.scope,
      modules: modules.map((m) => ({ position: m.position, module_type: m.module_type, content: m.content })),
    }),
    [course, modules]
  );

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  async function saveMeta(nextPublished: boolean) {
    setSaving(true);
    setMsg(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("learning_courses")
        .update({ published: nextPublished })
        .eq("id", course.id);
      if (error) setMsg(error.message);
      else {
        setPublished(nextPublished);
        setMsg(nextPublished ? t("savedPublished") : t("savedDraft"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function addBlock(type: LearningBlockType) {
    setSaving(true);
    setMsg(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const nextPos = modules.length ? Math.max(...modules.map((m) => m.position)) + 1 : 0;
      const content = defaultContentForType(type);
      const { data, error } = await supabase
        .from("learning_modules")
        .insert({
          course_id: course.id,
          position: nextPos,
          module_type: type,
          content,
        })
        .select("id, course_id, position, module_type, content")
        .single();
      if (error) setMsg(error.message);
      else if (data) setModules((m) => [...m, data as LearningModuleRow]);
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(id: string) {
    if (!confirm(t("confirmDeleteSection"))) return;
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("learning_modules").delete().eq("id", id);
      if (error) setMsg(error.message);
      else setModules((m) => m.filter((x) => x.id !== id));
    } finally {
      setSaving(false);
    }
  }

  async function moveBlock(id: string, dir: -1 | 1) {
    const idx = modules.findIndex((m) => m.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= modules.length) return;
    const next = [...modules];
    const tmp = next[idx]!.position;
    next[idx]!.position = next[j]!.position;
    next[j]!.position = tmp;
    next.sort((a, b) => a.position - b.position);
    setModules(next);
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.from("learning_modules").update({ position: next[idx]!.position }).eq("id", next[idx]!.id);
      await supabase.from("learning_modules").update({ position: next[j]!.position }).eq("id", next[j]!.id);
      setMsg(t("orderSaved"));
    } finally {
      setSaving(false);
    }
  }

  function updateLocalContent(id: string, content: Record<string, unknown>) {
    setModules((m) => m.map((x) => (x.id === id ? { ...x, content } : x)));
  }

  async function persistContent(id: string, content: Record<string, unknown>) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("learning_modules").update({ content }).eq("id", id);
    if (error) setMsg(error.message);
    else setMsg(t("contentSaved"));
  }

  function doExport() {
    setJsonText(JSON.stringify(exportPayload, null, 2));
    void navigator.clipboard.writeText(JSON.stringify(exportPayload));
    setMsg(t("exportCopied"));
  }

  async function doImport() {
    setMsg(null);
    try {
      const parsed = JSON.parse(jsonText) as {
        modules?: { position: number; module_type: string; content: Record<string, unknown> }[];
      };
      if (!parsed.modules?.length) {
        setMsg(t("importInvalid"));
        return;
      }
      setSaving(true);
      const supabase = createSupabaseBrowserClient();
      await supabase.from("learning_modules").delete().eq("course_id", course.id);
      const rows = parsed.modules.map((mod, i) => ({
        course_id: course.id,
        position: mod.position ?? i,
        module_type: mod.module_type,
        content: mod.content ?? {},
      }));
      const { data, error } = await supabase.from("learning_modules").insert(rows).select("id, course_id, position, module_type, content");
      if (error) setMsg(error.message);
      else setModules((data ?? []) as LearningModuleRow[]);
    } catch {
      setMsg(t("importInvalid"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/learning/studio" className="text-sm text-[var(--color-primary)] hover:underline">
          ← {t("backToStudio")}
        </Link>
        <span className="text-[var(--color-text-muted)]">|</span>
        <Link href={`/learning/course/${course.id}`} className="text-sm text-[var(--color-text-muted)] hover:underline">
          {t("previewCatalog")}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <span className="text-sm text-[var(--color-text)]">
          {published ? t("published") : t("draft")}
        </span>
        <button
          type="button"
          disabled={saving}
          onClick={() => saveMeta(!published)}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
        >
          {published ? t("unpublish") : t("publish")}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => refresh()}
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          {t("refresh")}
        </button>
      </div>

      {msg ? <p className="text-sm text-[var(--color-text-secondary)]">{msg}</p> : null}

      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="mb-2 text-sm font-semibold">{t("importExport")}</h3>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={6}
          className="mb-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 font-mono text-xs"
          placeholder={t("jsonPlaceholder")}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={doExport} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm">
            {t("exportJson")}
          </button>
          <button type="button" onClick={doImport} disabled={saving} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-50">
            {t("importJson")}
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">{t("addSection")}</h3>
        <div className="flex flex-wrap gap-2">
          {LEARNING_BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              disabled={saving}
              onClick={() => addBlock(type)}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 py-1 text-xs capitalize disabled:opacity-50"
            >
              {type.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        {modules.map((mod, idx) => (
          <div key={mod.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
              <span className="text-sm font-medium capitalize text-[var(--color-text)]">
                {mod.module_type.replace(/_/g, " ")} · #{idx + 1}
              </span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => moveBlock(mod.id, -1)} className="text-xs text-[var(--color-primary)]">
                  ↑
                </button>
                <button type="button" onClick={() => moveBlock(mod.id, 1)} className="text-xs text-[var(--color-primary)]">
                  ↓
                </button>
                <button type="button" onClick={() => removeBlock(mod.id)} className="text-xs text-red-600">
                  {t("remove")}
                </button>
              </div>
            </div>
            <JsonContentEditor
              key={mod.id}
              content={mod.content}
              onChange={(c) => updateLocalContent(mod.id, c)}
              onSave={(c) => persistContent(mod.id, c)}
            />
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <p className="mb-2 text-xs text-[var(--color-text-muted)]">{t("preview")}</p>
              <LearningBlockRenderer type={mod.module_type} content={mod.content} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JsonContentEditor({
  content,
  onChange,
  onSave,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  onSave: (c: Record<string, unknown>) => void;
}) {
  const t = useTranslations("lms");
  const [text, setText] = useState(() => JSON.stringify(content, null, 2));
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("contentJson")}</label>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setErr(null);
          try {
            onChange(JSON.parse(e.target.value) as Record<string, unknown>);
          } catch {
            /* invalid while typing */
          }
        }}
        rows={8}
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 font-mono text-xs"
      />
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
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
    </div>
  );
}
