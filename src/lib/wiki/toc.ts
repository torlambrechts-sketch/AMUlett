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
