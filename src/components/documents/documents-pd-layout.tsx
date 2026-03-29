import type { ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { getOrCreateDefaultWikiSpace } from "@/lib/wiki/get-default-space";
import { userCanWikiWrite } from "@/lib/wiki/server-access";
import { DocumentsSubnavWrapper } from "@/components/documents/documents-subnav-wrapper";

/** Secondary sidebar + content column (same pattern as e-learning). */
export async function DocumentsPdLayout({ children }: { children: ReactNode }) {
  const org = await getUserOrgContext();
  if (!org) {
    return <>{children}</>;
  }

  const supabase = await createSupabaseServerClient();
  let spaceSlug: string | null = null;
  if (supabase) {
    const { spaceId } = await getOrCreateDefaultWikiSpace(supabase, org.organizationId);
    if (spaceId) {
      const { data } = await supabase.from("wiki_spaces").select("slug").eq("id", spaceId).maybeSingle();
      spaceSlug = data?.slug ?? null;
    }
  }

  const canWrite = await userCanWikiWrite(org.organizationId);

  return (
    <DocumentsSubnavWrapper spaceSlug={spaceSlug} canWrite={canWrite}>
      {children}
    </DocumentsSubnavWrapper>
  );
}
