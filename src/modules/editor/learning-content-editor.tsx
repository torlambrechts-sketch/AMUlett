"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
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
import type { LearningBlockType } from "@/lib/learning/types";
import { newBlockId } from "./id";
import { RichTextField } from "./rich-text-field";
import { paragraphsToHtml, richTextContentToHtml, stripHtmlToPlain } from "./rich-text-html";

type Props = {
  moduleType: LearningBlockType;
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  readOnly?: boolean;
  /** Bump when switching to visual from JSON so TipTap reloads. */
  editorResetKey?: number;
};

export function LearningContentEditor({ moduleType, content, onChange, readOnly, editorResetKey = 0 }: Props) {
  const t = useTranslations("editor");

  if (readOnly) {
    return <p className="text-xs text-[var(--color-text-muted)]">{t("readOnlyHint")}</p>;
  }

  switch (moduleType) {
    case "rich_text":
      return <RichTextFields content={content} onChange={onChange} t={t} resetKey={editorResetKey} />;
    case "flash_cards":
      return <FlashCardsFields content={content} onChange={onChange} t={t} />;
    case "short_message":
      return <ShortMessageFields content={content} onChange={onChange} />;
    case "quiz":
      return <QuizFields content={content} onChange={onChange} t={t} />;
    case "video":
      return <VideoFields content={content} onChange={onChange} />;
    case "image_gallery":
      return <GalleryFields content={content} onChange={onChange} t={t} />;
    case "micro_lesson":
      return <MicroLessonFields content={content} onChange={onChange} t={t} />;
    case "executive_summary":
      return <ExecSummaryFields content={content} onChange={onChange} t={t} />;
    case "on_the_job":
      return <OnTheJobFields content={content} onChange={onChange} t={t} />;
    case "reflection":
      return <ReflectionFields content={content} onChange={onChange} />;
    case "checklist":
      return <ChecklistFields content={content} onChange={onChange} t={t} />;
    case "pdf":
      return <PdfFields content={content} onChange={onChange} />;
    case "scorm_xapi":
      return <ScormFields content={content} onChange={onChange} />;
    case "h5p":
      return <H5pFields content={content} onChange={onChange} />;
    case "assignment":
      return <AssignmentFields content={content} onChange={onChange} />;
    case "forum":
      return <ForumFields content={content} onChange={onChange} />;
    default:
      return null;
  }
}

function fieldClass() {
  return "mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm";
}

function labelClass() {
  return "mb-1 block text-xs font-medium text-[var(--color-text-muted)]";
}

function RichTextFields({
  content,
  onChange,
  t,
  resetKey,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  t: (k: string) => string;
  resetKey: number;
}) {
  const html = richTextContentToHtml(content);

  return (
    <div className="space-y-2">
      <RichTextField
        resetKey={resetKey}
        value={html}
        placeholder={t("richTextPlaceholder")}
        onChange={(htmlNext) => {
          const plain = stripHtmlToPlain(htmlNext);
          const paragraphs = plain ? plain.split(/\n\n+/).map((text) => ({ text })) : [{ text: "" }];
          onChange({ ...content, html: htmlNext, paragraphs });
        }}
      />
      <p className="text-xs text-[var(--color-text-muted)]">{t("richTextHint")}</p>
    </div>
  );
}

type FlashCardRow = { id: string; front: string; back: string };

function normalizeFlashCards(raw: unknown): FlashCardRow[] {
  const arr = Array.isArray(raw) ? raw : [{ front: "", back: "" }];
  return (arr as { id?: string; front?: string; back?: string }[]).map((c, i) => ({
    id: typeof c.id === "string" && c.id ? c.id : `fc-temp-${i}`,
    front: c.front ?? "",
    back: c.back ?? "",
  }));
}

