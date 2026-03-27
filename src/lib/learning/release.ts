export type ReleaseRule = {
  after_enroll_days?: number;
  available_at?: string;
};

export function isModuleReleased(rule: ReleaseRule | null | undefined, enrolledAt: Date, now: Date = new Date()): boolean {
  const r = rule && typeof rule === "object" ? rule : {};
  let ok = true;

  if (typeof r.after_enroll_days === "number" && r.after_enroll_days > 0) {
    const unlock = new Date(enrolledAt);
    unlock.setDate(unlock.getDate() + r.after_enroll_days);
    if (now < unlock) ok = false;
  }

  if (r.available_at) {
    const fixed = new Date(r.available_at);
    if (!Number.isNaN(fixed.getTime()) && now < fixed) ok = false;
  }

  return ok;
}

export function releaseHint(rule: ReleaseRule | null | undefined, enrolledAt: Date): string | null {
  const r = rule && typeof rule === "object" ? rule : {};
  const parts: string[] = [];

  if (typeof r.after_enroll_days === "number" && r.after_enroll_days > 0) {
    const unlock = new Date(enrolledAt);
    unlock.setDate(unlock.getDate() + r.after_enroll_days);
    parts.push(`Available after ${unlock.toLocaleDateString()} (${r.after_enroll_days} days from enrollment)`);
  }
  if (r.available_at) {
    const fixed = new Date(r.available_at);
    if (!Number.isNaN(fixed.getTime())) {
      parts.push(`Available from ${fixed.toLocaleString()}`);
    }
  }
  return parts.length ? parts.join(" · ") : null;
}
