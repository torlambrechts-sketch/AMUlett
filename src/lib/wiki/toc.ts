export type TocEntry = { level: number; text: string; id: string };

function slugifyHeading(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return base || `section-${index}`;
}

export function extractTocFromMarkdown(md: string): TocEntry[] {
  const lines = md.split("\n");
  const toc: TocEntry[] = [];
  let i = 0;
  for (const line of lines) {
    const m = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (m) {
      const level = m[1]!.length;
      const text = m[2]!.trim();
      const id = slugifyHeading(text, i++);
      toc.push({ level, text, id });
    }
  }
  return toc;
}

export function extractTocFromBlocks(textContent: string): TocEntry[] {
  return extractTocFromMarkdown(textContent);
}

/** Headings from sanitized HTML (h2, h3). */
export function extractTocFromHtml(html: string): TocEntry[] {
  const toc: TocEntry[] = [];
  let i = 0;
  const re = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const level = parseInt(m[1]!, 10);
    const text = m[2]!.replace(/<[^>]+>/g, "").trim();
    if (text) {
      toc.push({ level, text, id: slugifyHeading(text, i++) });
    }
  }
  return toc;
}