function FlashCardsFields({
  content,
  onChange,
  t,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  t: (k: string) => string;
}) {
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    const arr = content.cards;
    if (!Array.isArray(arr) || arr.length === 0) {
      hydrated.current = true;
      return;
    }
    const needs = (arr as { id?: string }[]).some((c) => !c.id || String(c.id).startsWith("fc-temp-"));
    if (needs) {
      hydrated.current = true;
      onChange({
        ...content,
        cards: (arr as { id?: string; front?: string; back?: string }[]).map((c) => ({
          id: c.id && !String(c.id).startsWith("fc-temp-") ? c.id : newBlockId("fc"),
          front: c.front ?? "",
          back: c.back ?? "",
        })),
      });
    } else hydrated.current = true;
  }, [content, onChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const cards = normalizeFlashCards(content.cards);

  function setCards(next: FlashCardRow[]) {
    onChange({ ...content, cards: next });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setCards(arrayMove(cards, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {cards.map((c, i) => (
            <SortableFlashCard
              key={c.id}
              card={c}
              index={i}
              t={t}
              onChange={(patch) => {
                const next = cards.map((x) => (x.id === c.id ? { ...x, ...patch } : x));
                setCards(next);
              }}
              onRemove={() => setCards(cards.filter((x) => x.id !== c.id))}
            />
          ))}
        </div>
      </SortableContext>
      <button
        type="button"
        className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
        onClick={() => setCards([...cards, { id: newBlockId("fc"), front: "", back: "" }])}
      >
        + {t("addCard")}
      </button>
    </DndContext>
  );
}

function SortableFlashCard({
  card,
  index,
  t,
  onChange,
  onRemove,
}: {
  card: FlashCardRow;
  index: number;
  t: (k: string) => string;
  onChange: (patch: Partial<FlashCardRow>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.9 : 1 }}
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"
          {...attributes}
          {...listeners}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
        </button>
        <p className="text-xs font-medium text-[var(--color-text)]">
          {t("card")} {index + 1}
        </p>
      </div>
      <label className={labelClass()}>{t("front")}</label>
      <textarea
        className={fieldClass()}
        rows={2}
        value={card.front}
        onChange={(e) => onChange({ front: e.target.value })}
      />
      <label className={labelClass()}>{t("back")}</label>
      <textarea
        className={fieldClass()}
        rows={2}
        value={card.back}
        onChange={(e) => onChange({ back: e.target.value })}
      />
      <button type="button" className="mt-2 text-xs text-red-600" onClick={onRemove}>
        {t("removeCard")}
      </button>
    </div>
  );
}

function ShortMessageFields({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div>
      <label className={labelClass()}>Message</label>
      <textarea
        className={fieldClass()}
        rows={4}
        value={typeof content.message === "string" ? content.message : ""}
        onChange={(e) => onChange({ ...content, message: e.target.value })}
      />
    </div>
  );
}

function normalizeQuizQuestions(raw: unknown): Record<string, unknown>[] {
  const arr = Array.isArray(raw) && raw.length
    ? raw
    : [
        {
          id: newBlockId("q"),
          question: "",
          choices: [
            { id: "a", label: "" },
            { id: "b", label: "" },
          ],
          correctChoiceId: "a",
        },
      ];
  return (arr as Record<string, unknown>[]).map((q, i) => ({
    ...q,
    id: typeof q.id === "string" && q.id ? q.id : `q-temp-${i}`,
  }));
}

function QuizFields({
  content,
  onChange,
  t,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  t: (k: string) => string;
}) {
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    const raw = content.questions;
    if (!Array.isArray(raw) || raw.length === 0) {
      hydrated.current = true;
      return;
    }
    const needs = (raw as { id?: string }[]).some((q) => !q.id || String(q.id).startsWith("q-temp-"));
    if (needs) {
      hydrated.current = true;
      onChange({
        ...content,
        questions: (raw as Record<string, unknown>[]).map((q) => {
          const id = q.id as string | undefined;
          return id && !String(id).startsWith("q-temp-") ? q : { ...q, id: newBlockId("q") };
        }),
      });
    } else hydrated.current = true;
  }, [content, onChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const questions = normalizeQuizQuestions(content.questions);

  function setQuestions(next: Record<string, unknown>[]) {
    onChange({ ...content, questions: next });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setQuestions(arrayMove(questions, oldIndex, newIndex));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <label className="text-xs">
          <span className="text-[var(--color-text-muted)]">{t("passPercent")}</span>
          <input
            type="number"
            min={0}
            max={100}
            className="ml-2 w-20 rounded border px-2 py-1 text-sm"
            value={typeof content.passPercent === "number" ? content.passPercent : 70}
            onChange={(e) => onChange({ ...content, passPercent: parseInt(e.target.value, 10) || 0 })}
          />
        </label>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={questions.map((q) => q.id as string)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <SortableQuizQuestion
                key={q.id as string}
                q={q}
                qi={qi}
                t={t}
                onPatch={(patch) => {
                  const next = questions.map((x, j) => (j === qi ? { ...x, ...patch } : x));
                  setQuestions(next);
                }}
                onRemove={() => setQuestions(questions.filter((_, j) => j !== qi))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        className="text-sm text-[var(--color-primary)] hover:underline"
        onClick={() => {
          const a = newBlockId("c");
          const b = newBlockId("c");
          setQuestions([
            ...questions,
            {
              id: newBlockId("q"),
              question: "",
              choices: [
                { id: a, label: "" },
                { id: b, label: "" },
              ],
              correctChoiceId: a,
            },
          ]);
        }}
      >
        + {t("addQuestion")}
      </button>
    </div>
  );
}

function SortableQuizQuestion({
  q,
  qi,
  t,
  onPatch,
  onRemove,
}: {
  q: Record<string, unknown>;
  qi: number;
  t: (k: string) => string;
  onPatch: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const id = q.id as string;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const choices = Array.isArray(q.choices) ? (q.choices as { id: string; label: string }[]) : [];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.9 : 1 }}
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"
          {...attributes}
          {...listeners}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
        </button>
        <label className={labelClass()}>
          {t("question")} {qi + 1}
        </label>
      </div>
      <input
        className={fieldClass()}
        value={typeof q.question === "string" ? q.question : ""}
        onChange={(e) => onPatch({ question: e.target.value })}
      />
      <p className="mt-2 text-xs font-medium text-[var(--color-text)]">{t("choices")}</p>
      {choices.map((ch, ci) => (
        <div key={ch.id} className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="radio"
            name={`correct-${id}`}
            checked={q.correctChoiceId === ch.id}
            onChange={() => onPatch({ correctChoiceId: ch.id })}
            className="text-[var(--color-primary)]"
          />
          <input
            className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
            value={ch.label}
            onChange={(e) => {
              const nch = [...choices];
              nch[ci] = { ...nch[ci]!, label: e.target.value };
              onPatch({ choices: nch });
            }}
          />
        </div>
      ))}
      <button type="button" className="mt-2 text-xs text-red-600" onClick={onRemove}>
        {t("removeQuestion")}
      </button>
    </div>
  );
}

function VideoFields({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass()}>URL</label>
        <input
          className={fieldClass()}
          value={typeof content.url === "string" ? content.url : ""}
          onChange={(e) => onChange({ ...content, url: e.target.value })}
        />
      </div>
      <div>
        <label className={labelClass()}>Caption</label>
        <input
          className={fieldClass()}
          value={typeof content.caption === "string" ? content.caption : ""}
          onChange={(e) => onChange({ ...content, caption: e.target.value })}
        />
      </div>
    </div>
  );
}

