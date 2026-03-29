import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function userCanWikiWrite(organizationId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { data: w } = await supabase.rpc("has_capability", {
    p_org: organizationId,
    p_code: "wiki.write",
  });
  const { data: a } = await supabase.rpc("has_capability", {
    p_org: organizationId,
    p_code: "org.admin",
  });
  return Boolean(w || a);
}

export async function userIsOrgAdmin(organizationId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { data: a } = await supabase.rpc("has_capability", {
    p_org: organizationId,
    p_code: "org.admin",
  });
  return Boolean(a);
}
