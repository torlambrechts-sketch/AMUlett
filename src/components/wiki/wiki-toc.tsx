import type { TocEntry } from "@/lib/wiki/toc";

export function WikiToc({ entries }: { entries: TocEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <nav className="sticky top-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm" aria-label="On this page">
      <p className="mb-2 font-semibold text-[var(--color-text)]">On this page</p>
      <ul className="space-y-1 text-[var(--color-text-muted)]">
        {entries.map((e) => (
          <li key={e.id} style={{ paddingLeft: (e.level - 1) * 12 }}>
            <a href={`#${e.id}`} className="hover:text-[var(--color-primary)] hover:underline">
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
