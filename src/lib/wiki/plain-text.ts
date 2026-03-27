import type { WikiEditorDocument } from "@/lib/wiki/types";
import { stripHtmlToPlain } from "@/lib/editor/rich-text-html";

function stripWikiLinks(s: string): string {
  return s.replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/@([a-z0-9-]+)/gi, "$1");
}

export function wikiDocumentToPlainText(doc: WikiEditorDocument): string {
  if (doc.format === "markdown") {
    return stripWikiLinks(doc.markdown ?? "").trim();
  }
  const parts: string[] = [];
  for (const b of doc.blocks) {
    if (b.type === "text") {
      const tb = b as { html?: string; content?: string };
      if (tb.html?.trim()) parts.push(stripHtmlToPlain(tb.html));
      else parts.push(stripWikiLinks(tb.content ?? ""));
    }
    if (b.type === "callout") {
      if (b.title) parts.push(b.title);
      parts.push(b.body ?? "");
    }
    if (b.type === "code") parts.push(b.code ?? "");
    if (b.type === "embed") parts.push(b.title ?? "", b.url ?? "");
  }
  return parts.join("\n\n").trim();
}
