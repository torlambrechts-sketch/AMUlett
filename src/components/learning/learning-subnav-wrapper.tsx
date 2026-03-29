import type { ReactNode } from "react";
import { LearningSubnav } from "@/components/learning/learning-subnav";

export function LearningSubnavWrapper({ canAuthor, children }: { canAuthor: boolean; children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-3.75rem)] gap-0">
      <LearningSubnav canAuthor={canAuthor} />
      <div className="min-w-0 flex-1 p-4 md:p-6 lg:pl-4 lg:pr-8">{children}</div>
    </div>
  );
}
