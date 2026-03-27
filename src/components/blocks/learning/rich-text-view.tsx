import DOMPurify from "isomorphic-dompurify";
import type { RichTextContent } from "@/lib/learning/types";
import { paragraphsToHtml } from "@/lib/editor/rich-text-html";

export function RichTextView({ content }: { content: RichTextContent & { html?: string } }) {
  const html =
    typeof content.html === "string" && content.html.trim()
      ? content.html
      : paragraphsToHtml(content.paragraphs);

  const safe = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
      "code",
      "pre",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });

  return (
    <div
      className="prose prose-sm max-w-none text-[var(--color-text)] [&_a]:text-[var(--color-primary)] [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: safe || "<p></p>" }}
    />
  );
}
