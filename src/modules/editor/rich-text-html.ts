/** Legacy paragraphs → HTML for TipTap migration. */
export function paragraphsToHtml(paragraphs: { text?: string }[] | undefined): string {
  if (!paragraphs?.length) return "<p></p>";
  return paragraphs
    .map((p) => {
      const t = (p.text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const withBreaks = t.split("\n").join("<br>");
      return `<p>${withBreaks || "<br>"}</p>`;
    })
    .join("");
}

export function richTextContentToHtml(content: Record<string, unknown>): string {
  if (typeof content.html === "string" && content.html.trim()) {
    return content.html;
  }
  const paras = content.paragraphs as { text?: string }[] | undefined;
  return paragraphsToHtml(paras);
}

export function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}
