import type { ReactNode } from "react";
import { DocumentsSubnav } from "@/components/documents/documents-subnav";

export function DocumentsSubnavWrapper({
  spaceSlug,
  canWrite,
  children,
}: {
  spaceSlug: string | null;
  canWrite: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.75rem)] gap-0">
      <DocumentsSubnav spaceSlug={spaceSlug} canWrite={canWrite} />
      <div className="min-w-0 flex-1 p-4 md:p-6 lg:pl-4 lg:pr-8">{children}</div>
    </div>
  );
}
