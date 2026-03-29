import { lineDiff } from "@/lib/wiki/diff";

export function WikiDiffView({ left, right, leftLabel, rightLabel }: { left: string; right: string; leftLabel: string; rightLabel: string }) {
  const lines = lineDiff(left, right);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">{leftLabel}</p>
        <pre className="max-h-[480px] overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 font-mono text-xs">
          {lines.map((l, i) =>
            l.type === "remove" || l.type === "same" ? (
              <span key={i} className={l.type === "remove" ? "block bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200" : "block"}>
                {l.text || " "}
              </span>
            ) : null
          )}
        </pre>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">{rightLabel}</p>
        <pre className="max-h-[480px] overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 font-mono text-xs">
          {lines.map((l, i) =>
            l.type === "add" || l.type === "same" ? (
              <span key={i} className={l.type === "add" ? "block bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200" : "block"}>
                {l.text || " "}
              </span>
            ) : null
          )}
        </pre>
      </div>
    </div>
  );
}
