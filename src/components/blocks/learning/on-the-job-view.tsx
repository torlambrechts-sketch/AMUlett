import type { OnTheJobContent } from "@/lib/learning/types";

export function OnTheJobView({ content }: { content: OnTheJobContent }) {
  const actions = content.actions?.length ? content.actions : [];
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-primary)] bg-[var(--color-primary-muted)]/40 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
        On-the-job
      </p>
      <ul className="space-y-3">
        {actions.map((a, i) => (
          <li key={i}>
            <p className="text-sm font-medium text-[var(--color-text)]">{a.title}</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{a.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
