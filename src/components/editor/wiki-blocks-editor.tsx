"use client";

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
import type { WikiBlock, WikiCalloutVariant } from "@/lib/wiki/types";
import { newBlockId } from "@/lib/editor/id";

export function WikiBlocksEditor({
  blocks,
  onChange,
  readOnly,
}: {
  blocks: WikiBlock[];
  onChange: (blocks: WikiBlock[]) => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("editor");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(e: DragEndEvent) {
    if (readOnly) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(blocks, oldIndex, newIndex));
  }

  function addBlock(type: WikiBlock["type"]) {
    if (readOnly) return;
    const id = newBlockId("w");
    let block: WikiBlock;
    switch (type) {
      case "text":
        block = { id, type: "text", content: "" };
        break;
      case "callout":
        block = { id, type: "callout", variant: "info", title: "", body: "" };
        break;
      case "code":
        block = { id, type: "code", language: "text", code: "" };
        break;
      case "embed":
        block = { id, type: "embed", url: "", title: "" };
        break;
      default:
        block = { id, type: "text", content: "" };
    }
    onChange([...blocks, block]);
  }

  function removeBlock(id: string) {
    if (readOnly) return;
    onChange(blocks.filter((b) => b.id !== id));
  }

  function updateBlock(id: string, patch: Partial<WikiBlock>) {
    if (readOnly) return;
    onChange(
      blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as WikiBlock) : b))
    );
  }

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded border border-[var(--color-border)] px-2 py-1 text-xs" onClick={() => addBlock("text")}>
            + {t("wikiText")}
          </button>
          <button type="button" className="rounded border border-[var(--color-border)] px-2 py-1 text-xs" onClick={() => addBlock("callout")}>
            + {t("wikiCallout")}
          </button>
          <button type="button" className="rounded border border-[var(--color-border)] px-2 py-1 text-xs" onClick={() => addBlock("code")}>
            + {t("wikiCode")}
          </button>
          <button type="button" className="rounded border border-[var(--color-border)] px-2 py-1 text-xs" onClick={() => addBlock("embed")}>
            + {t("wikiEmbed")}
          </button>
        </div>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {blocks.map((b, i) => (
              <SortableWikiBlockRow
                key={b.id}
                block={b}
                index={i}
                readOnly={readOnly}
                onChange={updateBlock}
                onRemove={removeBlock}
                t={t}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && !readOnly ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t("wikiEmptyBlocks")}</p>
      ) : null}
    </div>
  );
}

function SortableWikiBlockRow({
  block,
  index,
  readOnly,
  onChange,
  onRemove,
  t,
}: {
  block: WikiBlock;
  index: number;
  readOnly?: boolean;
  onChange: (id: string, patch: Partial<WikiBlock>) => void;
  onRemove: (id: string) => void;
  t: (k: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id, disabled: readOnly });

  const fc = "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.88 : 1 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
        <div className="flex items-center gap-2">
          {!readOnly ? (
            <button
              type="button"
              className="cursor-grab touch-none rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"
              aria-label="Drag"
              {...attributes}
              {...listeners}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
              </svg>
            </button>
          ) : null}
          <span className="text-xs font-medium capitalize text-[var(--color-text-muted)]">
            {block.type} · {index + 1}
          </span>
        </div>
        {!readOnly ? (
          <button type="button" className="text-xs text-red-600" onClick={() => onRemove(block.id)}>
            {t("removeBlock")}
          </button>
        ) : null}
      </div>

      {block.type === "text" ? (
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">{t("wikiMarkdownBody")}</label>
          <textarea
            className={`${fc} min-h-[120px] font-mono text-xs`}
            value={block.content}
            onChange={(e) => onChange(block.id, { content: e.target.value })}
            readOnly={readOnly}
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("wikiLinkHint")}</p>
        </div>
      ) : null}

      {block.type === "callout" ? (
        <div className="space-y-2">
          <select
            className={fc}
            value={block.variant}
            onChange={(e) => onChange(block.id, { variant: e.target.value as WikiCalloutVariant })}
            disabled={readOnly}
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="tip">Tip</option>
          </select>
          <input
            className={fc}
            placeholder={t("calloutTitle")}
            value={block.title ?? ""}
            onChange={(e) => onChange(block.id, { title: e.target.value })}
            readOnly={readOnly}
          />
          <textarea
            className={fc}
            rows={3}
            placeholder={t("calloutBody")}
            value={block.body}
            onChange={(e) => onChange(block.id, { body: e.target.value })}
            readOnly={readOnly}
          />
        </div>
      ) : null}

      {block.type === "code" ? (
        <div className="space-y-2">
          <input
            className={fc}
            placeholder="Language"
            value={block.language}
            onChange={(e) => onChange(block.id, { language: e.target.value })}
            readOnly={readOnly}
          />
          <textarea
            className={`${fc} font-mono text-xs`}
            rows={6}
            value={block.code}
            onChange={(e) => onChange(block.id, { code: e.target.value })}
            readOnly={readOnly}
          />
        </div>
      ) : null}

      {block.type === "embed" ? (
        <div className="space-y-2">
          <input
            className={fc}
            placeholder="Title (optional)"
            value={block.title ?? ""}
            onChange={(e) => onChange(block.id, { title: e.target.value })}
            readOnly={readOnly}
          />
          <input
            className={fc}
            placeholder="https://…"
            value={block.url}
            onChange={(e) => onChange(block.id, { url: e.target.value })}
            readOnly={readOnly}
          />
        </div>
      ) : null}
    </div>
  );
}
