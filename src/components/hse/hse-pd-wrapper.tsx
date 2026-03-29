import type { ReactNode } from "react";
import { HseSubnavSidebar } from "@/components/hse/hse-subnav-sidebar";

export function HsePdWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-3.75rem)] gap-0">
      <HseSubnavSidebar />
      <div className="min-w-0 flex-1 p-4 md:p-6 lg:pl-4 lg:pr-8">{children}</div>
    </div>
  );
}
