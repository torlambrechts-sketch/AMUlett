import type { SupabaseClient } from "@supabase/supabase-js";

/** Returns default wiki space id for org; creates it only if missing and caller has wiki.write/org.admin. */
export async function getOrCreateDefaultWikiSpace(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ spaceId: string | null; error: string | null }> {
  const { data: existing } = await supabase
    .from("wiki_spaces")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", "main")
    .maybeSingle();

  if (existing?.id) {
    return { spaceId: existing.id, error: null };
  }

  const { data: spaceId, error } = await supabase.rpc("ensure_wiki_default_space", {
    p_organization_id: organizationId,
  });

  if (error) {
    return { spaceId: null, error: error.message };
  }

  return { spaceId: spaceId as string, error: null };
}
