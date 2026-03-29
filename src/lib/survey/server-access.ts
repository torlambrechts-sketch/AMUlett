import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function userCanSurveyAdmin(organizationId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { data: a } = await supabase.rpc("has_capability", { p_org: organizationId, p_code: "org.admin" });
  const { data: s } = await supabase.rpc("has_capability", { p_org: organizationId, p_code: "surveys.admin" });
  return Boolean(a || s);
}

export async function userManagesAnyDepartment(organizationId: string, userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { data: rows } = await supabase.from("department_managers").select("department_id").eq("user_id", userId);
  if (!rows?.length) return false;
  const { data: deps } = await supabase.from("departments").select("id").eq("organization_id", organizationId);
  const allowed = new Set((deps ?? []).map((d) => d.id as string));
  return rows.some((r) => allowed.has(r.department_id as string));
}
