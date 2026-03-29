/** 5×5 matrix: score = P × C. Bands: low ≤6, medium 7–12, high ≥13 */

export type RiskBand = "low" | "medium" | "high";

export function computeRiskScore(probability: number, consequence: number): number {
  return probability * consequence;
}

export function riskBandFromScore(score: number): RiskBand {
  if (score <= 6) return "low";
  if (score <= 12) return "medium";
  return "high";
}

export function riskBandLabel(band: RiskBand | null | undefined, t: (key: string) => string): string {
  if (!band) return "—";
  return t(`riskBand.${band}`);
}

export function riskBandBadgeClass(band: RiskBand | null | undefined): string {
  switch (band) {
    case "low":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200";
    case "medium":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100";
    case "high":
      return "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200";
    default:
      return "bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]";
  }
}
