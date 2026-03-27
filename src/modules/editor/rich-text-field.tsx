"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";

const btn = "rounded px-2 py-1 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] data-[active=true]:bg-[var(--color-primary)] data-[active=true]:text-[var(--color-primary-fg)]";

export function RichTextField({
  value,
  onChange,
  placeholder,
  className,
  resetKey = 0,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  /** Increment to reload content from props (e.g. after JSON edit). */
  resetKey?: number;
}) {
  const lastResetKey = useRef(resetKey);
  const initial = value?.trim() ? value : "<p></p>";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "text-[var(--color-primary)] underline" },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
        emptyEditorClass: "tiptap-empty:before:text-[var(--color-text-muted)]",
      }),
    ],
    content: initial,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[120px] px-2 py-2 text-[var(--color-text)] focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (resetKey !== lastResetKey.current) {
      lastResetKey.current = resetKey;
      const html = value?.trim() ? value : "<p></p>";
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [editor, resetKey, value]);

  if (!editor) {
    return (
      <div
        className={`min-h-[120px] animate-pulse rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] ${className ?? ""}`}
      />
    );
  }

  const ed = editor;

  function setLink() {
    const prev = ed.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      ed.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    ed.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className={`rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] ${className ?? ""}`}>
      <div className="flex flex-wrap gap-0.5 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1">
        <button type="button" className={btn} data-active={ed.isActive("bold")} onClick={() => ed.chain().focus().toggleBold().run()}>
          Bold
        </button>
        <button type="button" className={btn} data-active={ed.isActive("italic")} onClick={() => ed.chain().focus().toggleItalic().run()}>
          Italic
        </button>
        <button type="button" className={btn} data-active={ed.isActive("underline")} onClick={() => ed.chain().focus().toggleUnderline().run()}>
          Underline
        </button>
        <span className="mx-0.5 w-px self-stretch bg-[var(--color-border)]" aria-hidden />
        <button type="button" className={btn} data-active={ed.isActive("heading", { level: 2 })} onClick={() => ed.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </button>
        <button type="button" className={btn} data-active={ed.isActive("heading", { level: 3 })} onClick={() => ed.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </button>
        <span className="mx-0.5 w-px self-stretch bg-[var(--color-border)]" aria-hidden />
        <button type="button" className={btn} data-active={ed.isActive("bulletList")} onClick={() => ed.chain().focus().toggleBulletList().run()}>
          List
        </button>
        <button type="button" className={btn} data-active={ed.isActive("orderedList")} onClick={() => ed.chain().focus().toggleOrderedList().run()}>
          1.
        </button>
        <button type="button" className={btn} data-active={ed.isActive("link")} onClick={setLink}>
          Link
        </button>
      </div>
      <EditorContent editor={ed} />
    </div>
  );
}
