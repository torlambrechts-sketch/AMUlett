"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { LEARNING_BLOCK_TYPES, type LearningBlockType, type LearningModuleRow } from "@/lib/learning/types";
import { defaultContentForType } from "@/lib/learning/default-content";
import { ModuleListEditor } from "@/components/learning/module-list-editor";
import { pickLocalizedJson } from "@/lib/learning/localize";

type CourseMeta = {
  id: string;
  slug: string;
  published: boolean;
  scope: string;
  title: Record<string, string>;
  description: Record<string, string>;
  course_settings?: Record<string, unknown> | null;
};

type SiblingCourse = { id: string; slug: string; title: Record<string, string> | null };

export function CourseEditor({
  course,
  initialModules,
  readOnly = false,
  organizationId,
  siblingCourses = [],
  locale = "en",
}: {
  course: CourseMeta;
  initialModules: LearningModuleRow[];
  readOnly?: boolean;
  organizationId?: string | null;
  siblingCourses?: SiblingCourse[];
  locale?: string;
}) {
  const t = useTranslations("lms");
  const router = useRouter();
  const [modules, setModules] = useState<LearningModuleRow[]>(initialModules);
  const [published, setPublished] = useState(course.published);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [settings, setSettings] = useState<Record<string, unknown>>(course.course_settings ?? {});
  const [prereqIds, setPrereqIds] = useState<string[]>([]);

  useEffect(() => {
    if (!organizationId || course.scope !== "organization" || readOnly) return;
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("learning_course_prerequisites")
        .select("prerequisite_course_id")
        .eq("course_id", course.id);
      if (!cancelled && data) setPrereqIds(data.map((r) => r.prerequisite_course_id as string));
    })();
    return () => {
      cancelled = true;
    };
  }, [course.id, course.scope, organizationId, readOnly]);

  const exportPayload = useMemo(
    () => ({
      version: 2,
      slug: course.slug,
      title: course.title,
      description: course.description,
      scope: course.scope,
      course_settings: settings,
      modules: modules.map((m) => ({
        position: m.position,
        module_type: m.module_type,
        content: m.content,
        release_rule: m.release_rule ?? {},
      })),
    }),
    [course, modules, settings]
  );

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  async function saveCourseSettings() {
    if (readOnly) return;
    setSaving(true);
    setMsg(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("learning_courses").update({ course_settings: settings }).eq("id", course.id);
      if (error) setMsg(error.message);
      else setMsg(t("settingsSaved"));
    } finally {
      setSaving(false);
    }
  }

  async function savePrerequisites() {
    if (readOnly || !organizationId || course.scope !== "organization") return;
    setSaving(true);
    setMsg(null);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.from("learning_course_prerequisites").delete().eq("course_id", course.id);
      if (prereqIds.length) {
        const rows = prereqIds.map((pid) => ({ course_id: course.id, prerequisite_course_id: pid }));
        const { error } = await supabase.from("learning_course_prerequisites").insert(rows);
        if (error) setMsg(error.message);
        else setMsg(t("prerequisitesSaved"));
      } else {
        setMsg(t("prerequisitesSaved"));
      }
    } finally {
      setSaving(false);
    }
  }

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
          release_rule: {},
        })
        .select("id, course_id, position, module_type, content, release_rule")
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
        modules?: {
          position: number;
          module_type: string;
          content: Record<string, unknown>;
          release_rule?: Record<string, unknown>;
        }[];
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
        release_rule: mod.release_rule ?? {},
      }));
      const { data, error } = await supabase
        .from("learning_modules")
        .insert(rows)
        .select("id, course_id, position, module_type, content, release_rule");
      if (error) setMsg(error.message);
      else setModules((data ?? []) as LearningModuleRow[]);
    } catch {
      setMsg(t("importInvalid"));
    } finally {
      setSaving(false);
    }
  }

  const prereqOptions = siblingCourses.filter((c) => c.id !== course.id);
  const gamification = Boolean(settings.gamificationEnabled);
  const certMonths = typeof settings.certRecertMonths === "number" ? settings.certRecertMonths : "";

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
        {!readOnly && organizationId ? (
          <>
            <span className="text-[var(--color-text-muted)]">|</span>
            <Link
              href="/learning/studio/resources"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              {t("resourceLibrary")}
            </Link>
          </>
        ) : null}
      </div>

      {readOnly ? (
        <p className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {t("readOnlySystemCourse")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <span className="text-sm text-[var(--color-text)]">{published ? t("published") : t("draft")}</span>
        {!readOnly ? (
          <>
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
          </>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => refresh()}
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            {t("refresh")}
          </button>
        )}
      </div>

      {msg ? <p className="text-sm text-[var(--color-text-secondary)]">{msg}</p> : null}

      {!readOnly && course.scope === "organization" && organizationId ? (
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-2 text-sm font-semibold">{t("courseSettingsTitle")}</h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={gamification}
                onChange={(e) => setSettings((s) => ({ ...s, gamificationEnabled: e.target.checked }))}
              />
              {t("gamificationEnabled")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-[var(--color-text-muted)]">{t("certRecertMonths")}</span>
              <input
                type="number"
                min={0}
                className="w-20 rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                value={certMonths === "" ? "" : String(certMonths)}
                onChange={(e) => {
                  const v = e.target.value;
                  setSettings((s) => ({
                    ...s,
                    certRecertMonths: v === "" ? undefined : parseInt(v, 10),
                  }));
                }}
              />
            </label>
            <button
              type="button"
              onClick={saveCourseSettings}
              disabled={saving}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {t("saveSettings")}
            </button>
          </div>
        </section>
      ) : null}

      {!readOnly && course.scope === "organization" && prereqOptions.length > 0 ? (
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-2 text-sm font-semibold">{t("prerequisitesTitle")}</h3>
          <p className="mb-3 text-xs text-[var(--color-text-muted)]">{t("prerequisitesHelp")}</p>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {prereqOptions.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={prereqIds.includes(c.id)}
                  onChange={(e) => {
                    setPrereqIds((ids) =>
                      e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id)
                    );
                  }}
                />
                <span>{pickLocalizedJson(c.title, locale) || c.slug}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={savePrerequisites}
            disabled={saving}
            className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary-fg)] disabled:opacity-50"
          >
            {t("savePrerequisites")}
          </button>
        </section>
      ) : null}

      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="mb-2 text-sm font-semibold">{t("importExport")}</h3>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          readOnly={readOnly}
          rows={6}
          className="mb-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 font-mono text-xs read-only:bg-[var(--color-surface-elevated)]"
          placeholder={t("jsonPlaceholder")}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={doExport} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm">
            {t("exportJson")}
          </button>
          {!readOnly ? (
            <button type="button" onClick={doImport} disabled={saving} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-50">
              {t("importJson")}
            </button>
          ) : null}
        </div>
      </section>

      {!readOnly ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold">{t("dragDropHint")}</h3>
          <h4 className="mb-3 text-sm font-semibold">{t("addSection")}</h4>
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
      ) : null}

      <ModuleListEditor
        courseId={course.id}
        modules={modules}
        setModules={setModules}
        readOnly={readOnly}
        onRemove={removeBlock}
        onContentChange={updateLocalContent}
        onContentSave={persistContent}
      />
    </div>
  );
}
