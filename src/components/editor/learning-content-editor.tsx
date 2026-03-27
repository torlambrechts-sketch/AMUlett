"use client";

import { useTranslations } from "next-intl";
import type { LearningBlockType } from "@/lib/learning/types";
import { newBlockId } from "@/lib/editor/id";

type Props = {
  moduleType: LearningBlockType;
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  readOnly?: boolean;
};

export function LearningContentEditor({ moduleType, content, onChange, readOnly }: Props) {
  const t = useTranslations("editor");

  if (readOnly) {
    return <p className="text-xs text-[var(--color-text-muted)]">{t("readOnlyHint")}</p>;
  }

  switch (moduleType) {
    case "rich_text":
      return <RichTextFields content={content} onChange={onChange} t={t} />;
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
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  t: (k: string) => string;
}) {
  const paragraphs: { text: string }[] = Array.isArray(content.paragraphs)
    ? (content.paragraphs as { text?: string }[]).map((p) => ({ text: p.text ?? "" }))
    : [{ text: "" }];

  function setParagraphs(next: { text: string }[]) {
    onChange({ ...content, paragraphs: next });
  }

  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <div key={i} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
          <label className={labelClass()}>{t("paragraph")} {i + 1}</label>
          <textarea
            className={fieldClass()}
            rows={4}
            value={p.text ?? ""}
            onChange={(e) => {
              const next = [...paragraphs];
              next[i] = { text: e.target.value };
              setParagraphs(next);
            }}
          />
          <button
            type="button"
            className="mt-2 text-xs text-red-600"
            onClick={() => setParagraphs(paragraphs.filter((_, j) => j !== i))}
          >
            {t("removeParagraph")}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-sm text-[var(--color-primary)] hover:underline"
        onClick={() => setParagraphs([...paragraphs, { text: "" }])}
      >
        + {t("addParagraph")}
      </button>
    </div>
  );
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
  const cards: { front: string; back: string }[] = Array.isArray(content.cards)
    ? (content.cards as { front?: string; back?: string }[]).map((c) => ({
        front: c.front ?? "",
        back: c.back ?? "",
      }))
    : [{ front: "", back: "" }];

  function setCards(next: { front: string; back: string }[]) {
    onChange({ ...content, cards: next });
  }

  return (
    <div className="space-y-4">
      {cards.map((c, i) => (
        <div key={i} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--color-text)]">{t("card")} {i + 1}</p>
          <label className={labelClass()}>{t("front")}</label>
          <textarea
            className={fieldClass()}
            rows={2}
            value={c.front ?? ""}
            onChange={(e) => {
              const next = [...cards];
              next[i] = { ...next[i]!, front: e.target.value, back: next[i]?.back ?? "" };
              setCards(next);
            }}
          />
          <label className={labelClass()}>{t("back")}</label>
          <textarea
            className={fieldClass()}
            rows={2}
            value={c.back ?? ""}
            onChange={(e) => {
              const next = [...cards];
              next[i] = { front: next[i]?.front ?? "", back: e.target.value };
              setCards(next);
            }}
          />
          <button type="button" className="mt-2 text-xs text-red-600" onClick={() => setCards(cards.filter((_, j) => j !== i))}>
            {t("removeCard")}
          </button>
        </div>
      ))}
      <button type="button" className="text-sm text-[var(--color-primary)] hover:underline" onClick={() => setCards([...cards, { front: "", back: "" }])}>
        + {t("addCard")}
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

function QuizFields({
  content,
  onChange,
  t,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  t: (k: string) => string;
}) {
  const questions = Array.isArray(content.questions)
    ? (content.questions as Record<string, unknown>[])
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

  function setQuestions(next: Record<string, unknown>[]) {
    onChange({ ...content, questions: next });
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
      {questions.map((q, qi) => {
        const choices = Array.isArray(q.choices) ? (q.choices as { id: string; label: string }[]) : [];
        return (
          <div key={String(q.id ?? qi)} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
            <label className={labelClass()}>{t("question")} {qi + 1}</label>
            <input
              className={fieldClass()}
              value={typeof q.question === "string" ? q.question : ""}
              onChange={(e) => {
                const next = [...questions];
                next[qi] = { ...next[qi]!, question: e.target.value };
                setQuestions(next);
              }}
            />
            <p className="mt-2 text-xs font-medium text-[var(--color-text)]">{t("choices")}</p>
            {choices.map((ch, ci) => (
              <div key={ch.id} className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={q.correctChoiceId === ch.id}
                  onChange={() => {
                    const next = [...questions];
                    next[qi] = { ...next[qi]!, correctChoiceId: ch.id };
                    setQuestions(next);
                  }}
                  className="text-[var(--color-primary)]"
                />
                <input
                  className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
                  value={ch.label}
                  onChange={(e) => {
                    const next = [...questions];
                    const nch = [...choices];
                    nch[ci] = { ...nch[ci]!, label: e.target.value };
                    next[qi] = { ...next[qi]!, choices: nch };
                    setQuestions(next);
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="mt-2 text-xs text-red-600"
              onClick={() => setQuestions(questions.filter((_, j) => j !== qi))}
            >
              {t("removeQuestion")}
            </button>
          </div>
        );
      })}
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
