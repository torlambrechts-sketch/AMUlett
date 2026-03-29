import type { ReactNode } from "react";

/** Beige workspace area inside learning routes (PandaDoc-style canvas). */
export function LearningPdMain({ children }: { children: ReactNode }) {
  return <div className="learning-pd-workspace min-h-0 flex-1">{children}</div>;
}

/** White elevated card on the workspace. */
export function LearningPdCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["learning-pd-card p-5 md:p-6", className ?? ""].filter(Boolean).join(" ")}>{children}</div>;
}
