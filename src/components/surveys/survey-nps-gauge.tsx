"use client";

/** eNPS from -100 to +100 */
export function SurveyNpsGauge({ score, label }: { score: number | null; label: string }) {
  // Semi-circle gauge: needle angle from -100..+100 mapped to arc
  if (score === null || Number.isNaN(score)) {
    return (
      <div className="flex h-36 flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        <p className="mt-2 text-2xl font-semibold">—</p>
      </div>
    );
  }

  const clamped = Math.max(-100, Math.min(100, score));
  const pct = (clamped + 100) / 200;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-center text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <div className="relative mx-auto mt-3 h-28 w-56">
        <svg viewBox="0 0 200 100" className="h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="npsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(220 38 38)" />
              <stop offset="50%" stopColor="rgb(234 179 8)" />
              <stop offset="100%" stopColor="rgb(22 163 74)" />
            </linearGradient>
          </defs>
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="url(#npsGrad)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <line
            x1="100"
            y1="90"
            x2={100 + 70 * Math.cos(Math.PI * (1 - pct))}
            y2={90 - 70 * Math.sin(Math.PI * (1 - pct))}
            stroke="currentColor"
            strokeWidth="3"
            className="text-[var(--color-text)]"
          />
          <circle cx="100" cy="90" r="6" className="fill-[var(--color-text)]" />
        </svg>
      </div>
      <p className="text-center text-3xl font-bold tabular-nums">{score > 0 ? `+${score}` : score}</p>
    </div>
  );
}
