"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LearningModuleRow } from "@/lib/learning/types";
import { LearningBlockRenderer } from "@/components/blocks/learning/block-renderer";
import { JsonContentEditor } from "@/components/learning/json-content-editor";
function SortableModuleCard({
  mod,
  index,
  readOnly,
  courseId,
  onRemove,
  onContentChange,
  onContentSave,
  onReleaseSave,
  releaseDays,
  setReleaseDays,
  releaseAt,
  setReleaseAt,
  t,
}: {
  mod: LearningModuleRow;
  index: number;
  readOnly: boolean;
  courseId: string;
  onRemove: (id: string) => void;
  onContentChange: (id: string, c: Record<string, unknown>) => void;
  onContentSave: (id: string, c: Record<string, unknown>) => void;
  onReleaseSave: (id: string) => void;
  releaseDays: Record<string, string>;
  setReleaseDays: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  releaseAt: Record<string, string>;
  setReleaseAt: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  t: ReturnType<typeof useTranslations<"lms">>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id, disabled: readOnly });

  const rule = (mod.release_rule ?? {}) as { after_enroll_days?: number; available_at?: string };
  const daysVal = releaseDays[mod.id] ?? (rule.after_enroll_days != null ? String(rule.after_enroll_days) : "");
  const atVal =
    releaseAt[mod.id] ??
    (rule.available_at ? rule.available_at.slice(0, 16) : "");

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.85 : 1 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
        <div className="flex items-center gap-2">
          {!readOnly ? (
            <button
              type="button"
              className="cursor-grab touch-none rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] active:cursor-grabbing"
              aria-label="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
              </svg>
            </button>
          ) : null}
          <span className="text-sm font-medium capitalize text-[var(--color-text)]">
            {mod.module_type.replace(/_/g, " ")} · #{index + 1}
          </span>
        </div>
        {!readOnly ? (
          <button type="button" onClick={() => onRemove(mod.id)} className="text-xs text-red-600">
            {t("remove")}
          </button>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="mb-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--color-text)]">{t("contentDrip")}</p>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col text-xs">
              <span className="text-[var(--color-text-muted)]">{t("dripDaysAfterEnroll")}</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-24 rounded border border-[var(--color-border)] px-2 py-1"
                value={daysVal}
                onChange={(e) => setReleaseDays((d) => ({ ...d, [mod.id]: e.target.value }))}
              />
            </label>
            <label className="flex flex-col text-xs">
              <span className="text-[var(--color-text-muted)]">{t("dripAvailableFrom")}</span>
              <input
                type="datetime-local"
                className="mt-1 rounded border border-[var(--color-border)] px-2 py-1"
                value={atVal}
                onChange={(e) => setReleaseAt((d) => ({ ...d, [mod.id]: e.target.value }))}
              />
            </label>
            <button
              type="button"
              className="self-end rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1 text-xs font-medium text-[var(--color-primary-fg)]"
              onClick={() => onReleaseSave(mod.id)}
            >
              {t("saveDrip")}
            </button>
          </div>
        </div>
      ) : null}

      <JsonContentEditor
        key={mod.id}
        readOnly={readOnly}
        content={mod.content}
        onChange={(c) => onContentChange(mod.id, c)}
        onSave={(c) => onContentSave(mod.id, c)}
      />
      <div className="mt-4 border-t border-[var(--color-border)] pt-4">
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">{t("preview")}</p>
        <LearningBlockRenderer type={mod.module_type} content={mod.content} courseId={courseId} />
      </div>
    </div>
  );
}

export function ModuleListEditor({
  courseId,
  modules,
  setModules,
  readOnly,
  onRemove,
  onContentChange,
  onContentSave,
}: {
  courseId: string;
  modules: LearningModuleRow[];
  setModules: React.Dispatch<React.SetStateAction<LearningModuleRow[]>>;
  readOnly: boolean;
  onRemove: (id: string) => void;
  onContentChange: (id: string, c: Record<string, unknown>) => void;
  onContentSave: (id: string, c: Record<string, unknown>) => void;
}) {
  const t = useTranslations("lms");
  const [releaseDays, setReleaseDays] = useState<Record<string, string>>({});
  const [releaseAt, setReleaseAt] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function persistReleaseRule(modId: string) {
    const days = parseInt(releaseDays[modId] ?? "", 10);
    const atRaw = releaseAt[modId]?.trim();
    const rule: Record<string, unknown> = {};
    if (!Number.isNaN(days) && days > 0) rule.after_enroll_days = days;
    if (atRaw) {
      const d = new Date(atRaw);
      if (!Number.isNaN(d.getTime())) rule.available_at = d.toISOString();
    }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("learning_modules").update({ release_rule: rule }).eq("id", modId);
    if (!error) {
      setModules((m) => m.map((x) => (x.id === modId ? { ...x, release_rule: rule } : x)));
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(modules, oldIndex, newIndex).map((m, i) => ({ ...m, position: i }));
    setModules(next);
    const supabase = createSupabaseBrowserClient();
    for (let i = 0; i < next.length; i++) {
      await supabase.from("learning_modules").update({ position: i }).eq("id", next[i]!.id);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-6">
          {modules.map((mod, idx) => (
            <SortableModuleCard
              key={mod.id}
              mod={mod}
              index={idx}
              readOnly={readOnly}
              courseId={courseId}
              onRemove={onRemove}
              onContentChange={onContentChange}
              onContentSave={onContentSave}
              onReleaseSave={persistReleaseRule}
              releaseDays={releaseDays}
              setReleaseDays={setReleaseDays}
              releaseAt={releaseAt}
              setReleaseAt={setReleaseAt}
              t={t}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