function GalleryFields({
  content,
  onChange,
  t,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  t: (k: string) => string;
}) {
  const images: { url: string; caption: string }[] = Array.isArray(content.images)
    ? (content.images as { url?: string; caption?: string }[]).map((im) => ({
        url: im.url ?? "",
        caption: im.caption ?? "",
      }))
    : [{ url: "", caption: "" }];

  function setImages(next: { url: string; caption: string }[]) {
    onChange({ ...content, images: next });
  }

  return (
    <div className="space-y-3">
      {images.map((im, i) => (
        <div key={i} className="rounded border border-[var(--color-border)] p-2">
          <input
            className={fieldClass()}
            placeholder="Image URL"
            value={im.url}
            onChange={(e) => {
              const next = [...images];
              next[i] = { ...next[i]!, url: e.target.value, caption: next[i]?.caption ?? "" };
              setImages(next);
            }}
          />
          <input
            className={`${fieldClass()} mt-2`}
            placeholder="Caption"
            value={im.caption ?? ""}
            onChange={(e) => {
              const next = [...images];
              next[i] = { url: next[i]?.url ?? "", caption: e.target.value };
              setImages(next);
            }}
          />
          <button type="button" className="mt-1 text-xs text-red-600" onClick={() => setImages(images.filter((_, j) => j !== i))}>
            {t("removeImage")}
          </button>
        </div>
      ))}
      <button type="button" className="text-sm text-[var(--color-primary)] hover:underline" onClick={() => setImages([...images, { url: "", caption: "" }])}>
        + {t("addImage")}
      </button>
    </div>
  );
}

