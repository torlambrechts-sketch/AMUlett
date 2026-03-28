import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function userCanWriteHse(organizationId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { data: w } = await supabase.rpc("has_capability", { p_org: organizationId, p_code: "hse.write" });
  const { data: a } = await supabase.rpc("has_capability", { p_org: organizationId, p_code: "org.admin" });
  return Boolean(w || a);
}

export async function userIsVo(organizationId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: role } = await supabase.from("roles").select("id").eq("code", "safety_rep").maybeSingle();
  if (!role) return false;
  const { data: m } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("role_id", role.id)
    .maybeSingle();
  return Boolean(m);
}
