import type { RichTextContent } from "@/lib/learning/types";

export function RichTextView({ content }: { content: RichTextContent }) {
  const paragraphs = content.paragraphs?.length ? content.paragraphs : [{ text: "" }];
  return (
    <div className="prose prose-sm max-w-none text-[var(--color-text)]">
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-3 whitespace-pre-wrap text-sm leading-relaxed last:mb-0">
          {p.text}
        </p>
      ))}
    </div>
  );
}