function MicroLessonFields({
  content,
  onChange,
  t,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  t: (k: string) => string;
}) {
  const steps = Array.isArray(content.steps) ? (content.steps as { title: string; body: string }[]) : [{ title: "", body: "" }];

  function setSteps(next: { title: string; body: string }[]) {
    onChange({ ...content, steps: next });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass()}>{t("lessonTitle")}</label>
        <input
          className={fieldClass()}
          value={typeof content.title === "string" ? content.title : ""}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
        />
      </div>
      {steps.map((s, i) => (
        <div key={i} className="rounded border border-[var(--color-border)] p-3">
          <p className="text-xs font-medium">{t("step")} {i + 1}</p>
          <input
            className={fieldClass()}
            placeholder={t("stepTitle")}
            value={s.title}
            onChange={(e) => {
              const next = [...steps];
              next[i] = { ...next[i]!, title: e.target.value, body: next[i]?.body ?? "" };
              setSteps(next);
            }}
          />
          <textarea
            className={fieldClass()}
            rows={3}
            placeholder={t("stepBody")}
            value={s.body}
            onChange={(e) => {
              const next = [...steps];
              next[i] = { title: next[i]?.title ?? "", body: e.target.value };
              setSteps(next);
            }}
          />
          <button type="button" className="text-xs text-red-600" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>
            {t("removeStep")}
          </button>
        </div>
      ))}
      <button type="button" className="text-sm text-[var(--color-primary)] hover:underline" onClick={() => setSteps([...steps, { title: "", body: "" }])}>
        + {t("addStep")}
      </button>
    </div>
  );
}

