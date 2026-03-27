import type { ExecutiveSummaryContent } from "@/lib/learning/types";

export function ExecutiveSummaryView({ content }: { content: ExecutiveSummaryContent }) {
  const points = content.points?.length ? content.points : [];
  return (
    <ul className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      {points.map((p, i) => (
        <li key={i} className="flex gap-2 text-sm text-[var(--color-text)]">
          <span className="text-[var(--color-primary)]">•</span>
          <span>{p.text}</span>
        </li>
      ))}
    </ul>
  );
}