function ExecSummaryFields({
  content,
  onChange,
  t,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  t: (k: string) => string;
}) {
  const points = Array.isArray(content.points) ? (content.points as { text: string }[]) : [{ text: "" }];

  function setPoints(next: { text: string }[]) {
    onChange({ ...content, points: next });
  }

  return (
    <div className="space-y-2">
      {points.map((p, i) => (
        <div key={i} className="flex gap-2">
          <input
            className={fieldClass()}
            value={p.text}
            onChange={(e) => {
              const next = [...points];
              next[i] = { text: e.target.value };
              setPoints(next);
            }}
          />
          <button type="button" className="text-xs text-red-600" onClick={() => setPoints(points.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="text-sm text-[var(--color-primary)] hover:underline" onClick={() => setPoints([...points, { text: "" }])}>
        + {t("addPoint")}
      </button>
    </div>
  );
}

function OnTheJobFields({
  content,
  onChange,
  t,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  t: (k: string) => string;
}) {
  const actions = Array.isArray(content.actions)
    ? (content.actions as { title: string; description: string }[])
    : [{ title: "", description: "" }];

  function setActions(next: { title: string; description: string }[]) {
    onChange({ ...content, actions: next });
  }

  return (
    <div className="space-y-3">
      {actions.map((a, i) => (
        <div key={i} className="rounded border border-[var(--color-border)] p-3">
          <input
            className={fieldClass()}
            placeholder={t("actionTitle")}
            value={a.title}
            onChange={(e) => {
              const next = [...actions];
              next[i] = { ...next[i]!, title: e.target.value, description: next[i]?.description ?? "" };
              setActions(next);
            }}
          />
          <textarea
            className={`${fieldClass()} mt-2`}
            rows={2}
            placeholder={t("actionDesc")}
            value={a.description}
            onChange={(e) => {
              const next = [...actions];
              next[i] = { title: next[i]?.title ?? "", description: e.target.value };
              setActions(next);
            }}
          />
          <button type="button" className="mt-1 text-xs text-red-600" onClick={() => setActions(actions.filter((_, j) => j !== i))}>
            {t("removeAction")}
          </button>
        </div>
      ))}
      <button type="button" className="text-sm text-[var(--color-primary)] hover:underline" onClick={() => setActions([...actions, { title: "", description: "" }])}>
        + {t("addAction")}
      </button>
    </div>
  );
}

function ReflectionFields({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div>
      <label className={labelClass()}>Prompt</label>
      <textarea
        className={fieldClass()}
        rows={4}
        value={typeof content.prompt === "string" ? content.prompt : ""}
        onChange={(e) => onChange({ ...content, prompt: e.target.value })}
      />
    </div>
  );
}

function ChecklistFields({
  content,
  onChange,
  t,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  t: (k: string) => string;
}) {
  const items = Array.isArray(content.items) ? (content.items as { id: string; label: string }[]) : [{ id: newBlockId("chk"), label: "" }];

  function setItems(next: { id: string; label: string }[]) {
    onChange({ ...content, items: next });
  }

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={it.id} className="flex gap-2">
          <input
            className={fieldClass()}
            value={it.label}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i]!, label: e.target.value };
              setItems(next);
            }}
          />
          <button type="button" className="text-xs text-red-600" onClick={() => setItems(items.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-sm text-[var(--color-primary)] hover:underline"
        onClick={() => setItems([...items, { id: newBlockId("chk"), label: "" }])}
      >
        + {t("addItem")}
      </button>
    </div>
  );
}

function PdfFields({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass()}>Title</label>
        <input
          className={fieldClass()}
          value={typeof content.title === "string" ? content.title : ""}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
        />
      </div>
      <div>
        <label className={labelClass()}>PDF URL</label>
        <input
          className={fieldClass()}
          value={typeof content.url === "string" ? content.url : ""}
          onChange={(e) => onChange({ ...content, url: e.target.value })}
        />
      </div>
    </div>
  );
}

function ScormFields({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <input
        className={fieldClass()}
        placeholder="Package type"
        value={typeof content.packageType === "string" ? content.packageType : ""}
        onChange={(e) => onChange({ ...content, packageType: e.target.value })}
      />
      <input
        className={fieldClass()}
        placeholder="Launch URL"
        value={typeof content.launchUrl === "string" ? content.launchUrl : ""}
        onChange={(e) => onChange({ ...content, launchUrl: e.target.value })}
      />
      <textarea
        className={fieldClass()}
        rows={2}
        placeholder="Notes"
        value={typeof content.notes === "string" ? content.notes : ""}
        onChange={(e) => onChange({ ...content, notes: e.target.value })}
      />
    </div>
  );
}

function H5pFields({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <input
        className={fieldClass()}
        placeholder="Title"
        value={typeof content.title === "string" ? content.title : ""}
        onChange={(e) => onChange({ ...content, title: e.target.value })}
      />
      <input
        className={fieldClass()}
        placeholder="Embed URL"
        value={typeof content.embedUrl === "string" ? content.embedUrl : ""}
        onChange={(e) => onChange({ ...content, embedUrl: e.target.value })}
      />
    </div>
  );
}

function AssignmentFields({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <input
        className={fieldClass()}
        placeholder="Title"
        value={typeof content.title === "string" ? content.title : ""}
        onChange={(e) => onChange({ ...content, title: e.target.value })}
      />
      <textarea
        className={fieldClass()}
        rows={5}
        placeholder="Instructions"
        value={typeof content.instructions === "string" ? content.instructions : ""}
        onChange={(e) => onChange({ ...content, instructions: e.target.value })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={content.acceptUpload !== false}
          onChange={(e) => onChange({ ...content, acceptUpload: e.target.checked })}
        />
        Allow file upload
      </label>
    </div>
  );
}

function ForumFields({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div>
      <label className={labelClass()}>Headline</label>
      <input
        className={fieldClass()}
        value={typeof content.headline === "string" ? content.headline : ""}
        onChange={(e) => onChange({ ...content, headline: e.target.value })}
      />
    </div>
  );
}
